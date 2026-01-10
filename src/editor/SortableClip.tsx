import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Clip } from "../remotion/types/timeline";

interface SortableClipProps {
  clip: Clip;
  fps: number;
  isSelected: boolean;
  onSelect: () => void;
}

export const SortableClip = ({ clip, fps, isSelected, onSelect }: SortableClipProps) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({ id: clip.id });

  // Calculate width and position based on duration and startFrame
  const pixelsPerSecond = 60; // 60 pixels = 1 second
  const durationInSeconds = clip.durationInFrames / fps;
  const startSeconds = (clip.startFrame || 0) / fps;
  const width = Math.max(durationInSeconds * pixelsPerSecond, 60); // Minimum 60px
  const left = startSeconds * pixelsPerSecond;

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${left}px`,
    top: 0,
    transform: CSS.Transform.toString(transform),
    transition,
    padding: 12,
    background: isSelected ? "#555" : "#333",
    border: isSelected ? "2px solid #4a9eff" : "2px solid transparent",
    color: "white",
    width: `${width}px`,
    minWidth: 60,
    textAlign: "center",
    cursor: "grab",
    height: "44px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
