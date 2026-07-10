# 数据一致性审计记录

> 文档类型：历史审计快照  
> 记录日期：2026-07-10  
> 基于提交：`8567176`  
> 当前状态：已归档，正文不再随代码更新  
> 当前契约：[架构文档](../ARCHITECTURE.md)及数据库迁移
>
> 本文只描述记录日期时的审计结论，不代表当前实现状态。部分问题已在后续提交中处理；请通过当前代码、测试和提交历史确认最终处置情况。

本文记录当时代码审计发现的潜在一致性问题。它们是从当时的并发模型推导出的失败路径，不代表已经观察到生产数据丢失。当时的工作区包含部分未完成修复，在全量应用测试和本地数据库契约测试通过前，不应视为可发布状态。

## 风险清单

### R1. Change-log 序号可能越过未提交事务

`workspace_change_log.sequence` 使用 identity。identity 的分配顺序不是事务提交顺序：低序号事务可以晚于高序号事务提交。客户端若先看到高序号并推进游标，之后提交的低序号变更将无法再通过 `sequence > cursor` 读到。

影响：增量同步可能永久漏掉 upsert 或 delete。

当前状态：`006` 中已草拟按用户获取 transaction advisory lock 的修复，尚待真实数据库并发契约验证。

### R2. 旧远端响应可能覆盖新状态并推进游标

原实现使用客户端 `syncedAt` 与 `readStartedAt` 判断远端响应的新旧。这两个时间只表示浏览器请求和落盘时刻，不能表示服务器事务的因果顺序。慢的历史请求或 mutation 响应可能晚于新 delta 落盘，使新 delta 被跳过，但集合游标仍然前进。

影响：本地快照可能永久停留在旧版本，或者保留云端已经删除的幽灵记录。

当前状态：已草拟禁止历史分页写入 durable snapshot、按 cursor 原子提交和拒绝旧 cursor 页的修复，尚待整合验证。

### R3. 同一 `clientId` 删除后重建会重置版本

冲突恢复允许把云端已删除的实体用原 `clientId` 重建。数据库新行从 version 1 开始，而另一设备可能仍有旧 incarnation 的 version 5 快照。若客户端只按 version 大小判断，新 v1 会被旧 v5 永久压住，同时 change-log cursor 已经越过重建事件。

影响：重建记录在部分设备上永久不可见。

当前状态：已草拟按 change page 的最后 operation 应用，并把 delete → upsert 标记为 incarnation reset；尚待跨页、跨标签页测试。

### R4. Logout generation 只在单个 Store 进程内有效

`clearedUsers` 和 `sessionToken` 原本属于单个 `DataV2Database` 实例。标签页 A 注销并清空共享 IndexedDB 后，标签页 B 的旧请求仍可能使用自己的有效 token 写回数据。

快速重新登录还有额外竞态：新会话写入可能发生在旧 cleanup 事务完成前，并被旧 cleanup 一并删除。

影响：注销后数据重新出现，或快速重登产生的新数据被清理。

当前状态：跨标签页 logout epoch、清理协调和快速重登保护尚未完成。

### R5. 图片冲突无法仅通过 `imagePath` 表达本地意图

待上传图片以 IndexedDB Blob 保存，上传前 optimistic `imagePath` 可能是 `null`。云端无图片时 `imagePath` 也为 `null`，因此字段值看起来相同，但本地实际还持有一个待上传 Blob。合并时选择云端 `null` 若没有同时删除 Blob，后续仍会上传本地图片。

影响：冲突处理结果与用户选择相反。

当前状态：Blob 元数据和字段来源模型已有未完成改动，需重新审查后补行为测试。

### R6. 冲突恢复可能基于过期的远端快照

冲突记录保存的是冲突发生时的远端实体。用户处理冲突前，远端可能再次更新、删除，或者用同一 `clientId` 重建。仅比较旧 conflict 和本地 snapshot 不能可靠表示最新远端状态，尤其无法区分“更新后的删除”和“低版本的新 incarnation”。

