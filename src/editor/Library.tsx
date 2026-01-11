import { useState, useRef } from "react";
import type { Clip } from "../remotion/types/timeline";

interface LibraryProps {
  assets: Clip[];
  onAddClip: (clip: Clip) => void;
}

export const Library = ({ assets, onAddClip }: LibraryProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const baseClip = {
        id: crypto.randomUUID(),
        startFrame: 0,
        durationInFrames: 90,
        name: file.name,
      };

      if (file.type.startsWith("image")) {
        onAddClip({
          ...baseClip,
          type: "image",
          src: url,
        });
      } else if (file.type.startsWith("video")) {
        // Create video element to detect actual duration
        const video = document.createElement("video");
        video.src = url;
        video.preload = "metadata";
        
        video.onloadedmetadata = () => {
          // Calculate duration in frames at 30fps
          const durationInSeconds = video.duration || 0;
          const durationInFrames = Math.ceil(durationInSeconds * 30); // 30fps
          
          onAddClip({
            ...baseClip,
            type: "video",
            src: url,
            durationInFrames: durationInFrames || 300, // Fallback to 10 seconds (300 frames) if can't detect
          });
        };
        
        video.onerror = () => {
          // Fallback if video metadata can't be loaded
          onAddClip({
            ...baseClip,
            type: "video",
            src: url,
            durationInFrames: 300, // Default to 10 seconds (300 frames)
          });
        };
        
        // Trigger metadata load
        video.load();
      } else if (file.type.startsWith("audio")) {
        onAddClip({
          ...baseClip,
          type: "audio",
          src: url,
          durationInFrames: 300,
        });
      }
    });
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    
    const url = urlInput.trim();
    const extension = url.split('.').pop()?.toLowerCase();
    
    const baseClip = {
      id: crypto.randomUUID(),
      startFrame: 0,
      durationInFrames: 90,
      name: url.split('/').pop() || "Asset",
    };

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      onAddClip({
        ...baseClip,
        type: "image",
        src: url,
      });
    } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension || '')) {
      // Create video element to detect actual duration
      const video = document.createElement("video");
      video.src = url;
      video.preload = "metadata";
      video.crossOrigin = "anonymous"; // In case of CORS issues
      
      video.onloadedmetadata = () => {
        // Calculate duration in frames at 30fps
        const durationInSeconds = video.duration || 0;
        const durationInFrames = Math.ceil(durationInSeconds * 30); // 30fps
        
        onAddClip({
          ...baseClip,
          type: "video",
          src: url,
          durationInFrames: durationInFrames || 300, // Fallback to 10 seconds if can't detect
        });
      };
      
      video.onerror = () => {
        // Fallback if video metadata can't be loaded (CORS or other issues)
        onAddClip({
          ...baseClip,
          type: "video",
          src: url,
          durationInFrames: 300, // Default to 10 seconds (300 frames)
        });
      };
      
      // Trigger metadata load
      video.load();
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
      onAddClip({
        ...baseClip,
        type: "audio",
        src: url,
        durationInFrames: 300,
      });
    }
    
    setUrlInput("");
    setShowUrlInput(false);
  };

  return (
    <div style={{ 
      width: '90%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e0e0e0',
      padding: '16px'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#1a1a1a',
          marginBottom: '4px'
        }}>
          Library
        </h2>
        <p style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: '#666',
          marginBottom: '12px'
        }}>
          {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '16px' 
      }}>
        {/* <button
          onClick={() => setShowUrlInput(!showUrlInput)}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>🔗</span>
          URL
        </button> */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>⬆</span>
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      {showUrlInput && (
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter asset URL..."
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d0d0d0',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginTop: '8px' 
          }}>
            <button
              onClick={handleUrlSubmit}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: '#4a9eff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowUrlInput(false);
                setUrlInput("");
              }}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: '#f5f5f5',
                color: '#1a1a1a',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {assets.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #d0d0d0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: "20px",
          overflow: 'auto',
        }}>
          <p style={{ 
            margin: 0, 
            color: '#999', 
            fontSize: '14px', 
            textAlign: 'center' 
          }}>
            No assets in library. Upload files to get started.
          </p>
        </div>
      ) : (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '210px',
          border: '1px solid #f4f4f4',
          padding: '8px',
        }}>
          {assets.map((asset) => (
            <div
              key={asset.id}
              style={{
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                marginBottom: '8px',
                backgroundColor: '#fafafa',
                cursor: 'pointer'
              }}
            >
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                fontWeight: 500,
                color: '#1a1a1a',
                marginBottom: '4px'
              }}>
                {asset.name}
              </p>
              <span style={{ 
                fontSize: '12px', 
                color: '#666',
                textTransform: 'capitalize'
              }}>
                {asset.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
