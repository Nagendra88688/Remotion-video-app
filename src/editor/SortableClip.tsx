import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef } from "react";
import type { Clip } from "../remotion/types/timeline";

interface SortableClipProps {
  clip: Clip;
  fps: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  pixelsPerSecond?: number;
}

export const SortableClip = ({ clip, fps, isSelected, onSelect, onDelete, pixelsPerSecond = 60 }: SortableClipProps) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({ id: clip.id });
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const isDeletingRef = useRef(false);

  // Calculate width and position based on duration and startFrame
  const durationInSeconds = clip.durationInFrames / fps;
  const startSeconds = (clip.startFrame || 0) / fps;
  const width = Math.max(durationInSeconds * pixelsPerSecond, 60); // Minimum 60px
  const left = startSeconds * pixelsPerSecond;

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${left}px`,
    top: 8,
    transform: CSS.Transform.toString(transform),
    transition,
    padding: 8,
    background: isSelected ? "#e8f2ff" : "#d9dfff",
    border: isSelected ? "2px solid #4a9eff" : "1px solid #d0d0d0",
    color: isSelected ? "#1a1a1a" : "#666",
    width: `${width}px`,
    minWidth: 60,
    textAlign: "center",
    cursor: "grab",
    height: "40px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: isSelected ? 500 : 400,
    boxShadow: isSelected ? "0 2px 4px rgba(74, 158, 255, 0.2)" : "0 1px 2px rgba(0,0,0,0.1)",
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if the click target is the delete button or its child
    const target = e.target as HTMLElement;
    const deleteButton = target.closest('button[data-delete-button]');
    const isDeleteButton = deleteButton !== null;
    
    // If clicking the delete button, completely stop all event handling and delete immediately
    if (isDeleteButton) {
      e.stopPropagation();
      e.preventDefault();
      isDeletingRef.current = true;
      // Delete immediately on mouse down to ensure it happens
      if (onDelete) {
        // Use setTimeout with 0 delay to ensure it runs after event propagation
        setTimeout(() => {
          onDelete();
          isDeletingRef.current = false;
        }, 0);
      }
      return;
    }
    
    // Reset delete flag if clicking elsewhere
    isDeletingRef.current = false;
    
    // Call the dnd-kit listener first to allow drag detection
    if (listeners?.onMouseDown) {
      listeners.onMouseDown(e);
    }
    
    // Track mouse position to distinguish clicks from drags
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    
    const handleMouseMove = () => {
      hasMoved = true;
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      // Don't handle select if we were deleting
      if (isDeletingRef.current) {
        isDeletingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        return;
      }
      
      const deltaX = Math.abs(upEvent.clientX - startX);
      const deltaY = Math.abs(upEvent.clientY - startY);
      
      // If mouse didn't move much (less than 3px), treat it as a click
      if (!hasMoved && deltaX < 3 && deltaY < 3) {
        // Use setTimeout to ensure this runs after drag handlers
        setTimeout(() => {
          onSelect();
        }, 0);
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Merge our handler with dnd-kit's listeners
  const mergedListeners = {
    ...listeners,
    onMouseDown: handleMouseDown,
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering clip selection
    e.preventDefault();
    // Call delete immediately
    if (onDelete) {
      onDelete();
    }
  };

  const handleDeleteMouseDown = (e: React.MouseEvent) => {
    // Stop all propagation immediately - this is critical
    e.stopPropagation();
    e.preventDefault();
    isDeletingRef.current = true;
    // Don't call dnd-kit listeners at all
  };

  const handleDeleteMouseUp = (e: React.MouseEvent) => {
    // On mouse up, trigger delete if it was a click (not a drag)
    e.stopPropagation();
    e.preventDefault();
    if (isDeletingRef.current && onDelete) {
      // Use setTimeout to ensure it runs after any drag handlers
      setTimeout(() => {
        onDelete();
        isDeletingRef.current = false;
      }, 0);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...mergedListeners}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        position: 'relative',
        gap: '4px',
      }}>
        <span style={{ flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {clip.type === "audio" ? `🎵 ${clip.name?.slice(0,20)}` : clip.name?.slice(0,10)}
        </span>
        {onDelete && (
          <button
            ref={deleteButtonRef}
            data-delete-button
            onClick={handleDeleteClick}
            onMouseDown={handleDeleteMouseDown}
            onMouseUp={handleDeleteMouseUp}
            onPointerDown={(e) => {
              // Also handle pointer events
              e.stopPropagation();
              e.preventDefault();
              isDeletingRef.current = true;
            }}
            style={{
              position: 'absolute',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              // background: 'rgba(211, 47, 47, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontSize: '10px',
              // color: '#ffffff',
              lineHeight: 1,
              zIndex: 10,
              flexShrink: 0,
              pointerEvents: 'auto', // Ensure button is clickable
              userSelect: 'none', // Prevent text selection
              touchAction: 'manipulation', // Prevent touch delays
            }}
            title="Delete clip"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
