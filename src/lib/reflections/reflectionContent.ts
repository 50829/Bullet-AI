export type ReflectionContentInput = {
  content: string;
  title?: string | null;
  body?: string | null;
};

export function parseReflectionContent(reflection: ReflectionContentInput) {
  if (reflection.title || reflection.body) {
    return {
      title: reflection.title ?? "",
      body: reflection.body ?? reflection.content,
    };
  }

  const parts = reflection.content.split("\n\n");
  const candidateTitle = parts[0].trim();
  const hasTitle = parts.length > 1 && candidateTitle.length > 0 && candidateTitle.length <= 100;

  return {
    title: hasTitle ? candidateTitle : "",
    body: hasTitle ? parts.slice(1).join("\n\n") : reflection.content,
  };
}
