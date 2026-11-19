import type { Block } from "../../types";
import { TextBlockView } from "./TextBlockView";
import { CodeBlockView } from "./CodeBlockView";
import { TableBlockView } from "./TableBlockView";
import { ChartBlockView } from "./ChartBlockView";
import { CardBlockView } from "./CardBlockView";
import { ChoicesBlockView } from "./ChoicesBlockView";
import { FileBlockView } from "./FileBlockView";
import { ImageBlockView } from "./ImageBlockView";
import { VideoBlockView } from "./VideoBlockView";
import { useTranslation } from "react-i18next";

export function BlockRenderer({
  block,
  sessionId,
  isLast,
  isStreaming,
}: {
  block: Block;
  sessionId: string;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const { t } = useTranslation();

  switch (block.type) {
    case "text":
      return <TextBlockView block={block} isStreaming={isStreaming} />;
    case "code":
      return <CodeBlockView block={block} isStreaming={isStreaming} />;
    case "table":
      return <TableBlockView block={block} />;
    case "chart":
      return <ChartBlockView block={block} />;
    case "card":
      return <CardBlockView block={block} sessionId={sessionId} />;
    case "choices":
      return (
        <ChoicesBlockView block={block} sessionId={sessionId} isLast={isLast} />
      );
    case "file":
      return <FileBlockView block={block} />;
    case "image":
      return <ImageBlockView block={block} />;
    case "video":
      return <VideoBlockView block={block} />;
    default:
      return (
        <div className="text-sm text-muted italic">
          {t("blocks.unsupportedContent", { type: (block as any).type })}
        </div>
      );
  }
}
