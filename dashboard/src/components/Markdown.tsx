import { marked } from "marked";
import { useMemo } from "react";

marked.setOptions({ breaks: true });

export default function Markdown({ content }: { content: string }) {
  const html = useMemo(() => marked.parse(content) as string, [content]);
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
