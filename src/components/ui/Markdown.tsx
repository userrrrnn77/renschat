// src/components/ui/Markdown.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlockView } from "../blocks/CodeBlockView";
import { cn } from "../../lib/cn";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { sanitizeAssistantText } from "../../lib/sanitizeAssistantText";

type Align = "left" | "center" | "right" | null | undefined;

function alignStyle(align: Align): { textAlign?: "left" | "center" | "right" } {
  return align === "left" || align === "center" || align === "right"
    ? { textAlign: align }
    : {};
}

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const source = useMemo(() => sanitizeAssistantText(children), [children]);

  if (!source) return null;

  return (
    <div className={cn("prose-chat", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const raw = String(children);
            const isInline = !match && !raw.includes("\n");
            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <CodeBlockView
                block={{
                  type: "code",
                  language: match?.[1] || "text",
                  content: raw.replace(/\n$/, ""),
                }}
              />
            );
          },
          pre({ children }: any) {
            return <>{children}</>;
          },
          a({ href, children }: any) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          img({ src, alt }: any) {
            return (
              <a href={src as string} target="_blank" rel="noopener noreferrer">
                {alt || t("media.image")}
              </a>
            );
          },
          table({ children }: any) {
            return (
              <div className="md-table-wrap">
                <table>{children}</table>
              </div>
            );
          },
          th({ children, align, style }: any) {
            return (
              <th style={{ ...alignStyle(align as Align), ...(style ?? {}) }}>
                {children}
              </th>
            );
          },
          td({ children, align, style }: any) {
            return (
              <td style={{ ...alignStyle(align as Align), ...(style ?? {}) }}>
                {children}
              </td>
            );
          },
        }}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
