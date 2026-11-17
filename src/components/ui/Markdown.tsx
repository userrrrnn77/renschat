import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlockView } from "../blocks/CodeBlockView";
import { cn } from "../../lib/cn";
import { useTranslation } from "react-i18next";

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("prose-chat", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");
            if (isInline)
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            return (
              <CodeBlockView
                block={{
                  type: "code",
                  language: match?.[1] || "text",
                  content: String(children).replace(/\n$/, ""),
                }}
              />
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          img({ src, alt }) {
            return (
              <a href={src as string} target="_blank" rel="noopener noreferrer">
                {alt || t("media.image")}
              </a>
            );
          },
        }}>
        {children.trimStart()}
      </ReactMarkdown>
    </div>
  );
}
