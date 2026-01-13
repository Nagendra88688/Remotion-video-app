import { useState, useRef, useEffect } from "react";
import type { Clip, Track } from "../remotion/types/timeline";

interface ClipResizeOverlayProps {
  selectedClip: Clip | null;
  tracks: Track[];
  fps: number;
  currentFrame: number;
  totalFrames: number;
  compositionWidth: number;
  compositionHeight: number;
  isPlaying: boolean;
  onResize: (clipId: string, newDurationInFrames: number, newScaleX?: number, newScaleY?: number, newX?: number, newY?: number) => void;
}

export const ClipResizeOverlay = ({
  selectedClip,
  tracks,
  fps,
  currentFrame,
  totalFrames,
  compositionWidth,
  compositionHeight,
  isPlaying,
  onResize,
}: ClipResizeOverlayProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'right' | 'left' | 'top' | 'bottom' | 'corner' | null>(null);
  const [initialDuration, setInitialDuration] = useState(0);
  const [initialFrame, setInitialFrame] = useState(0);
  const [initialScaleX, setInitialScaleX] = useState(1);
  const [initialScaleY, setInitialScaleY] = useState(1);
  const [initialX, setInitialX] = useState(0);
  const [initialY, setInitialY] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(1); // Store aspect ratio to maintain it
  const [dragOffsetX, setDragOffsetX] = useState(0); // Local state for smooth visual feedback during drag
  const [dragOffsetY, setDragOffsetY] = useState(0); // Local state for smooth visual feedback during drag
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragUpdateRef = useRef<{ x: number; y: number } | null>(null); // Store pending updates
  const rafIdRef = useRef<number | null>(null); // Store RAF ID for cleanup

  // Find which track contains the selected clip
  const track = selectedClip ? tracks.find(t => t.clips.some(c => c.id === selectedClip.id)) : null;
  
  const startFrame = selectedClip?.startFrame ?? 0;
  const durationInFrames = selectedClip?.durationInFrames ?? 90;
  const endFrame = startFrame + durationInFrames;
  const scaleX = selectedClip?.scaleX ?? 1;
  const scaleY = selectedClip?.scaleY ?? 1;
  const clipX = selectedClip?.x ?? 0; // X position (0 = centered)
  const clipY = selectedClip?.y ?? 0; // Y position (0 = centered)

  // Calculate if the clip is currently visible at currentFrame
  const isClipVisibleAtFrame = selectedClip ? (currentFrame >= startFrame && currentFrame < endFrame) : false;
  // Show resize borders when clip is selected and visible, but hide during playback
  const shouldShowBorders = selectedClip && !isPlaying && isClipVisibleAtFrame;

  // Calculate position and size of the clip in the renderer
  // The clip is centered by default, but can be moved with x and y offsets
  const clipWidth = compositionWidth;
  const clipHeight = compositionHeight;
  // Calculate the actual position: center + offset + drag offset (for smooth visual feedback)
  const currentX = clipX + (isDragging ? dragOffsetX : 0);
  const currentY = clipY + (isDragging ? dragOffsetY : 0);
  const clipLeft = (compositionWidth / 2) + currentX - (clipWidth / 2);
  const clipTop = (compositionHeight / 2) + currentY - (clipHeight / 2);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, handle: 'right' | 'left' | 'top' | 'bottom' | 'corner') => {
    if (!selectedClip) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setInitialDuration(durationInFrames);
    setInitialFrame(currentFrame);
    setInitialScaleX(scaleX);
    setInitialScaleY(scaleY);
    // Calculate and store aspect ratio to maintain it during resize
    const currentAspectRatio = scaleY !== 0 ? scaleX / scaleY : 1;
    setAspectRatio(currentAspectRatio);
  };

  // Handle resize during drag
  useEffect(() => {
    if (!isResizing || !resizeHandle || !selectedClip) return;

    let startMouseX = 0;
    let startMouseY = 0;
    let hasStarted = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!overlayRef.current || !selectedClip) return;

      if (!hasStarted) {
        const rect = overlayRef.current.getBoundingClientRect();
        if (resizeHandle === 'right') {
          startMouseX = rect.left + clipWidth;
          startMouseY = rect.top + clipHeight / 2;
        } else if (resizeHandle === 'left') {
          startMouseX = rect.left;
          startMouseY = rect.top + clipHeight / 2;
        } else if (resizeHandle === 'bottom') {
          startMouseX = rect.left + clipWidth / 2;
          startMouseY = rect.top + clipHeight;
        } else if (resizeHandle === 'top') {
          startMouseX = rect.left + clipWidth / 2;
          startMouseY = rect.top;
        } else if (resizeHandle === 'corner') {
          startMouseX = rect.left + clipWidth;
          startMouseY = rect.top + clipHeight;
        }
        hasStarted = true;
      }

      const currentMouseX = e.clientX;
      const currentMouseY = e.clientY;
      const deltaX = currentMouseX - startMouseX;
      const deltaY = currentMouseY - startMouseY;
      
      // Calculate scale change based on mouse movement
      // Maintain aspect ratio for all resize operations
      let newScaleX = initialScaleX;
      let newScaleY = initialScaleY;
      
      if (resizeHandle === 'right' || resizeHandle === 'left') {
        // Horizontal resize - change scaleX, maintain aspect ratio for scaleY
        const scaleDelta = resizeHandle === 'left' 
          ? -(deltaX / compositionWidth) * 2
          : (deltaX / compositionWidth) * 2;
        newScaleX = Math.max(0.1, Math.min(3, initialScaleX + scaleDelta));
        // Maintain aspect ratio: scaleY = scaleX / aspectRatio
        newScaleY = newScaleX / aspectRatio;
        // Clamp scaleY to valid range
        newScaleY = Math.max(0.1, Math.min(3, newScaleY));
        // Recalculate scaleX to maintain exact ratio if scaleY was clamped
        if (newScaleY === 3 || newScaleY === 0.1) {
          newScaleX = newScaleY * aspectRatio;
          newScaleX = Math.max(0.1, Math.min(3, newScaleX));
        }
      } else if (resizeHandle === 'top' || resizeHandle === 'bottom') {
        // Vertical resize - change scaleY, maintain aspect ratio for scaleX
        const scaleDelta = resizeHandle === 'top'
          ? -(deltaY / compositionHeight) * 2
          : (deltaY / compositionHeight) * 2;
        newScaleY = Math.max(0.1, Math.min(3, initialScaleY + scaleDelta));
        // Maintain aspect ratio: scaleX = scaleY * aspectRatio
        newScaleX = newScaleY * aspectRatio;
        // Clamp scaleX to valid range
        newScaleX = Math.max(0.1, Math.min(3, newScaleX));
        // Recalculate scaleY to maintain exact ratio if scaleX was clamped
        if (newScaleX === 3 || newScaleX === 0.1) {
          newScaleY = newScaleX / aspectRatio;
          newScaleY = Math.max(0.1, Math.min(3, newScaleY));
        }
      } else if (resizeHandle === 'corner') {
        // Corner resize - use the larger delta to determine scale, maintain aspect ratio
        const scaleDeltaX = (deltaX / compositionWidth) * 2;
        const scaleDeltaY = (deltaY / compositionHeight) * 2;
        
        // Use the dominant movement direction
        const absDeltaX = Math.abs(scaleDeltaX);
        const absDeltaY = Math.abs(scaleDeltaY);
        
        if (absDeltaX > absDeltaY) {
          // Horizontal movement is dominant
          newScaleX = Math.max(0.1, Math.min(3, initialScaleX + scaleDeltaX));
          newScaleY = newScaleX / aspectRatio;
          newScaleY = Math.max(0.1, Math.min(3, newScaleY));
          if (newScaleY === 3 || newScaleY === 0.1) {
            newScaleX = newScaleY * aspectRatio;
            newScaleX = Math.max(0.1, Math.min(3, newScaleX));
          }
        } else {
          // Vertical movement is dominant
          newScaleY = Math.max(0.1, Math.min(3, initialScaleY + scaleDeltaY));
          newScaleX = newScaleY * aspectRatio;
          newScaleX = Math.max(0.1, Math.min(3, newScaleX));
          if (newScaleX === 3 || newScaleX === 0.1) {
            newScaleY = newScaleX / aspectRatio;
            newScaleY = Math.max(0.1, Math.min(3, newScaleY));
          }
        }
      }
      
      onResize(selectedClip.id, durationInFrames, newScaleX, newScaleY, clipX, clipY);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      hasStarted = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeHandle, initialScaleX, initialScaleY, aspectRatio, selectedClip, onResize, compositionWidth, compositionHeight, durationInFrames, clipWidth, clipHeight, clipX, clipY]);

  // Handle drag start for moving the clip
  const handleDragStart = (e: React.MouseEvent) => {
    if (!selectedClip || isResizing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setInitialX(clipX);
    setInitialY(clipY);
    setDragOffsetX(0);
    setDragOffsetY(0);
    dragUpdateRef.current = null;
  };

  // Handle drag during move - optimized with requestAnimationFrame
  useEffect(() => {
    if (!isDragging || !selectedClip || !overlayRef.current) return;

    let startMouseX = 0;
    let startMouseY = 0;
    let hasStarted = false;
    let lastUpdateTime = 0;
    const updateThrottle = 16; // ~60fps (16ms per frame) for state updates
    let pendingUpdate: { x: number; y: number } | null = null;

    // Function to apply pending state update
    const applyPendingUpdate = () => {
      if (pendingUpdate && selectedClip) {
        onResize(selectedClip.id, durationInFrames, scaleX, scaleY, pendingUpdate.x, pendingUpdate.y);
        pendingUpdate = null;
        lastUpdateTime = performance.now();
      }
      rafIdRef.current = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!overlayRef.current || !selectedClip) return;

      if (!hasStarted) {
        const rect = overlayRef.current.getBoundingClientRect();
        // Get the center of the clip content area
        startMouseX = rect.left + (compositionWidth / 2) + clipX;
        startMouseY = rect.top + (compositionHeight / 2) + clipY;
        hasStarted = true;
      }

      const currentMouseX = e.clientX;
      const currentMouseY = e.clientY;
      const deltaX = currentMouseX - startMouseX;
      const deltaY = currentMouseY - startMouseY;

      // Calculate new position (clamp to keep clip within bounds)
      const scaledWidth = clipWidth * scaleX;
      const scaledHeight = clipHeight * scaleY;
      const maxX = (compositionWidth - scaledWidth) / 2;
      const maxY = (compositionHeight - scaledHeight) / 2;
      
      const newX = Math.max(-maxX, Math.min(maxX, initialX + deltaX));
      const newY = Math.max(-maxY, Math.min(maxY, initialY + deltaY));

      // Update visual position immediately (local state, no re-render of parent)
      setDragOffsetX(newX - clipX);
      setDragOffsetY(newY - clipY);

      // Throttle actual state updates using requestAnimationFrame
      pendingUpdate = { x: newX, y: newY };
      
      const now = performance.now();
      if (now - lastUpdateTime >= updateThrottle) {
        // Update immediately if enough time has passed
        applyPendingUpdate();
      } else if (rafIdRef.current === null) {
        // Schedule update for next frame
        rafIdRef.current = requestAnimationFrame(applyPendingUpdate);
      }
    };

    const handleMouseUp = () => {
      // Final update to ensure exact position
      if (pendingUpdate && selectedClip) {
        onResize(selectedClip.id, durationInFrames, scaleX, scaleY, pendingUpdate.x, pendingUpdate.y);
        pendingUpdate = null;
      }
      setIsDragging(false);
      setDragOffsetX(0);
      setDragOffsetY(0);
      hasStarted = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isDragging, initialX, initialY, selectedClip, onResize, compositionWidth, compositionHeight, durationInFrames, scaleX, scaleY, clipWidth, clipHeight, clipX, clipY]);

  if (!shouldShowBorders) return null;

  const handleSize = 12;
  const handleOffset = 6;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: (isResizing || isDragging) ? 'auto' : 'none',
        zIndex: 1000,
      }}
    >
      {/* Border around the clip */}
      <div
        style={{
          position: 'absolute',
          left: `${clipLeft}px`,
          top: `${clipTop}px`,
          width: `${clipWidth}px`,
          height: `${clipHeight}px`,
          border: '3px solid #4a9eff',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      />

      {/* Draggable area for moving the clip (the inner content area) */}
      <div
        onMouseDown={handleDragStart}
        style={{
          position: 'absolute',
          left: `${clipLeft}px`,
          top: `${clipTop}px`,
          width: `${clipWidth}px`,
          height: `${clipHeight}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: isResizing ? 'none' : 'auto',
          zIndex: 999,
        }}
      />

      {/* Left resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'left')}
        style={{
          position: 'absolute',
          left: `${clipLeft - handleOffset}px`,
          top: `${clipTop + clipHeight / 2 - handleSize / 2}px`,
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          backgroundColor: '#4a9eff',
          border: '2px solid #ffffff',
          borderRadius: '50%',
          cursor: 'ew-resize',
          pointerEvents: 'auto',
          zIndex: 1001,
        }}
      />

      {/* Right resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'right')}
        style={{
          position: 'absolute',
          left: `${clipLeft + clipWidth - handleOffset}px`,
          top: `${clipTop + clipHeight / 2 - handleSize / 2}px`,
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          backgroundColor: '#4a9eff',
          border: '2px solid #ffffff',
          borderRadius: '50%',
          cursor: 'ew-resize',
          pointerEvents: 'auto',
          zIndex: 1001,
        }}
      />

      {/* Top resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'top')}
        style={{
          position: 'absolute',
          left: `${clipLeft + clipWidth / 2 - handleSize / 2}px`,
          top: `${clipTop - handleOffset}px`,
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          backgroundColor: '#4a9eff',
          border: '2px solid #ffffff',
          borderRadius: '50%',
          cursor: 'ns-resize',
          pointerEvents: 'auto',
          zIndex: 1001,
        }}
      />

      {/* Bottom resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        style={{
          position: 'absolute',
          left: `${clipLeft + clipWidth / 2 - handleSize / 2}px`,
          top: `${clipTop + clipHeight - handleOffset}px`,
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          backgroundColor: '#4a9eff',
          border: '2px solid #ffffff',
          borderRadius: '50%',
          cursor: 'ns-resize',
          pointerEvents: 'auto',
          zIndex: 1001,
        }}
      />

      {/* Corner resize handles */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'corner')}
        style={{
          position: 'absolute',
          left: `${clipLeft + clipWidth - handleOffset}px`,
          top: `${clipTop + clipHeight - handleOffset}px`,
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          backgroundColor: '#4a9eff',
          border: '2px solid #ffffff',
          borderRadius: '50%',
          cursor: 'nwse-resize',
          pointerEvents: 'auto',
          zIndex: 1001,
        }}
      />
    </div>
  );
};
