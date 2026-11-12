import { useAuthedBlobUrl } from "../../hooks/useAuthedBlobUrl";
import { useUIStore } from "../../store/uiStore";
import { Skeleton } from "../ui/Skeleton";
import type { ImageBlock } from "../../types";

export function ImageBlockView({ block }: { block: ImageBlock }) {
  const { url, loading } = useAuthedBlobUrl(block.fileId);
  const setLightbox = useUIStore((s) => s.setLightbox);

  if (loading) return <Skeleton className="w-full h-64 rounded-xl my-4" />;
  if (!url)
    return <div className="text-sm text-danger my-4">Gagal memuat gambar</div>;

  return (
    <div className="my-4">
      <img
        src={url}
        alt={block.alt || "Gambar"}
        onClick={() => setLightbox(url)}
        className="max-h-105 rounded-xl object-contain cursor-pointer border border-line"
      />
    </div>
  );
}
