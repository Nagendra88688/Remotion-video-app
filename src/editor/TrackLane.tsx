// src/editor/TrackLane.tsx
import { useDroppable } from "@dnd-kit/core";
import type { Track } from "../remotion/types/timeline";
import { SortableClip } from "./SortableClip";

interface Props {
  track: Track;
  fps: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string | null) => void;
  onAddClip?: (trackId: string, type?: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  pixelsPerSecond?: number;
}

const getTrackColor = (type?: string) => {
  switch (type) {
    case 'text':
      return { bg: '#f5f5f5', border: '#d0d0d0' }; // Light gray
    case 'video':
      return { bg: '#e8e8e8', border: '#d0d0d0' }; // Medium gray
    case 'audio':
      return { bg: '#f0f0f0', border: '#d0d0d0' }; // Slightly lighter gray
    case 'image':
      return { bg: '#eaeaea', border: '#d0d0d0' }; // Medium-light gray
    default:
      return { bg: '#f5f5f5', border: '#d0d0d0' }; // Default gray
  }
};

export const TrackLane = ({ 
  track, 
  fps, 
  selectedClipId, 
  onClipSelect,
  onAddClip,
  onDeleteTrack,
  pixelsPerSecond = 60
}: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: track.id,
  });

  // Calculate total timeline width based on the last clip's end position
  // Need to ensure we include the full width of all clips
  const calculateClipEndPosition = (clip: typeof track.clips[0]) => {
    const startSeconds = (clip.startFrame || 0) / fps;
    const durationSeconds = clip.durationInFrames / fps;
    const startPosition = startSeconds * pixelsPerSecond;
    const clipWidth = Math.max(durationSeconds * pixelsPerSecond, 60); // Minimum 60px
    return startPosition + clipWidth;
  };

  const maxEndPosition = track.clips.length > 0
    ? Math.max(...track.clips.map(calculateClipEndPosition))
    : 0;
  
  // Add some padding (20px) to ensure clips don't touch the edge
  const timelineWidth = Math.max(maxEndPosition + 20, 200); // Minimum 200px width
  const trackColor = getTrackColor(track.type);
console.log({track});

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 4,
        position: "relative",
        minHeight: 56,
        backgroundColor: trackColor.bg,
        border: `1px solid ${trackColor.border}`,
        borderRadius: '4px',
        overflow: 'visible',
      }}
    >
      {/* Track controls (left side) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        minWidth: '175px',
        borderRight: `1px solid ${trackColor.border}`,
        backgroundColor: '#ffffff'
      }}>
        {/* <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '16px',
            color: '#666'
          }}
          title="Track options"
        >
          ⋮
        </button> */}
        
        <span style={{
          flex: 1,
          fontSize: '14px',
          fontWeight: 500,
          color: '#1a1a1a',
          textAlign: 'left'
        }}>
          {track?.type==="video" ? ("Image/"+track.name || `Track ${track.id.slice(0, 8)}`) 
          :
          track.name || `Track ${track.id.slice(0, 8)}`}
        </span>

        <button
          onClick={() => onAddClip?.(track.id, track.type)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '16px',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Add clip to track"
        >
          +
        </button>

        {/* <button
          onClick={() => onDeleteTrack?.(track.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '16px',
            color: '#d32f2f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Delete track"
        >
          🗑
        </button> */}
      </div>

      {/* Timeline area */}
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        minHeight: 56,
        overflowX: 'auto',
        overflowY: 'hidden'
      }}>
        <div 
          ref={setNodeRef}
          style={{ 
            position: "relative", 
            width: `${timelineWidth}px`, 
            minWidth: '100%',
            minHeight: 56,
            height: "100%",
            backgroundColor: isOver ? 'rgba(74, 158, 255, 0.1)' : 'transparent'
          }}
        >
          {track.clips.map((clip) => (
            <SortableClip 
              key={clip.id} 
              clip={clip} 
              fps={fps}
              isSelected={selectedClipId === clip.id}
              onSelect={() => onClipSelect(clip.id)}
              pixelsPerSecond={pixelsPerSecond}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
