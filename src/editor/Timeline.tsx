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
import { useState, useMemo, useRef, useEffect } from "react";
import type { Track, Clip } from "../remotion/types/timeline";
import { TrackLane } from "./TrackLane";

interface TimelineProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  fps: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string | null) => void;
  currentFrame?: number;
  onAddClipFromLibrary?: (clip: Clip) => void;
  onSeek?: (frame: number) => void;
}

export const Timeline = ({ 
  tracks, 
  setTracks, 
  fps, 
  selectedClipId, 
  onClipSelect,
  currentFrame = 0,
  onAddClipFromLibrary,
  onSeek
}: TimelineProps) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const timelineRulerRef = useRef<HTMLDivElement>(null);
  const pixelsPerSecond = useMemo(() => (60 * zoomLevel) / 100, [zoomLevel]);

  const findTrackByClipId = (clipId: string) =>
    tracks.find((t) => t.clips.some((c) => c.id === clipId));

  // Check if a clip type is compatible with a track type
  const isClipCompatibleWithTrack = (clipType: string, trackType?: string): boolean => {
    if (!trackType) return false;
    
    // Image clips can only go to video tracks
    if (clipType === "image") {
      return trackType === "video";
    }
    
    // Video clips can only go to video tracks
    if (clipType === "video") {
      return trackType === "video";
    }
    
    // Audio clips can only go to audio tracks
    if (clipType === "audio") {
      return trackType === "audio";
    }
    
    // Text clips can only go to text tracks
    if (clipType === "text") {
      return trackType === "text";
    }
    
    return false;
  };

  // Recalculate startFrame for clips in a track based on their order
  const recalculateStartFrames = (clips: typeof tracks[0]["clips"]) => {
    return clips.map((clip, index) => {
      const startFrame = index === 0 
        ? 0 
        : clips.slice(0, index).reduce((sum, c) => sum + (c.durationInFrames || 0), 0);
      // Preserve all clip properties by spreading first, then overriding startFrame
      return { ...clip, startFrame };
    });
  };

  const handleAddTrack = (type: "image" | "video" | "audio" | "text") => {
    const newTrack: Track = {
      id: crypto.randomUUID(),
      clips: [],
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${tracks.filter(t => t.type === type).length + 1}`,
    };
    setTracks((prev) => [...prev, newTrack]);
  };

  const handleAddClipToTrack = (trackId: string, type?: string) => {
    // This would typically open a dialog or use a clip from library
    // For now, we'll create a placeholder clip
    const newClip: Clip = {
      id: crypto.randomUUID(),
      type: (type as any) || "image",
      durationInFrames: 90,
      startFrame: 0,
      name: `New ${type || "clip"}`,
      ...(type === "text" ? { text: "New Text" } : { src: "" }),
    };
    
    // Find track and add clip, recalculating start frames
    setTracks((prev) => prev.map(t => {
      if (t.id === trackId) {
        const updatedClips = [...t.clips, { ...newClip, startFrame: 0 }];
        return { ...t, clips: recalculateStartFrames(updatedClips) };
      }
      return t;
    }));
  };

  const handleDeleteTrack = (trackId: string) => {
    setTracks((prev) => prev.filter(t => t.id !== trackId));
  };

  // Calculate maximum timeline width
  const getMaxTimelineWidth = () => {
    let maxEnd = 0;
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        const end = (clip.startFrame || 0) + clip.durationInFrames;
        maxEnd = Math.max(maxEnd, end);
      });
    });
    return Math.max((maxEnd / fps) * pixelsPerSecond, 800);
  };

  const timelineWidth = getMaxTimelineWidth();
  const playheadPosition = (currentFrame / fps) * pixelsPerSecond;

  const formatTime = (frames: number) => {
    const seconds = frames / fps;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate max frame from tracks
  const maxFrame = useMemo(() => {
    let max = 0;
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        const end = (clip.startFrame || 0) + clip.durationInFrames;
        max = Math.max(max, end);
      });
    });
    return Math.max(max, 90); // Minimum 90 frames
  }, [tracks]);

  // Calculate frame from mouse X position
  const getFrameFromPosition = (clientX: number): number => {
    if (!timelineRulerRef.current) return 0;
    const rect = timelineRulerRef.current.getBoundingClientRect();
    const leftPanelWidth = 200; // Width of the left "Time" panel
    const x = clientX - rect.left - leftPanelWidth;
    if (x < 0) return 0;
    
    const seconds = x / pixelsPerSecond;
    const frame = Math.round(seconds * fps);
    
    return Math.max(0, Math.min(frame, maxFrame - 1));
  };

  // Handle mouse down on playhead or timeline
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    // Stop event propagation to prevent conflicts with clip dragging
    e.stopPropagation();
    setIsDragging(true);
    const frame = getFrameFromPosition(e.clientX);
    onSeek?.(frame);
  };

  // Handle mouse move while dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRulerRef.current) return;
      const rect = timelineRulerRef.current.getBoundingClientRect();
      const leftPanelWidth = 200;
      const x = e.clientX - rect.left - leftPanelWidth;
      if (x < 0) {
        onSeek?.(0);
        return;
      }
      
      const seconds = x / pixelsPerSecond;
      const frame = Math.round(seconds * fps);
      const clampedFrame = Math.max(0, Math.min(frame, maxFrame - 1));
      onSeek?.(clampedFrame);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pixelsPerSecond, fps, maxFrame, onSeek]);

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
        // Different track → Check compatibility before moving
        const targetTrack = tracks.find((t) => t.id === targetTrackByClip.id);
        if (!targetTrack) return;
        
        // Check if clip type is compatible with target track type
        if (!isClipCompatibleWithTrack(clip.type, targetTrack.type)) {
          return; // Don't allow incompatible moves
        }
        
        const targetTrackIndex = tracks.findIndex((t) => t.id === targetTrackByClip.id);
        if (targetTrackIndex === -1) return;

        setTracks((prev) => {
          // Move clip to target track instead of creating new track
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
    } else {
      // Dragging over a track lane → MOVE CLIP INTO THAT TRACK
      const targetTrack = tracks.find((t) => t.id === overId);
      if (!targetTrack) return;

      if (sourceTrack.id === targetTrack.id) {
        // Same track lane - nothing to do
        return;
      }

      // Check if clip type is compatible with target track type
      if (!isClipCompatibleWithTrack(clip.type, targetTrack.type)) {
        return; // Don't allow incompatible moves
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e0e0e0',
      height: '100%',
      position: 'relative'
    }}>
      {/* Add Track Buttons */}
      {/* <div style={{
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fafafa'
      }}>
        <button
          onClick={() => handleAddTrack("image")}
          style={{
            padding: '8px 12px',
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1a1a1a'
          }}
          title="Add Image/Video Track"
        >
          <span>⬜</span>
          <span>+</span>
        </button>
        <button
          onClick={() => handleAddTrack("audio")}
          style={{
            padding: '8px 12px',
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1a1a1a'
          }}
          title="Add Audio Track"
        >
          <span>🎵</span>
          <span>+</span>
        </button>
        <button
          onClick={() => handleAddTrack("text")}
          style={{
            padding: '8px 12px',
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1a1a1a'
          }}
          title="Add Text Track"
        >
          <span>A</span>
          <span>+</span>
        </button>
      </div> */}

      {/* Time Ruler */}
      <div style={{
        display: 'flex',
        height: '32px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
        position: 'relative',
        overflowX: 'auto',
        overflowY: 'hidden'
      }}>
        <div style={{
          minWidth: '200px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          borderRight: '1px solid #e0e0e0',
          backgroundColor: '#ffffff',
          fontSize: '12px',
          color: '#666',
          flexShrink: 0
        }}>
          Time
        </div>
        <div 
          ref={timelineRulerRef}
          style={{
            position: 'relative',
            minWidth: `${timelineWidth}px`,
            height: '100%',
            overflow: 'visible',
            cursor: isDragging ? 'grabbing' : 'pointer'
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Time marks */}
          <div style={{
            position: 'absolute',
            width: `${timelineWidth}px`,
            height: '100%',
            paddingLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            color: '#999',
            pointerEvents: 'none'
          }}>
            {formatTime(currentFrame)}
          </div>
          {/* Playhead */}
          <div style={{
            position: 'absolute',
            left: `${playheadPosition}px`,
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: '#d32f2f',
            zIndex: 15,
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'auto'
          }}>
            <div style={{
              position: 'absolute',
              top: '-18px',
              left: '-20px',
              fontSize: '11px',
              color: '#d32f2f',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '2px 4px',
              borderRadius: '2px',
              pointerEvents: 'none'
            }}>
              {formatTime(currentFrame)}
            </div>
          </div>
        </div>
      </div>

      {/* Tracks Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'auto',
        position: 'relative'
      }}>
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          {/* Playhead line across all tracks */}
          <div style={{
            position: 'absolute',
            left: `${200 + playheadPosition}px`,
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: '#d32f2f',
            zIndex: 5,
            pointerEvents: 'none'
          }} />
          
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
                onAddClip={handleAddClipToTrack}
                onDeleteTrack={handleDeleteTrack}
                pixelsPerSecond={pixelsPerSecond}
              />
            </SortableContext>
          ))}
        </DndContext>
      </div>

      {/* Zoom Controls */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#ffffff',
        border: '1px solid #d0d0d0',
        borderRadius: '4px',
        padding: '4px 8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 20
      }}>
        <button
          onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#666',
            padding: '4px 8px'
          }}
          title="Zoom Out"
        >
          🔍−
        </button>
        <span style={{
          fontSize: '12px',
          color: '#1a1a1a',
          fontWeight: 500,
          minWidth: '45px',
          textAlign: 'center'
        }}>
          {zoomLevel}%
        </span>
        <button
          onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#666',
            padding: '4px 8px'
          }}
          title="Zoom In"
        >
          🔍+
        </button>
      </div>
    </div>
  );
};
