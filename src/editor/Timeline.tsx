import {
  DndContext,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Track } from "../remotion/types/timeline";
import { TrackLane } from "./TrackLane";

interface TimelineProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  fps: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string | null) => void;
}

export const Timeline = ({ tracks, setTracks, fps, selectedClipId, onClipSelect }: TimelineProps) => {
  const findTrackByClipId = (clipId: string) =>
    tracks.find((t) => t.clips.some((c) => c.id === clipId));

  // Recalculate startFrame for clips in a track based on their order
  const recalculateStartFrames = (clips: typeof tracks[0]["clips"]) => {
    return clips.map((clip, index) => {
      const startFrame = index === 0 
        ? 0 
        : clips.slice(0, index).reduce((sum, c) => sum + (c.durationInFrames || 0), 0);
      return { ...clip, startFrame };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceTrack = findTrackByClipId(activeId);
    if (!sourceTrack) return;

    const clip = sourceTrack.clips.find(c => c.id === activeId);
    if (!clip) return;

    // Check if dragging over a clip (not a track lane)
    const targetTrackByClip = findTrackByClipId(overId);
    
    if (targetTrackByClip) {
      // Check if dragging over a clip in the same track
      if (sourceTrack.id === targetTrackByClip.id) {
        // Same track → REORDER CLIPS
        const oldIndex = sourceTrack.clips.findIndex(c => c.id === activeId);
        const newIndex = sourceTrack.clips.findIndex(c => c.id === overId);
        
        if (oldIndex === newIndex) return;

        setTracks((prev) => {
          return prev.map(t => {
            if (t.id === sourceTrack.id) {
              const reorderedClips = arrayMove(t.clips, oldIndex, newIndex);
              const clipsWithStartFrames = recalculateStartFrames(reorderedClips);
              return { ...t, clips: clipsWithStartFrames };
            }
            return t;
          });
        });
      } else {
        // Different track → CREATE NEW TRACK ABOVE TARGET TRACK
        const targetTrackIndex = tracks.findIndex((t) => t.id === targetTrackByClip.id);
        if (targetTrackIndex === -1) return;

        setTracks((prev) => {
          const newTrack: Track = {
            id: crypto.randomUUID(),
            clips: [{ ...clip, startFrame: 0 }],
          };

          // First, remove the clip from the source track and recalculate startFrames
          const tracksWithoutClip = prev.map(t => {
            if (t.id === sourceTrack.id) {
              const remainingClips = t.clips.filter(c => c.id !== activeId);
              const clipsWithStartFrames = recalculateStartFrames(remainingClips);
              return { ...t, clips: clipsWithStartFrames };
            }
            return t;
          });

          return [
            ...tracksWithoutClip.slice(0, targetTrackIndex),
            newTrack, // 👈 NEW OVERLAY TRACK ABOVE TARGET
            ...tracksWithoutClip.slice(targetTrackIndex),
          ];
        });
      }
    } else {
      // Dragging over a track lane → MOVE CLIP INTO THAT TRACK
      const targetTrack = tracks.find((t) => t.id === overId);
      if (!targetTrack) return;

      if (sourceTrack.id === targetTrack.id) {
        // Same track lane - nothing to do
        return;
      }

      setTracks((prev) => {
        return prev.map(t => {
          if (t.id === sourceTrack.id) {
            // Remove clip from source track and recalculate startFrames
            const remainingClips = t.clips.filter(c => c.id !== activeId);
            const clipsWithStartFrames = recalculateStartFrames(remainingClips);
            return { ...t, clips: clipsWithStartFrames };
          } else if (t.id === targetTrack.id) {
            // Add clip to target track and recalculate startFrames
            const newClips = [...t.clips, { ...clip }];
            const clipsWithStartFrames = recalculateStartFrames(newClips);
            return { ...t, clips: clipsWithStartFrames };
          }
          return t;
        });
      });
    }
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      {tracks.map((track) => (
        <SortableContext
          key={track.id}
          items={track.clips.map(c => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          <TrackLane 
            track={track} 
            fps={fps} 
            selectedClipId={selectedClipId}
            onClipSelect={onClipSelect}
          />
        </SortableContext>
      ))}
    </DndContext>
  );
};
