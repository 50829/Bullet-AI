export function sortByCreatedAtDesc<T extends { created_at?: string }>(
  items: T[],
) {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime(),
  );
}
