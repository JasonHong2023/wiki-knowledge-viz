import { marked } from "marked";
import { useMemo } from "react";

marked.use({ breaks: true });

export default function Markdown({ content }: { content: string }) {
  const html = useMemo(() => marked.parse(content) as string, [content]);
  return (
    <div
      className="wiki-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
