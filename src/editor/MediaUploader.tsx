import type { Clip } from "../remotion/types/timeline";

interface Props {
  onAddClip: (clip: Clip) => void;
}

export const MediaUploader = ({ onAddClip }: Props) => {
  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);

    const baseClip = {
      id: crypto.randomUUID(),
      startFrame: 0,                 // ✅ REQUIRED
      durationInFrames: 90,
    };

    if (file.type.startsWith("image")) {
      onAddClip({
        ...baseClip,
        type: "image",
        src: url,
        name: file?.name,
      });
    }

    if (file.type.startsWith("video")) {
      onAddClip({
        ...baseClip,
        type: "video",
        src: url,
        durationInFrames: 150,
        name: file?.name,
      });
    }

    if (file.type.startsWith("audio")) {
      onAddClip({
        ...baseClip,
        type: "audio",
        src: url,
        durationInFrames: 300,
        name: file?.name,
      });
    }
  };

  return (
    <input
      type="file"
      multiple
      accept="image/*,video/*,audio/*"
      onChange={(e) => {
        if (!e.target.files) return;
        Array.from(e.target.files).forEach(handleFile);
      }}
    />
  );
};
