// src/editor/TrackLane.tsx
import { useDroppable } from "@dnd-kit/core";
import type { Track } from "../remotion/types/timeline";
import { SortableClip } from "./SortableClip";

interface Props {
  track: Track;
  fps: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string | null) => void;
}

export const TrackLane = ({ track, fps, selectedClipId, onClipSelect }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: track.id,
  });

  // Calculate total timeline width based on the last clip's end time
  const pixelsPerSecond = 60;
  const getClipEndTime = (clip: typeof track.clips[0]) => {
    const startSeconds = (clip.startFrame || 0) / fps;
    const durationSeconds = clip.durationInFrames / fps;
    return startSeconds + durationSeconds;
  };

  const maxEndTime = track.clips.length > 0
    ? Math.max(...track.clips.map(getClipEndTime))
    : 0;
  
  const timelineWidth = Math.max(maxEndTime * pixelsPerSecond, 200); // Minimum 200px width

  return (
    <div
      style={{
        padding: 8,
        background: isOver ? "#333" : "#1e1e1e",
        marginBottom: 6,
        position: "relative",
        minHeight: 60,
        overflow: "visible",
      }}
    >
      <div 
        ref={setNodeRef}
        style={{ 
          position: "relative", 
          width: `${timelineWidth}px`, 
          minHeight: 44,
          height: "100%" 
        }}
      >
        {track.clips.map((clip) => (
          <SortableClip 
            key={clip.id} 
            clip={clip} 
            fps={fps}
            isSelected={selectedClipId === clip.id}
            onSelect={() => onClipSelect(clip.id)}
          />
        ))}
      </div>
    </div>
  );
};
