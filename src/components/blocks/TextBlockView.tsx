import { Markdown } from "../ui/Markdown";
import type { TextBlock } from "../../types";

export function TextBlockView({ block }: { block: TextBlock }) {
  return <Markdown>{block.markdown}</Markdown>;
}
