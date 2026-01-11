import { useState, useEffect } from "react";

interface PlaybackControlsProps {
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onFullscreen?: () => void;
  isPlaying?: boolean;
}

export const PlaybackControls = ({
  onPlay,
  onPause,
  onReset,
  onFullscreen,
  isPlaying = false,
}: PlaybackControlsProps) => {
  const [playing, setPlaying] = useState(isPlaying);

  // Sync internal playing state with isPlaying prop
  useEffect(() => {
    setPlaying(isPlaying);
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (playing) {
      onPause?.();
    } else {
      onPlay?.();
    }
    setPlaying(!playing);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
    onFullscreen?.();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '12px 0',
      backgroundColor: '#f5f5f5',
      borderTop: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
      position: 'relative'
    }}>
      {/* Vertical ellipsis menu */}
      {/* <button
        onClick={() => {}}
        style={{
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '18px',
          color: '#666'
        }}
        title="More options"
      >
        ⋮
      </button> */}

      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid #d0d0d0',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: '#1a1a1a',
          transition: 'all 0.2s'
        }}
        title={playing ? "Pause" : "Play"}
      >
        {playing ? "⏸" : "▶"}
      </button>

      {/* Reset button */}
      <button
        onClick={onReset}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid #d0d0d0',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: '#666',
          transition: 'all 0.2s'
        }}
        title="Reset to beginning"
      >
        ⏮
      </button>

      {/* Fullscreen button */}
      <button
        onClick={handleFullscreen}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid #d0d0d0',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: '#666',
          transition: 'all 0.2s'
        }}
        title="Fullscreen"
      >
        ⛶
      </button>
    </div>
  );
};
