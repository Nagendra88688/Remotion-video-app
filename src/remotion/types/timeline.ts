export type ClipType = "image" | "video" | "text" | "audio";

export type Clip = {
  id: string;
  type: ClipType;
  src?: string;
  text?: string;
  startFrame?: number;          // ⬅ WHEN it starts
  durationInFrames: number;
  name?: string;
};

export type Track = {
  id: string;
  clips: Clip[];
  name?: string;
  type?: ClipType;
};
