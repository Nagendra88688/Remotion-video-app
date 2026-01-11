import {
  AbsoluteFill,
  Sequence,
  Video,
  Img,
  Audio,
} from "remotion";
import type { Track } from "../remotion/types/timeline";

export const TimelineComposition = ({
  tracks,
  selectedClipId,
}: {
  tracks: Track[];
  selectedClipId: string | null;
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {tracks.map((track, trackIndex) => {
        // Sort clips by startFrame to ensure proper rendering order
        const sortedClips = [...track.clips]
          .filter(clip => {
            // Filter out clips missing essential properties, but be lenient with src check
            if (clip.type === "video" && !clip.src) return false;
            if (clip.type === "audio" && !clip.src) return false;
            // For images, allow rendering even if src check is iffy - we'll show error in render
            return true;
          })
          .sort((a, b) => (a.startFrame || 0) - (b.startFrame || 0));
        
        return sortedClips.map((clip) => {
          // Ensure startFrame is defined and valid
          const startFrame = clip.startFrame ?? 0;
          const durationInFrames = clip.durationInFrames ?? 90;
          
          
          return (
            <Sequence
              key={clip.id}
              from={startFrame}
              durationInFrames={durationInFrames}
            >
              <AbsoluteFill
                style={{
                  zIndex: tracks.length - 1 - trackIndex,
                  pointerEvents: "none",
                  border: selectedClipId === clip.id ? "3px solid #4a9eff" : "none",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {clip.type === "video" && clip.src && (
                  <Video 
                    src={clip.src}
                    startFrom={0}
                    volume={1}
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
                  <Audio src={clip.src} />
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
        });
      })}
    </AbsoluteFill>
  );
};
