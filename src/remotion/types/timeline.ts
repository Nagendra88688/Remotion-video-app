export type ClipType = "image" | "video" | "text" | "audio";

export type Clip = {
  id: string;
  type: ClipType;
  src?: string;
  text?: string;
  startFrame?: number;          // ⬅ WHEN it starts
  durationInFrames: number;
  name?: string;
  scaleX?: number;               // Horizontal scale (default: 1)
  scaleY?: number;               // Vertical scale (default: 1)
  x?: number;                     // X position in renderer (default: 0, centered)
  y?: number;                     // Y position in renderer (default: 0, centered)
};

export type Track = {
  id: string;
  clips: Clip[];
  name?: string;
  type?: ClipType;
};
