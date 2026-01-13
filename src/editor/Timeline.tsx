import {
  DndContext,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useState, useMemo, useRef, useEffect } from "react";
import type { Track, Clip } from "../remotion/types/timeline";
import { SortableTrack } from "./SortableTrack";

interface TimelineProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  fps: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string | null) => void;
  currentFrame?: number;
  onAddClipFromLibrary?: (clip: Clip) => void;
  onSeek?: (frame: number) => void;
  onOpenTextModal?: (trackId: string) => void;
  onOpenFileUpload?: (trackId: string, trackType: string) => void;
  onDeleteClip?: (clipId: string) => void;
}

export const Timeline = ({ 
  tracks, 
  setTracks, 
  fps, 
  selectedClipId,
  onClipSelect,
  currentFrame = 0,
  onAddClipFromLibrary,
  onSeek,
  onOpenTextModal,
  onOpenFileUpload,
  onDeleteClip
}: TimelineProps) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFrame, setDragFrame] = useState<number | null>(null);
  const [isHoveringPlayhead, setIsHoveringPlayhead] = useState(false);
  const timelineRulerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to bottom when tracks are added
  useEffect(() => {
    if (tracksContainerRef.current && tracks.length > 0) {
      // Use setTimeout with requestAnimationFrame to ensure DOM has fully updated and rendered
      // This is especially important for the first track addition
      const scrollToBottom = () => {
        if (tracksContainerRef.current) {
          tracksContainerRef.current.scrollTop = tracksContainerRef.current.scrollHeight;
        }
      };
      
      // Use multiple frames to ensure layout is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
          // Additional delay for first track to ensure full render
          setTimeout(scrollToBottom, 50);
        });
      });
    }
  }, [tracks.length]);

  const handleAddClipToTrack = (trackId: string, type?: string) => {
    // If it's a text track, open the text modal
    if (type === "text") {
      onOpenTextModal?.(trackId);
      return;
    }
    
    // For video or audio tracks, open file upload
    if (type === "video" || type === "audio") {
      onOpenFileUpload?.(trackId, type);
      return;
    }
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
    // Add extra padding (equivalent to 3 seconds) to ensure there's always space for new clips
    const extraPadding = (3 * fps / fps) * pixelsPerSecond; // 3 seconds worth of space
    return Math.max((maxEnd / fps) * pixelsPerSecond + extraPadding, 800);
  };

  const timelineWidth = getMaxTimelineWidth();
  // Use dragFrame for immediate visual feedback during dragging, otherwise use currentFrame
  const displayFrame = isDragging && dragFrame !== null ? dragFrame : currentFrame;
  const playheadPosition = (displayFrame / fps) * pixelsPerSecond;

  // Auto-scroll timeline to keep playhead visible
  useEffect(() => {
    if (!tracksContainerRef.current || isDragging) return; // Don't auto-scroll while dragging
    
    const container = tracksContainerRef.current;
    const playheadAbsolutePosition = 200 + playheadPosition; // 200px left panel + playhead position
    
    // Get visible area bounds
    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const visibleStart = scrollLeft;
    const visibleEnd = scrollLeft + containerRect.width;
    
    // Calculate playhead position relative to container
    const playheadRelativePosition = playheadAbsolutePosition - 200; // Subtract left panel width
    
    // Check if playhead is outside visible area
    const margin = 100; // Keep playhead at least 100px from edges
    const shouldScroll = playheadRelativePosition < visibleStart + margin || 
                        playheadRelativePosition > visibleEnd - margin;
    
    if (shouldScroll) {
      // Calculate target scroll position to center playhead in view
      const targetScroll = playheadRelativePosition - (containerRect.width / 2);
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [playheadPosition, pixelsPerSecond, isDragging]);

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

    let rafId: number | null = null;
    let lastSeekTime = 0;
    const seekThrottle = 50; // Throttle actual player seeks to every 50ms

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRulerRef.current) return;
      const rect = timelineRulerRef.current.getBoundingClientRect();
      const leftPanelWidth = 200;
      const x = e.clientX - rect.left - leftPanelWidth;
      
      let frame: number;
      if (x < 0) {
        frame = 0;
      } else {
        const seconds = x / pixelsPerSecond;
        frame = Math.round(seconds * fps);
        frame = Math.max(0, Math.min(frame, maxFrame - 1));
      }
      
      // Update local state immediately for visual feedback
      setDragFrame(frame);
      
      // Throttle actual player seeks to avoid performance issues
      const now = performance.now();
      if (now - lastSeekTime >= seekThrottle) {
        onSeek?.(frame);
        lastSeekTime = now;
      } else {
        // Schedule a seek for the next frame if not already scheduled
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            onSeek?.(frame);
            rafId = null;
          });
        }
      }
    };

    const handleMouseUp = () => {
      // Final seek to ensure player is at exact position
      if (dragFrame !== null) {
        onSeek?.(dragFrame);
      }
      setIsDragging(false);
      setDragFrame(null);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isDragging, pixelsPerSecond, fps, maxFrame, onSeek, dragFrame]);


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
      <div style={{
        display: 'flex',
        justifyContent: 'end',
        gap: '8px',
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fafafa'
      }}>
        <button
          onClick={() => handleAddTrack("video")}
          style={{
            padding: '8px 12px',
            backgroundColor: '#eff6ff',
            border: '1px solid rgb(123, 175, 244)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1a1a1a'
          }}
          title="Add Image/Video Layer"
        >
          <span>🎥 Add video layer</span>
          <span>+</span>
        </button>
        <button
          onClick={() => handleAddTrack("audio")}
          style={{
            padding: '8px 12px',
            backgroundColor: '#eff6ff',
            border: '1px solid rgb(123, 175, 244)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1a1a1a'
          }}
          title="Add Audio Layer"
        >
          <span>🎵 Add audio layer</span>
          <span>+</span>
        </button>
        <button
          onClick={() => handleAddTrack("text")}
          style={{
            padding: '8px 12px',
            backgroundColor: '#eff6ff',
            border: '1px solid rgb(123, 175, 244)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1a1a1a'
          }}
          title="Add Text Layer"
        >
          <span>(Aa)Add text layer</span>
          <span>+</span>
        </button>
      </div>

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
          minWidth: '175px',
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
            {formatTime(displayFrame)}
          </div>
          {/* Playhead */}
          <div 
            style={{
              position: 'absolute',
              left: `${playheadPosition}px`,
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: '#d32f2f',
              zIndex: 15,
              cursor: isDragging ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
              transform: isHoveringPlayhead ? 'scaleX(3)' : 'scaleX(1)',
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
              borderRadius: '1px'
            }}
            onMouseEnter={() => setIsHoveringPlayhead(true)}
            onMouseLeave={() => setIsHoveringPlayhead(false)}
          >
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
              {formatTime(displayFrame)}
            </div>
          </div>
        </div>
      </div>

      {/* Tracks Area */}
      <div 
        ref={tracksContainerRef}
        style={{
          height: '200px',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <div style={{
          position: 'relative',
          minWidth: `${timelineWidth + 200}px`, // Full timeline width + left panel width
          height: '100%'
        }}>
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
          
          <SortableContext
            items={tracks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tracks.map((track) => (
              <SortableContext
                key={track.id}
                items={track.clips.map(c => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                <SortableTrack
                  track={track}
                  fps={fps}
                  selectedClipId={selectedClipId}
                  onClipSelect={onClipSelect}
                  onAddClip={handleAddClipToTrack}
                  onDeleteTrack={handleDeleteTrack}
                  onDeleteClip={onDeleteClip}
                  pixelsPerSecond={pixelsPerSecond}
                />
              </SortableContext>
            ))}
          </SortableContext>
        </div>
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
