export function formatDate(dateString: string) {
  const date = new Date(dateString);
  const locale =
    typeof navigator === "undefined" ? undefined : navigator.language;
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function withFormattedDate<
  T extends { created_at?: string; updated_at?: string },
>(item: T) {
  const createdAt = item.created_at || new Date().toISOString();
  return {
    ...item,
    created_at: createdAt,
    updated_at: item.updated_at || createdAt,
    date: formatDate(createdAt),
  };
}
