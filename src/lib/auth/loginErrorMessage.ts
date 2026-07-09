export function getLoginErrorMessage(error?: string | null) {
  const trimmed = error?.trim();
  return trimmed ? `登录失败：${trimmed}` : null;
}
