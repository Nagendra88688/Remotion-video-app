import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DragCancelEvent,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Timeline } from "./Timeline";
import { TimelineComposition } from "../remotion/TimelineComposition";
import { Library } from "./Library";
import { PlaybackControls } from "./PlaybackControls";
import { PropertiesPanel } from "./PropertiesPanel";
import { TextInputModal } from "./TextInputModal";
import { ClipResizeOverlay } from "./ClipResizeOverlay";
import type { Clip, Track } from "../remotion/types/timeline";

export const EditorPage = () => {
  const playerRef = useRef<PlayerRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<HTMLDivElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [pendingTextClip, setPendingTextClip] = useState<{
    trackId?: string;
  } | null>(null);
  const [pendingFileUpload, setPendingFileUpload] = useState<{
    trackId: string;
    trackType: string;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    trackId: string | null;
    frame: number;
  } | null>(null);
  const [activeDragAsset, setActiveDragAsset] = useState<Clip | null>(null);
  const currentMouseXRef = useRef<number>(0);
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
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = (clip.startFrame || 0) + clip.durationInFrames;
        maxEnd = Math.max(maxEnd, end);
      });
    });
    return Math.max(maxEnd, 90); // Minimum 90 frames
  }, [tracks]);

  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) return clip;
    }
    return null;
  }, [selectedClipId, tracks]);
  console.log({selectedClipId});
  

  // Recalculate startFrame for clips in a track based on their order
  const recalculateStartFrames = useCallback((clips: Clip[]) => {
    return clips.map((clip, index) => {
      const startFrame =
        index === 0
          ? 0
          : clips
              .slice(0, index)
              .reduce((sum, c) => sum + (c.durationInFrames || 0), 0);
      // Preserve all properties using spread, only override startFrame
      return {
        ...clip,
        startFrame,
      };
    });
  }, []);

  // Internal function to actually add clip to timeline
  const addClipToTimeline = useCallback(
    (clip: Clip, trackId?: string) => {
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
          return prev.map((track) => {
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
        const matchingTrack = prev.find((t) => t.type === clipTypeForMatching);

        if (matchingTrack) {
          const updatedClips = [...matchingTrack.clips, clipToAdd];
          return prev.map((t) =>
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
          name: `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} ${
            prev.filter((t) => t.type === trackType).length + 1
          }`,
          type: trackType as any,
        };
        return [...prev, newTrack];
      });
    },
    [recalculateStartFrames]
  );

  // Add clip from library to timeline
  const handleAddClipToTimeline = useCallback(
    (clip: Clip, trackId?: string) => {
      // If it's a text clip, show modal first
      if (clip.type === "text") {
        setPendingTextClip({ trackId });
        setShowTextModal(true);
        return;
      }

      // For non-text clips, add directly
      addClipToTimeline(clip, trackId);
    },
    [addClipToTimeline]
  );

  // Track mouse position globally during drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      currentMouseXRef.current = e.clientX;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Handle drag start - prevent auto-scrolling and track dragged asset
  const handleDragStart = useCallback((event: DragStartEvent) => {
    // Disable body scroll during drag
    document.body.style.overflow = "hidden";
    
    // Track which asset is being dragged for preview
    const activeId = event.active.id.toString();
    if (activeId.startsWith("library-asset-")) {
      const assetId = activeId.replace("library-asset-", "");
      const asset = assets.find((a) => a.id === assetId);
      if (asset) {
        setActiveDragAsset(asset);
      }
    } else {
      setActiveDragAsset(null);
    }
  }, [assets]);

  // Handle drag over - track mouse position to calculate drop frame
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) {
        setDragPosition(null);
        return;
      }

      const overId = over.id as string;
      const activeId = active.id.toString();
      
      // Check if dragging from library or dragging an existing clip
      const isLibraryAsset = activeId.startsWith("library-asset-");
      const sourceTrack = tracks.find((t) => t.clips.some((c) => c.id === activeId));
      
      // Find target track - could be the track itself or a clip's track
      let targetTrack = tracks.find((t) => t.id === overId);
      if (!targetTrack) {
        // If overId is a clip, find its track
        const clipTrack = tracks.find((t) => t.clips.some((c) => c.id === overId));
        if (clipTrack) {
          targetTrack = clipTrack;
        }
      }
      
      // Track position if dropping on a track (either from library or moving existing clip)
      if (targetTrack && (isLibraryAsset || sourceTrack)) {
        // Get the track element to calculate relative position
        const trackElement = document.querySelector(`[data-track-id="${targetTrack.id}"]`) as HTMLElement;
        if (trackElement) {
          const rect = trackElement.getBoundingClientRect();
          // Use the current mouse position from the ref
          const mouseX = currentMouseXRef.current;
          
          // Calculate frame from position (accounting for 200px left panel in timeline)
          const pixelsPerSecond = 60; // Default, matches Timeline
          const fps = 30;
          const leftPanelWidth = 200; // Width of track name panel
          const relativeX = mouseX - rect.left;
          const adjustedX = Math.max(0, relativeX - leftPanelWidth);
          const seconds = adjustedX / pixelsPerSecond;
          const frame = Math.floor(seconds * fps);
          
          setDragPosition({
            x: mouseX,
            trackId: targetTrack.id,
            frame: frame,
          });
        }
      } else {
        setDragPosition(null);
      }
    },
    [tracks]
  );

  // Handle drag cancel - clear preview immediately
  const handleDragCancel = useCallback(() => {
    document.body.style.overflow = "";
    setActiveDragAsset(null);
  }, []);

  // Handle drag end for library assets and timeline clips
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      // Clear drag preview immediately (before any other logic)
      setActiveDragAsset(null);
      // Re-enable body scroll after drag
      document.body.style.overflow = "";
      const { active, over } = event;
      if (!over) {
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if dragging from library (asset has library-asset- prefix)
      if (activeId.startsWith("library-asset-")) {
        // Get asset from drag event data (more reliable than array lookup)
        const dragData = active.data.current as { asset?: Clip } | undefined;
        const assetFromData = dragData?.asset;

        // Fallback to array lookup if data is not available
        const assetId = activeId.replace("library-asset-", "");
        const asset = assetFromData || assets.find((a) => a.id === assetId);

        if (!asset) return;

        // Find the target track
        const targetTrack = tracks.find((t) => t.id === overId);
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

      // Handle track reordering (check if dragging a track)
      const sourceTrackForReorder = tracks.find((t) => t.id === activeId);
      if (sourceTrackForReorder) {
        // This is a track being dragged
        const targetTrackForReorder = tracks.find((t) => t.id === overId);
        if (
          targetTrackForReorder &&
          sourceTrackForReorder.id !== targetTrackForReorder.id
        ) {
          // Reorder tracks
          const oldIndex = tracks.findIndex((t) => t.id === activeId);
          const newIndex = tracks.findIndex((t) => t.id === overId);

          if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
            setTracks((prevTracks) =>
              arrayMove([...prevTracks], oldIndex, newIndex)
            );
          }
        }
        return;
      }

      // Handle timeline clip reordering within tracks
      const sourceTrack = tracks.find((t) =>
        t.clips.some((c) => c.id === activeId)
      );
      if (!sourceTrack) return;

      const clip = sourceTrack.clips.find((c) => c.id === activeId);
      if (!clip) return;

      // Check if dropping on another clip in the same track (reordering within same track)
      const targetClipInSameTrack = sourceTrack.clips.find(
        (c) => c.id === overId
      );
      if (targetClipInSameTrack) {
        // Reorder clips within the same track using arrayMove
        const oldIndex = sourceTrack.clips.findIndex((c) => c.id === activeId);
        const newIndex = sourceTrack.clips.findIndex((c) => c.id === overId);

        if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
          setTracks((prevTracks) => {
            return prevTracks.map((track) => {
              if (track.id === sourceTrack.id) {
                const reorderedClips = arrayMove(
                  [...track.clips],
                  oldIndex,
                  newIndex
                );
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
      const targetTrack = tracks.find((t) => t.id === overId);
      if (targetTrack) {
        // Check if clip type is compatible with target track type
        const clipTypeForMatching = clip.type === "image" ? "video" : clip.type;
        if (targetTrack.type === clipTypeForMatching) {
          // Calculate end position of target track (after all existing clips)
          // Exclude the clip being moved from the calculation if it's already in the target track
          const clipsToConsider = targetTrack.clips.filter((c) => c.id !== activeId);
          let dropFrame = 0;
          if (clipsToConsider.length > 0) {
            // Find the maximum end frame of all clips in the target track (excluding the one being moved)
            const maxEndFrame = Math.max(
              ...clipsToConsider.map((c) => (c.startFrame || 0) + c.durationInFrames)
            );
            dropFrame = maxEndFrame;
          } else {
            // If track is empty (or only contains the clip being moved), place at the beginning
            dropFrame = 0;
          }

          setTracks((prevTracks) => {
            const newTracks = prevTracks.map((t) => ({
              ...t,
              clips: [...t.clips],
            })); // Deep copy clips

            // Remove clip from source track
            const sourceTrackIndex = newTracks.findIndex(
              (t) => t.id === sourceTrack.id
            );
            if (sourceTrackIndex !== -1) {
              newTracks[sourceTrackIndex].clips = newTracks[
                sourceTrackIndex
              ].clips.filter((c) => c.id !== activeId);
              // Don't recalculate - allow gaps
            }

            // Add clip to target track at the end (after all existing clips)
            const targetTrackIndex = newTracks.findIndex(
              (t) => t.id === targetTrack.id
            );
            if (targetTrackIndex !== -1) {
              // Remove the clip from target track first if it's already there (moving back to original track)
              newTracks[targetTrackIndex].clips = newTracks[targetTrackIndex].clips.filter(
                (c) => c.id !== activeId
              );
              
              // Recalculate end position after removing the clip
              const remainingClips = newTracks[targetTrackIndex].clips;
              if (remainingClips.length > 0) {
                const maxEndFrame = Math.max(
                  ...remainingClips.map((c) => (c.startFrame || 0) + c.durationInFrames)
                );
                dropFrame = maxEndFrame;
              } else {
                dropFrame = 0;
              }
              
              const clipToMove = { ...clip, startFrame: dropFrame };
              newTracks[targetTrackIndex].clips = [
                ...newTracks[targetTrackIndex].clips,
                clipToMove,
              ];
              // Don't recalculate - allow clips to be at any position
            }
            return newTracks;
          });
          setDragPosition(null);
        }
        return;
      }

      // Check if dropping on a clip in another track (place at end of track)
      const targetClipInOtherTrack = tracks.find((t) => t.clips.some((c) => c.id === overId));
      
      if (targetClipInOtherTrack && targetClipInOtherTrack.id !== sourceTrack.id) {
        const targetClip = targetClipInOtherTrack.clips.find((c) => c.id === overId);
        if (targetClip) {
          // Check if clip type is compatible with target track type
          const clipTypeForMatching = clip.type === "image" ? "video" : clip.type;
          if (targetClipInOtherTrack.type === clipTypeForMatching) {
            setTracks((prevTracks) => {
              const newTracks = prevTracks.map((t) => ({
                ...t,
                clips: [...t.clips],
              })); // Deep copy clips

              // Remove clip from source track
              const sourceTrackIndex = newTracks.findIndex(
                (t) => t.id === sourceTrack.id
              );
              if (sourceTrackIndex !== -1) {
                newTracks[sourceTrackIndex].clips = newTracks[
                  sourceTrackIndex
                ].clips.filter((c) => c.id !== activeId);
                // Don't recalculate - allow gaps
              }

              // Add clip to target track at the end (after all existing clips)
              const targetTrackIndex = newTracks.findIndex(
                (t) => t.id === targetClipInOtherTrack.id
              );
              if (targetTrackIndex !== -1) {
                // Remove the clip from target track first if it's already there (moving back to original track)
                newTracks[targetTrackIndex].clips = newTracks[targetTrackIndex].clips.filter(
                  (c) => c.id !== activeId
                );
                
                // Calculate end position after removing the clip
                const remainingClips = newTracks[targetTrackIndex].clips;
                let dropFrame = 0;
                if (remainingClips.length > 0) {
                  const maxEndFrame = Math.max(
                    ...remainingClips.map((c) => (c.startFrame || 0) + c.durationInFrames)
                  );
                  dropFrame = maxEndFrame;
                } else {
                  dropFrame = 0;
                }
                
                const clipToMove = { ...clip, startFrame: dropFrame };
                newTracks[targetTrackIndex].clips = [
                  ...newTracks[targetTrackIndex].clips,
                  clipToMove,
                ];
                // Don't recalculate - allow clips to be at any position
              }
              return newTracks;
            });
            setDragPosition(null);
          }
        }
        return;
      }
    },
    [assets, tracks, addClipToTimeline, recalculateStartFrames]
  );

  // Handle text modal confirm
  const handleTextConfirm = useCallback(
    (text: string) => {
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
    },
    [addClipToTimeline, pendingTextClip]
  );

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
    setAssets((prev) => [...prev, clip]);
  }, []);

  // Handle file upload for track + button
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [pendingFileUpload, addClipToTimeline]
  );

  // Open file upload dialog for track
  const handleOpenFileUpload = useCallback(
    (trackId: string, trackType: string) => {
      setPendingFileUpload({ trackId, trackType });
      fileInputRef.current?.click();
    },
    []
  );

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

  // Handle clip resize from renderer
  const handleClipResize = useCallback(
    (
      clipId: string,
      newDurationInFrames: number,
      newScaleX?: number,
      newScaleY?: number
    ) => {
      setTracks((prevTracks) => {
        return prevTracks.map((track) => {
          const clipIndex = track.clips.findIndex((c) => c.id === clipId);
          if (clipIndex === -1) return track;

          const updatedClips = [...track.clips];
          const updatedClip = {
            ...updatedClips[clipIndex],
            durationInFrames: Math.max(1, newDurationInFrames),
          };

          // Update scale if provided
          if (newScaleX !== undefined) {
            updatedClip.scaleX = newScaleX;
          }
          if (newScaleY !== undefined) {
            updatedClip.scaleY = newScaleY;
          }

          updatedClips[clipIndex] = updatedClip;

          // Recalculate startFrames after duration change
          return {
            ...track,
            clips: recalculateStartFrames(updatedClips),
          };
        });
      });
    },
    [recalculateStartFrames]
  );

  // Update playhead position for visual feedback during playback
  // Use a very throttled interval to minimize interference with video playback
  // Update less frequently and use requestAnimationFrame for better timing
  useEffect(() => {
    if (!isPlaying) return;

    let rafId: number;
    let lastUpdateTime = performance.now();
    const updateInterval = 200; // Update every 200ms (5 times per second) - much less frequent

    const updateFrame = (currentTime: number) => {
      const elapsed = currentTime - lastUpdateTime;

      if (elapsed >= updateInterval) {
        try {
          // Only READ the player's current frame - don't try to control it
          const playerFrame = (playerRef.current as any)?.getCurrentFrame?.();
          if (playerFrame !== null && playerFrame !== undefined) {
            const clampedFrame = Math.max(
              0,
              Math.min(Math.floor(playerFrame), totalFrames - 1)
            );

            // Only update if frame actually changed significantly to minimize re-renders
            setCurrentFrame((prev) => {
              // Only update if frame changed by at least 5 frames to reduce update frequency
              if (
                Math.abs(prev - clampedFrame) >= 5 ||
                clampedFrame >= totalFrames - 1
              ) {
                if (clampedFrame >= totalFrames - 1) {
                  handleReset();
                  return 0;
                }
                return clampedFrame;
              }
              return prev;
            });
          }
        } catch (e) {
          // Silently handle errors
        }

        lastUpdateTime = currentTime - (elapsed % updateInterval);
      }

      rafId = requestAnimationFrame(updateFrame);
    };

    rafId = requestAnimationFrame(updateFrame);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isPlaying, totalFrames, handleReset]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
    };
  }, []);

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        autoScroll={false}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            width: "80vw",
            backgroundColor: "#ffffff",
            overflow: "hidden",
          }}
        >
          {/* Top Section: Three Panels */}
          <div
            style={{
              display: "flex",
              height: "400px",
              borderBottom: "1px solid #e0e0e0",
            }}
          >
            {/* Left Panel: Library */}
            <div style={{ width: "280px", height: "100%" }}>
              <Library assets={assets} onAddClip={handleAddClipToLibrary} />
            </div>

            {/* Center Panel: Video Preview */}
            <div
              ref={rendererRef}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#000000",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "8px",
                  color: "#ffffff",
                  fontSize: "12px",
                  zIndex: 10,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                }}
              >
                1.00
              </div>
              {/* Exit Fullscreen button - only visible in fullscreen mode */}
              {isFullscreen && (
                <button
                  onClick={handleExitFullscreen}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.3)",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    color: "#ffffff",
                    zIndex: 20,
                    transition: "all 0.2s",
                  }}
                  title="Exit Fullscreen"
                >
                  ✕
                </button>
              )}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  aspectRatio: "16 / 9",
                  maxHeight: "100%",
                  maxWidth: "100%",
                }}
              >
                <Player
                  ref={playerRef}
                  component={TimelineComposition}
                  inputProps={{ tracks, selectedClipId }}
                  durationInFrames={totalFrames}
                  fps={30}
                  compositionWidth={1280}
                  compositionHeight={720}
                  // controls={true}
                  style={{
                    width: "100%",
                    height: "100%",
                    maxWidth: "100%",
                    maxHeight: "100%",
                  }}
                />
                <ClipResizeOverlay
                  selectedClip={selectedClip}
                  tracks={tracks}
                  fps={30}
                  currentFrame={currentFrame}
                  totalFrames={totalFrames}
                  compositionWidth={1280}
                  compositionHeight={720}
                  onResize={handleClipResize}
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
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
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
       {activeDragAsset && <DragOverlay>
          {activeDragAsset ? (
            <div
              style={{
                padding: '4px',
                border: '1.5px solid #4a9eff',
                borderRadius: '3px',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                minWidth: '50px',
                opacity: 0.9,
                transform: 'rotate(5deg)',
              }}
            >
              {activeDragAsset.type === 'image' && activeDragAsset.src && (
                <img
                  src={activeDragAsset.src}
                  alt={activeDragAsset.name}
                  style={{
                    width: '30px',
                    height: '20px',
                    objectFit: 'cover',
                    borderRadius: '2px',
                    marginBottom: '2px',
                  }}
                />
              )}
              {activeDragAsset.type === 'video' && activeDragAsset.src && (
                <div
                  style={{
                    width: '30px',
                    height: '20px',
                    backgroundColor: '#000000',
                    borderRadius: '2px',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '8px',
                  }}
                >
                  ▶
                </div>
              )}
              {activeDragAsset.type === 'audio' && (
                <div
                  style={{
                    width: '30px',
                    height: '20px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '2px',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                  }}
                >
                  🎵
                </div>
              )}
              {activeDragAsset.type === 'text' && (
                <div
                  style={{
                    width: '30px',
                    height: '20px',
                    backgroundColor: '#e8f2ff',
                    borderRadius: '2px',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    color: '#1a1a1a',
                  }}
                >
                  T
                </div>
              )}
              <p style={{
                margin: 0,
                fontSize: '8px',
                fontWeight: 500,
                color: '#1a1a1a',
                marginBottom: '1px',
                lineHeight: '1.2',
              }}>
                {activeDragAsset.name?.slice(0, 8)}
              </p>
              <span style={{
                fontSize: '7px',
                color: '#666',
                textTransform: 'capitalize',
              }}>
                {activeDragAsset.type}
              </span>
            </div>
          ) : null}
        </DragOverlay>}
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
        style={{ display: "none" }}
      />
    </>
  );
};
