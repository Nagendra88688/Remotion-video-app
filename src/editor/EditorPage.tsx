import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import { Timeline } from "./Timeline";
import { TimelineComposition } from "../remotion/TimelineComposition";
import { Library } from "./Library";
import { PlaybackControls } from "./PlaybackControls";
import { PropertiesPanel } from "./PropertiesPanel";
import type { Clip, Track } from "../remotion/types/timeline";

export const EditorPage = () => {
  const playerRef = useRef<PlayerRef>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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
      name: "Audio",
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

  // Add clip from library to timeline
  const handleAddClipToTimeline = useCallback((clip: Clip, trackId?: string) => {
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

  // Add clip to library (assets) and automatically add to timeline
  const handleAddClipToLibrary = useCallback((clip: Clip) => {
    setAssets(prev => [...prev, clip]);
    // Automatically add to timeline in the appropriate track
    handleAddClipToTimeline(clip);
  }, [handleAddClipToTimeline]);

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

  // Update currentFrame for playhead visualization (throttled to avoid stuttering)
  useEffect(() => {
    if (!isPlaying) return;
    
    // Use a longer interval (150ms) to update playhead position without causing stuttering
    // This updates the visual playhead without interfering with smooth video playback
    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const increment = 5; // ~5 frames per 150ms at 30fps
        const next = Math.min(prev + increment, totalFrames - 1);
        
        if (next >= totalFrames - 1) {
          // Automatically reset to beginning when reaching the end
          handleReset();
          return 0;
        }
        
        return next;
      });
    }, 150); // Update every 150ms - frequent enough for smooth playhead, infrequent enough to avoid stuttering

    return () => clearInterval(interval);
  }, [isPlaying, totalFrames, handleReset]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
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
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000000',
          position: 'relative',
          overflow: 'hidden'
        }}>
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
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
                height: '100%'
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
        />
      </div>
    </div>
  );
};
