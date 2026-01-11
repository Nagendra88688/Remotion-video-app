import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Clip } from "../remotion/types/timeline";

interface SortableClipProps {
  clip: Clip;
  fps: number;
  isSelected: boolean;
  onSelect: () => void;
  pixelsPerSecond?: number;
}

export const SortableClip = ({ clip, fps, isSelected, onSelect, pixelsPerSecond = 60 }: SortableClipProps) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({ id: clip.id });

  // Calculate width and position based on duration and startFrame
  const durationInSeconds = clip.durationInFrames / fps;
  const startSeconds = (clip.startFrame || 0) / fps;
  const width = Math.max(durationInSeconds * pixelsPerSecond, 60); // Minimum 60px
  const left = startSeconds * pixelsPerSecond;

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${left}px`,
    top: 8,
    transform: CSS.Transform.toString(transform),
    transition,
    padding: 8,
    background: isSelected ? "#e8f2ff" : "#ffffff",
    border: isSelected ? "2px solid #4a9eff" : "1px solid #d0d0d0",
    color: isSelected ? "#1a1a1a" : "#666",
    width: `${width}px`,
    minWidth: 60,
    textAlign: "center",
    cursor: "grab",
    height: "40px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: isSelected ? 500 : 400,
    boxShadow: isSelected ? "0 2px 4px rgba(74, 158, 255, 0.2)" : "0 1px 2px rgba(0,0,0,0.1)",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      {clip.type === "audio" ? `🎵 ${clip.name?.slice(0,20)}` : clip.name?.slice(0,10)}
    </div>
  );
};
