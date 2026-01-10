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
      {tracks.map((track, trackIndex) =>
        track.clips.map((clip) => (
          <Sequence
            key={clip.id}
            from={clip.startFrame}
            durationInFrames={clip.durationInFrames}
          >
            {/* IMPORTANT: no AbsoluteFill wrapper */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: tracks.length - 1 - trackIndex,
                pointerEvents: "none",
                border: selectedClipId === clip.id ? "3px solid #4a9eff" : "none",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {clip.type === "video" && (
                <Video src={clip.src!} />
              )}

              {clip.type === "image" && (
                <Img src={clip.src!} />
              )}

              {clip.type === "audio" && (
                <Audio src={clip.src!} />
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
            </div>
          </Sequence>
        ))
      )}
    </AbsoluteFill>
  );
};
