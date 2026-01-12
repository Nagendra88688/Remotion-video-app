import { useState, useEffect, useRef } from "react";

interface PlaybackControlsProps {
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onFullscreen?: () => void;
  isPlaying?: boolean;
  rendererRef?: React.RefObject<HTMLDivElement | null>;
}

export const PlaybackControls = ({
  onPlay,
  onPause,
  onReset,
  onFullscreen,
  isPlaying = false,
  rendererRef,
}: PlaybackControlsProps) => {
  const [playing, setPlaying] = useState(isPlaying);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync internal playing state with isPlaying prop
  useEffect(() => {
    setPlaying(isPlaying);
  }, [isPlaying]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handlePlayPause = () => {
    if (playing) {
      onPause?.();
    } else {
      onPlay?.();
    }
    setPlaying(!playing);
  };

  const handleFullscreen = async () => {
    const element = rendererRef?.current || document.documentElement;
    
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
      onFullscreen?.();
    } catch (err) {
      console.error("Error attempting to toggle fullscreen:", err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '12px 0px 12px 300px',
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
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? "🗗" : "⛶"}
      </button>

      {/* Exit Fullscreen button - only visible in fullscreen mode */}
      {isFullscreen && (
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
            transition: 'all 0.2s',
            marginLeft: '8px'
          }}
          title="Exit Fullscreen"
        >
          ✕
        </button>
      )}
    </div>
  );
};
