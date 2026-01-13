import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Track } from "../remotion/types/timeline";
import { TrackLane } from "./TrackLane";

interface SortableTrackProps {
  track: Track;
  fps: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string | null) => void;
  onAddClip?: (trackId: string, type?: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onDeleteClip?: (clipId: string) => void;
  pixelsPerSecond?: number;
}

export const SortableTrack = ({
  track,
  fps,
  selectedClipId,
  onClipSelect,
  onAddClip,
  onDeleteTrack,
  onDeleteClip,
  pixelsPerSecond,
}: SortableTrackProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TrackLane
        track={track}
        fps={fps}
        selectedClipId={selectedClipId}
        onClipSelect={onClipSelect}
        onAddClip={onAddClip}
        onDeleteTrack={onDeleteTrack}
        onDeleteClip={onDeleteClip}
        pixelsPerSecond={pixelsPerSecond}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};
