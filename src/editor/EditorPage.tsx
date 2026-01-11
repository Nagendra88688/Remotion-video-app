import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import { DndContext, type DragEndEvent, type DragOverEvent, closestCenter } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Timeline } from "./Timeline";
import { TimelineComposition } from "../remotion/TimelineComposition";
import { Library } from "./Library";
import { PlaybackControls } from "./PlaybackControls";
import { PropertiesPanel } from "./PropertiesPanel";
import { TextInputModal } from "./TextInputModal";
import type { Clip, Track } from "../remotion/types/timeline";

export const EditorPage = () => {
  const playerRef = useRef<PlayerRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<HTMLDivElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [pendingTextClip, setPendingTextClip] = useState<{ trackId?: string } | null>(null);
  const [pendingFileUpload, setPendingFileUpload] = useState<{ trackId: string; trackType: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; trackId: string | null } | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Library assets (separate from timeline clips)
  const [assets, setAssets] = useState<Clip[]>([]);

  // Timeline tracks with proper types and names
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: "text-track-1",
      clips: [],
      name: "Text",
      type: "text",
    },
    {
      id: "video-track-1",
      clips: [],
      name: "Video",
      type: "video",
    },
    {
      id: "audio-track-1",
      clips: [],
      name: "Audio 🎵",
      type: "audio",
    },
  ]);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  
  // Calculate total duration based on all clips in all tracks
  const totalFrames = useMemo(() => {
    let maxEnd = 0;
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        const end = (clip.startFrame || 0) + clip.durationInFrames;
        maxEnd = Math.max(maxEnd, end);
      });
    });
    return Math.max(maxEnd, 90); // Minimum 90 frames
  }, [tracks]);

  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of tracks) {
      const clip = track.clips.find(c => c.id === selectedClipId);
      if (clip) return clip;
    }
    return null;
  }, [selectedClipId, tracks]);

  // Recalculate startFrame for clips in a track based on their order
  const recalculateStartFrames = useCallback((clips: Clip[]) => {
    return clips.map((clip, index) => {
      const startFrame = index === 0 
        ? 0 
        : clips.slice(0, index).reduce((sum, c) => sum + (c.durationInFrames || 0), 0);
      // Preserve all properties using spread, only override startFrame
      return { 
        ...clip, 
        startFrame,
      };
    });
  }, []);

  // Internal function to actually add clip to timeline
  const addClipToTimeline = useCallback((clip: Clip, trackId?: string) => {
    // Create a new clip instance for the timeline (don't reuse the library clip)
    // Spread all properties first, then override with new ID and ensure startFrame
    const clipToAdd: Clip = { 
      ...clip, // Preserve all properties including src, text, name
      id: crypto.randomUUID(), // New ID for timeline clip
      startFrame: clip.startFrame ?? 0, // Ensure startFrame is set (will be recalculated later)
    };
    
    setTracks((prev) => {
      // If trackId is specified, add to that track
      if (trackId) {
        return prev.map(track => {
          if (track.id === trackId) {
            const updatedClips = [...track.clips, clipToAdd];
            return {
              ...track,
              clips: recalculateStartFrames(updatedClips),
            };
          }
          return track;
        });
      }
      
      // Otherwise, find or create appropriate track
      // Map image type to video track (images are typically placed on video tracks)
      const clipTypeForMatching = clip.type === "image" ? "video" : clip.type;
      const matchingTrack = prev.find(t => t.type === clipTypeForMatching);
      
      if (matchingTrack) {
        const updatedClips = [...matchingTrack.clips, clipToAdd];
        return prev.map(t =>
          t.id === matchingTrack.id
            ? { ...t, clips: recalculateStartFrames(updatedClips) }
            : t
        );
      }
      
      // Create new track if no matching type found
      const trackType = clip.type === "image" ? "video" : clip.type;
      const newTrack: Track = {
        id: crypto.randomUUID(),
        clips: [clipToAdd],
        name: `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} ${prev.filter(t => t.type === trackType).length + 1}`,
        type: trackType as any,
      };
      return [...prev, newTrack];
    });
  }, [recalculateStartFrames]);

  // Add clip from library to timeline
  const handleAddClipToTimeline = useCallback((clip: Clip, trackId?: string) => {
    // If it's a text clip, show modal first
    if (clip.type === "text") {
      setPendingTextClip({ trackId });
      setShowTextModal(true);
      return;
    }

    // For non-text clips, add directly
    addClipToTimeline(clip, trackId);
  }, [addClipToTimeline]);

  // Handle drag end for library assets and timeline clips
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dragging from library (asset has library-asset- prefix)
    if (activeId.startsWith('library-asset-')) {
      // Get asset from drag event data (more reliable than array lookup)
      const dragData = active.data.current as { asset?: Clip } | undefined;
      const assetFromData = dragData?.asset;
      
      // Fallback to array lookup if data is not available
      const assetId = activeId.replace('library-asset-', '');
      const asset = assetFromData || assets.find(a => a.id === assetId);
      
      if (!asset) return;

      // Find the target track
      const targetTrack = tracks.find(t => t.id === overId);
      if (!targetTrack) return;

      // Check if asset type is compatible with track type
      // Images can go to video tracks
      if (asset.type === "image" && targetTrack.type === "video") {
        // Allow image to video track
      } else if (asset.type === "video" && targetTrack.type === "video") {
        // Allow video to video track
      } else if (asset.type === "audio" && targetTrack.type === "audio") {
        // Allow audio to audio track
      } else if (asset.type === "text" && targetTrack.type === "text") {
        // Allow text to text track
      } else {
        return; // Incompatible types
      }

      // Add clip to timeline track
      addClipToTimeline(asset, targetTrack.id);
      return;
    }

    // Handle timeline clip reordering within tracks
    const sourceTrack = tracks.find(t => t.clips.some(c => c.id === activeId));
    if (!sourceTrack) return;

    const clip = sourceTrack.clips.find(c => c.id === activeId);
    if (!clip) return;

    // Check if dropping on another clip in the same track (reordering within same track)
    const targetClipInSameTrack = sourceTrack.clips.find(c => c.id === overId);
    if (targetClipInSameTrack) {
      // Reorder clips within the same track using arrayMove
      const oldIndex = sourceTrack.clips.findIndex(c => c.id === activeId);
      const newIndex = sourceTrack.clips.findIndex(c => c.id === overId);
      
      if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
        setTracks(prevTracks => {
          return prevTracks.map(track => {
            if (track.id === sourceTrack.id) {
              const reorderedClips = arrayMove([...track.clips], oldIndex, newIndex);
              return {
                ...track,
                clips: recalculateStartFrames(reorderedClips),
              };
            }
            return track;
          });
        });
      }
      return;
    }

    // Check if dropping on another track (moving between tracks)
    const targetTrack = tracks.find(t => t.id === overId);
    if (targetTrack && targetTrack.id !== sourceTrack.id) {
      // Check if clip type is compatible with target track type
      const clipTypeForMatching = clip.type === "image" ? "video" : clip.type;
      if (targetTrack.type === clipTypeForMatching) {
        setTracks(prevTracks => {
          const newTracks = prevTracks.map(t => ({ ...t, clips: [...t.clips] })); // Deep copy clips

          // Remove clip from source track
          const sourceTrackIndex = newTracks.findIndex(t => t.id === sourceTrack.id);
          if (sourceTrackIndex !== -1) {
            newTracks[sourceTrackIndex].clips = newTracks[sourceTrackIndex].clips.filter(c => c.id !== activeId);
            newTracks[sourceTrackIndex].clips = recalculateStartFrames(newTracks[sourceTrackIndex].clips);
          }

          // Add clip to target track
          const targetTrackIndex = newTracks.findIndex(t => t.id === targetTrack.id);
          if (targetTrackIndex !== -1) {
            const clipToMove = { ...clip, startFrame: 0 }; // Reset startFrame, will be recalculated
            newTracks[targetTrackIndex].clips = [...newTracks[targetTrackIndex].clips, clipToMove];
            newTracks[targetTrackIndex].clips = recalculateStartFrames(newTracks[targetTrackIndex].clips);
          }
          return newTracks;
        });
      }
      return;
    }
  }, [assets, tracks, addClipToTimeline, recalculateStartFrames]);

  // Handle text modal confirm
  const handleTextConfirm = useCallback((text: string) => {
    const textClip: Clip = {
      id: crypto.randomUUID(),
      type: "text",
      text: text,
      name: `Text: ${text.slice(0, 20)}${text.length > 20 ? "..." : ""}`,
      startFrame: 0,
      durationInFrames: 90,
    };
    
    addClipToTimeline(textClip, pendingTextClip?.trackId);
    setShowTextModal(false);
    setPendingTextClip(null);
  }, [addClipToTimeline, pendingTextClip]);

  // Handle text modal cancel
  const handleTextCancel = useCallback(() => {
    setShowTextModal(false);
    setPendingTextClip(null);
  }, []);

  // Handle exit fullscreen
  const handleExitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (err) {
      console.error("Error attempting to exit fullscreen:", err);
    }
  }, []);

  // Add clip to library (assets only, not to timeline)
  const handleAddClipToLibrary = useCallback((clip: Clip) => {
    setAssets(prev => [...prev, clip]);
  }, []);

  // Handle file upload for track + button
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !pendingFileUpload) return;
    
    const { trackId, trackType } = pendingFileUpload;
    
    Array.from(e.target.files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const baseClip = {
        id: crypto.randomUUID(),
        startFrame: 0,
        durationInFrames: 90,
        name: file.name,
      };

      if (file.type.startsWith("image")) {
        // Only allow images for video tracks
        if (trackType === "video") {
          const imageClip: Clip = {
            ...baseClip,
            type: "image",
            src: url,
          };
          addClipToTimeline(imageClip, trackId);
        }
      } else if (file.type.startsWith("video")) {
        // Only allow videos for video tracks
        if (trackType === "video") {
          // Create video element to detect actual duration
          const video = document.createElement("video");
          video.src = url;
          video.preload = "metadata";
          
          video.onloadedmetadata = () => {
            const durationInSeconds = video.duration || 0;
            const durationInFrames = Math.ceil(durationInSeconds * 30); // 30fps
            
            const videoClip: Clip = {
              ...baseClip,
              type: "video",
              src: url,
              durationInFrames: durationInFrames || 300,
            };
            addClipToTimeline(videoClip, trackId);
          };
          
          video.onerror = () => {
            const videoClip: Clip = {
              ...baseClip,
              type: "video",
              src: url,
              durationInFrames: 300,
            };
            addClipToTimeline(videoClip, trackId);
          };
          
          video.load();
        }
      } else if (file.type.startsWith("audio")) {
        // Only allow audio for audio tracks
        if (trackType === "audio") {
          const audioClip: Clip = {
            ...baseClip,
            type: "audio",
            src: url,
            durationInFrames: 300,
          };
          addClipToTimeline(audioClip, trackId);
        }
      }
    });
    
    // Reset file input and pending upload
    e.target.value = "";
    setPendingFileUpload(null);
  }, [pendingFileUpload, addClipToTimeline]);

  // Open file upload dialog for track
  const handleOpenFileUpload = useCallback((trackId: string, trackType: string) => {
    setPendingFileUpload({ trackId, trackType });
    fileInputRef.current?.click();
  }, []);

  const handlePlay = () => {
    playerRef.current?.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    playerRef.current?.pause();
    setIsPlaying(false);
  };

  const handleSeek = (frame: number) => {
    const clampedFrame = Math.max(0, Math.min(frame, totalFrames - 1));
    playerRef.current?.seekTo(clampedFrame);
    setCurrentFrame(clampedFrame);
  };

  const handleReset = useCallback(() => {
    playerRef.current?.seekTo(0);
    setCurrentFrame(0);
    if (isPlaying) {
      playerRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Update currentFrame for playhead visualization (smooth updates)
  useEffect(() => {
    if (!isPlaying) return;
    
    const fps = 30;
    const frameDuration = 1000 / fps; // ~33.33ms per frame at 30fps
    
    // Use requestAnimationFrame for smooth, frame-synced updates
    let animationFrameId: number;
    let lastUpdateTime = performance.now();
    
    const updatePlayhead = (currentTime: number) => {
      const elapsed = currentTime - lastUpdateTime;
      
      if (elapsed >= frameDuration) {
        setCurrentFrame(prev => {
          const framesToAdvance = Math.floor(elapsed / frameDuration);
          const next = Math.min(prev + framesToAdvance, totalFrames - 1);
          
          if (next >= totalFrames - 1) {
            // Automatically reset to beginning when reaching the end
            handleReset();
            return 0;
          }
          
          return next;
        });
        
        lastUpdateTime = currentTime - (elapsed % frameDuration);
      }
      
      animationFrameId = requestAnimationFrame(updatePlayhead);
    };
    
    animationFrameId = requestAnimationFrame(updatePlayhead);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, totalFrames, handleReset]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <>
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '80vw',
      backgroundColor: '#ffffff',
      overflow: 'hidden'
    }}>
      {/* Top Section: Three Panels */}
      <div style={{
        display: 'flex',
        height: '400px',
        borderBottom: '1px solid #e0e0e0'
      }}>
        {/* Left Panel: Library */}
        <div style={{ width: '280px', height: '100%' }}>
          <Library 
            assets={assets} 
            onAddClip={handleAddClipToLibrary}
          />
        </div>

        {/* Center Panel: Video Preview */}
        <div 
          ref={rendererRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#000000',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            color: '#ffffff',
            fontSize: '12px',
            zIndex: 10,
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            1.00
          </div>
          {/* Exit Fullscreen button - only visible in fullscreen mode */}
          {isFullscreen && (
            <button
              onClick={handleExitFullscreen}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(0,0,0,0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#ffffff',
                zIndex: 20,
                transition: 'all 0.2s'
              }}
              title="Exit Fullscreen"
            >
              ✕
            </button>
          )}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: '100%',
            height: '100%',
            aspectRatio: '16 / 9',
            maxHeight: '100%',
            maxWidth: '100%'
          }}>
      <Player
              ref={playerRef}
        component={TimelineComposition}
        inputProps={{ tracks, selectedClipId }}
        durationInFrames={totalFrames}
        fps={30}
        compositionWidth={1280}
        compositionHeight={720}
              controls={false}
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
          </div>
        </div>

        {/* Right Panel: Properties */}
        {/* <div style={{ width: '280px', height: '100%' }}>
          <PropertiesPanel selectedClip={selectedClip} />
        </div> */}
      </div>

      {/* Middle Section: Playback Controls */}
      <PlaybackControls
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        isPlaying={isPlaying}
        rendererRef={rendererRef}
      />

      {/* Bottom Section: Timeline */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden'
      }}>
      <Timeline 
        tracks={tracks}
        setTracks={setTracks}
        fps={30}
        selectedClipId={selectedClipId}
        onClipSelect={setSelectedClipId}
          currentFrame={currentFrame}
          onAddClipFromLibrary={handleAddClipToTimeline}
          onSeek={handleSeek}
          onOpenTextModal={(trackId) => {
            setPendingTextClip({ trackId });
            setShowTextModal(true);
          }}
          onOpenFileUpload={handleOpenFileUpload}
        />
      </div>
    </div>
    </DndContext>

    <TextInputModal
      isOpen={showTextModal}
      onConfirm={handleTextConfirm}
      onCancel={handleTextCancel}
    />
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept="image/*,video/*,audio/*"
      onChange={handleFileUpload}
      style={{ display: 'none' }}
    />
    </>
  );
};
