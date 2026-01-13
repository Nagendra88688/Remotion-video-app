import { useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  OffthreadVideo,
  Img,
  Html5Audio,
  // Video,
} from "remotion";
import {Video} from '@remotion/media';
import type { Track } from "../remotion/types/timeline";

export const TimelineComposition = ({
  tracks,
  selectedClipId,
}: {
  tracks: Track[];
  selectedClipId: string | null;
}) => {
  // Flatten all clips from all tracks into a single array
  const allClips = useMemo(() => {
    return tracks.flatMap((track, trackIndex) => {
      // Sort clips by startFrame to ensure proper rendering order
      const sortedClips = [...track.clips]
        .filter(clip => {
          // Filter out clips missing essential properties, but be lenient with src check
          if (clip.type === "video" && !clip.src) return false;
          if (clip.type === "audio" && !clip.src) return false;
          if (clip.type === "text" && !clip.text) return false;
          // For images, allow rendering even if src check is iffy - we'll show error in render
          return true;
        })
        .sort((a, b) => (a.startFrame || 0) - (b.startFrame || 0));
      console.log({test: track});
      
      return sortedClips.map((clip, clipIndex) => ({ clip, trackIndex, clipIndex }));
    });
  }, [tracks]);
  console.log({allClips});
  
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {allClips.map(({ clip, trackIndex, clipIndex }) => {
          // Ensure startFrame is defined and valid
          const startFrame = clip.startFrame ?? 0;
          const durationInFrames = clip.durationInFrames ?? 90;
          
          // Calculate unique z-index: base z-index per track + clip index within track
          // This ensures clips from the same track are properly layered
          const baseZIndex = (tracks.length - 1 - trackIndex) * 1000;
          const clipZIndex = baseZIndex + clipIndex;
          
          return (
            <Sequence
              key={clip.id}
              from={startFrame}
              durationInFrames={durationInFrames}
              premountFor={30}
            >
              <AbsoluteFill
                style={{
                  zIndex: clipZIndex,
                  pointerEvents: "none",
                  border: selectedClipId === clip.id ? "3px solid #4a9eff" : "none",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  transform: `translate(${clip.x ?? 0}px, ${clip.y ?? 0}px) scale(${clip.scaleX ?? 1}, ${clip.scaleY ?? 1})`,
                  transformOrigin: "center center",
                  }}
                >
                  {clip.type === "video" && clip.src && (
                  <Video 
                    src={clip.src}
                    volume={1}
                    muted={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                )}

                {clip.type === "image" && (
                  clip.src ? (
                    <Img 
                      src={clip.src} 
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div style={{ color: "yellow", padding: 20, backgroundColor: "rgba(255,0,0,0.5)" }}>
                      Image clip missing src: {clip.id || "unknown"}
                    </div>
                  )
                )}

                {clip.type === "audio" && clip.src && (
                  <Html5Audio src={clip.src} />
                )}

                {clip.type === "text" && (
                  <div
                    style={{
                      color: "white",
                      fontSize: 80,
                      textAlign: "center",
                      marginTop: 200,
                    }}
                  >
                    {clip.text}
                  </div>
                )}

              {/* Resize handles for selected clip */}
              {selectedClipId === clip.id && (
                <>
                  {/* Corner handles */}
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      left: -6,
                      width: 12,
                      height: 12,
                      background: "#4a9eff",
                      border: "2px solid white",
                      borderRadius: "2px",
                      cursor: "nwse-resize",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 12,
                      height: 12,
                      background: "#4a9eff",
                      border: "2px solid white",
                      borderRadius: "2px",
                      cursor: "nesw-resize",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -6,
                      left: -6,
                      width: 12,
                      height: 12,
                      background: "#4a9eff",
                      border: "2px solid white",
                      borderRadius: "2px",
                      cursor: "nesw-resize",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -6,
                      right: -6,
                      width: 12,
                      height: 12,
                      background: "#4a9eff",
                      border: "2px solid white",
                      borderRadius: "2px",
                      cursor: "nwse-resize",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Edge handles */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: -6,
                      width: 12,
                      height: 40,
                      background: "#4a9eff",
                      border: "2px solid white",
                      borderRadius: "2px",
                      cursor: "ew-resize",
                      pointerEvents: "none",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: -6,
                      width: 12,
                      height: 40,
                      background: "#4a9eff",
                      border: "2px solid white",
                      borderRadius: "2px",
                      cursor: "ew-resize",
                      pointerEvents: "none",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      left: "50%",
                      width: 40,
                      height: 12,
                      background: "#4a9eff",
                      border: "2px solid white",
                      borderRadius: "2px",
                      cursor: "ns-resize",
                      pointerEvents: "none",
                      transform: "translateX(-50%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -6,
                      left: "50%",
                      width: 40,
                      height: 12,
                      background: "#4a9eff",
                      border: "2px solid white",
                      borderRadius: "2px",
                      cursor: "ns-resize",
                      pointerEvents: "none",
                      transform: "translateX(-50%)",
                    }}
                  />
                </>
              )}
              </AbsoluteFill>
            </Sequence>
          );
        })}
    </AbsoluteFill>
  );
};