影响：恢复动作再次冲突，或者按错误的云端版本重试。

当前状态：处理前重新读取当前远端状态的改动尚未完成。

### R7. 可变排序字段作为 keyset cursor 可能漏项

Moments 使用可修改的 `occurredOn`，Reflections 使用更新时会变化的 `updatedAt` 排序。分页期间，尚未加载的记录若移动到当前 cursor 之前，后续页面不会再返回它。

影响：当前分页会话静默漏掉记录；重新刷新后才可能出现。

当前状态：基础 keyset 分页已存在，但分页会话 watermark 检测尚未完成。

### R8. 注销未完整清理所有 Query Cache

完整历史使用独立的 `workspace-history` 和 `workspace-history-overlay` query key。只清理 `data-v2` key 会让旧用户历史在内存中继续保留，同一用户重新登录时可能短暂显示旧缓存。

影响：注销隔离不完整，重新登录可能展示陈旧数据。

当前状态：三类 query key 的统一清理已有草拟实现，尚待集成测试。

### R9. 安全修复和迁移链可能没有覆盖已部署数据库

只修改 `000` 或 `005` 不能修复已经执行过这些迁移的项目。权限收敛必须出现在新的前向迁移中。

影响：旧部署可能保留匿名 RPC/trigger function 权限，或者升级路径在发布时才失败。

当前状态：权限修复已移动到 `006`。生产已经完成 `005`，旧升级 fixture 已退役；本地测试验证当前 fresh schema 和前向迁移契约。

## 最小安全修复范围

最小修复目标不是引入完整 event sourcing、实时订阅或新的同步服务，而是封住会造成永久遗漏和错误恢复的路径。

1. 在 change-log trigger 写入前按用户获取事务级 advisory lock，确保同一用户可见的 sequence 不会越过未提交事务；补并发数据库测试。
2. baseline 和 delta 都把快照变更与 cursor 放在同一个 IndexedDB 事务中；`incomingCursor <= storedCursor` 时整页 no-op，不能只保留较大 cursor 后继续应用旧内容。
3. 按每个 `clientId` 在当前 change page 中的最后 operation 应用事件；delete → upsert 明确重置 incarnation。baseline 建立新 cursor 时视为权威远端快照，不让旧 incarnation 的高 version 阻止重建。
4. 完整历史分页只保存在 TanStack Query 内存缓存中，不再写入近期 durable snapshot。近期缓存只由 baseline/delta 管理。
5. 用 localStorage logout epoch 加 BroadcastChannel 通知建立跨标签页屏障；新 generation 必须等待旧 cleanup 完成，避免快速重登数据被旧清理删除。
6. 暂时把冲突操作收敛为语义明确的“接受云端”和“重试本地变更”；字段合并只有在类型校验和 Blob 来源处理完整后才开放。接受云端必须清除 mutation Blob，重试本地必须保留它。
7. 每次冲突恢复前重新读取当前远端实体。远端删除后的 recovery create 若发现同 ID 已重新出现，只能在业务 payload 完全一致时视为幂等完成，否则重新进入冲突。
8. 每个分页会话固定 change-log watermark，并在每页读取前后核对；watermark 变化时中止“加载更多”并要求刷新，避免可变排序字段造成静默漏项。
9. 注销时同时取消并删除 `data-v2`、`workspace-history`、`workspace-history-overlay` 三类缓存；异步 diagnostics 结果写入前核对当前 user generation。
10. 最后运行受控的本地 Supabase 验证：脚本拒绝复用已运行的栈、禁用 telemetry，并用 trap 停止自己启动的栈。禁止使用 `supabase link` 或任何线上 project ref。

## 完成标准

- 针对 R1-R9 的回归测试通过。
- `pnpm migration:check`、typecheck、lint、format、全量 Vitest 和 production build 通过。
- 本地 pgTAP 通过，测试结束后没有 Supabase Docker 容器残留。
- 文档与实际启用的同步、分页和冲突能力一致。
