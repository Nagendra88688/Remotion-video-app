import { useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { Timeline } from "./Timeline";
import { TimelineComposition } from "../remotion/TimelineComposition"


import type { Clip, Track } from "../remotion/types/timeline";
import { MediaUploader } from "./MediaUploader";

export const EditorPage = () => {
  const [clips, setClips] = useState<Clip[]>([
    {
      id: "1",
      type: "image",
      src: "https://img.freepik.com/free-photo/anime-car-city_23-2151710982.jpg?semt=ais_hybrid&w=740&q=80",
      name: "Carpic",
      durationInFrames: 90,
    },
    {
      id: "2",
      type: "text",
      text: "Hello World",
      durationInFrames: 60,
      name: "Hello world",
    },
    {
      id: "3",
      type: "image",
      name: "Bikepic",
      src: "https://static.vecteezy.com/system/resources/thumbnails/023/131/083/small/black-sport-bike-illustration-ai-generative-free-photo.jpg",
      durationInFrames: 90,
    },
  ]);

  const [tracks, setTracks] = useState<Track[]>([
    {
      id: "overlay-track-1",
      clips: [],
    },
    {
      id: "overlay-track-2",
      clips: [],
    },
    {
      id: "base-track",
      clips: [],
    },
  ]);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  
  

  const totalFrames = useMemo(
    () => clips.reduce((a, c) => a + c.durationInFrames, 0),
    [clips]
  );

  const addClipToTimeline = (clip: Clip) => {
    setTracks((prev) => {
      // Always add uploaded media to the BASE track (last track)
      const baseTrack = prev[prev.length - 1];
      
      // Calculate startFrame for the new clip (after all existing clips)
      const startFrame = baseTrack.clips.length === 0
        ? 0
        : baseTrack.clips.reduce((sum, c) => sum + (c.durationInFrames || 0), 0);
  
      return [
        ...prev.slice(0, prev.length - 1),
        {
          ...baseTrack,
          clips: [...baseTrack.clips, { ...clip, startFrame }],
        },
      ];
    });
  };
  

  return (
    <div style={{ padding: 20 }}>
        <MediaUploader
        onAddClip={addClipToTimeline}
        />

      <Player
        component={TimelineComposition}
        inputProps={{ tracks, selectedClipId }}
        durationInFrames={totalFrames}
        fps={30}
        compositionWidth={1280}
        compositionHeight={720}
        controls
      />

      <Timeline 
        tracks={tracks}
        setTracks={setTracks}
        fps={30}
        selectedClipId={selectedClipId}
        onClipSelect={setSelectedClipId}
      />
    </div>
  );
};
