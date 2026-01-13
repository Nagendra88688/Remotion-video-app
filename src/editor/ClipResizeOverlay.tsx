import { useState, useRef, useEffect } from 'react';
import type { Clip, Track } from '../remotion/types/timeline';

interface ClipResizeOverlayProps {
    selectedClip: Clip | null;
    tracks: Track[];
    fps: number;
    currentFrame: number;
    totalFrames: number;
    isPlaying: boolean;
    onResize: (
        clipId: string,
        newDurationInFrames: number,
        newScaleX?: number,
        newScaleY?: number,
        newX?: number,
        newY?: number
    ) => void;
    onClipSelect?: (clipId: string | null) => void;
}

export const ClipResizeOverlay = ({
    selectedClip,
    tracks,
    fps,
    currentFrame,
    totalFrames,
    isPlaying,
    onResize,
    onClipSelect,
}: ClipResizeOverlayProps) => {
    // Hardcode composition dimensions
    const compositionWidth = 1280;
    const compositionHeight = 720;

    // Get actual viewport dimensions (the rendered size of the player in the DOM)
    const [viewportDimensions, setViewportDimensions] = useState<{
        width: number;
        height: number;
    } | null>(null);

    // Update viewport dimensions when overlay ref is available or resizes
    useEffect(() => {
        const updateViewport = () => {
            if (overlayRef.current) {
                const rect = overlayRef.current.getBoundingClientRect();
                setViewportDimensions({
                    width: rect.width,
                    height: rect.height,
                });
            }
        };

        updateViewport();

        // Update on window resize
        window.addEventListener('resize', updateViewport);

        // Also observe the overlay element for size changes
        const resizeObserver = new ResizeObserver(updateViewport);
        if (overlayRef.current) {
            resizeObserver.observe(overlayRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateViewport);
            resizeObserver.disconnect();
        };
    }, [selectedClip]);

    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<
        | 'right'
        | 'left'
        | 'top'
        | 'bottom'
        | 'top-left'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-right'
        | null
    >(null);
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
    const initialMousePositionRef = useRef<{ x: number; y: number } | null>(
        null
    ); // Store initial mouse position when drag starts
    const [mediaDimensions, setMediaDimensions] = useState<{
        width: number;
        height: number;
    } | null>(null);

    // Load media dimensions dynamically when clip is selected
    useEffect(() => {
        if (!selectedClip || !selectedClip.src) {
            setMediaDimensions(null);
            return;
        }

        // For text clips, use composition dimensions
        if (selectedClip.type === 'text') {
            setMediaDimensions({
                width: compositionWidth,
                height: compositionHeight,
            });
            return;
        }

        const loadDimensions = () => {
            if (selectedClip.type === 'image' && selectedClip.src) {
                const img = new Image();
                img.onload = () => {
                    setMediaDimensions({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                    });
                };
                img.onerror = () => {
                    // Fallback to composition dimensions if image fails to load
                    setMediaDimensions({
                        width: compositionWidth,
                        height: compositionHeight,
                    });
                };
                img.src = selectedClip.src;
            } else if (selectedClip.type === 'video' && selectedClip.src) {
                const video = document.createElement('video');
                video.onloadedmetadata = () => {
                    setMediaDimensions({
                        width: video.videoWidth || compositionWidth,
                        height: video.videoHeight || compositionHeight,
                    });
                };
                video.onerror = () => {
                    // Fallback to composition dimensions if video fails to load
                    setMediaDimensions({
                        width: compositionWidth,
                        height: compositionHeight,
                    });
                };
                video.src = selectedClip.src;
                video.load();
            } else {
                // For audio or other types, use composition dimensions
                setMediaDimensions({
                    width: compositionWidth,
                    height: compositionHeight,
                });
            }
        };

        loadDimensions();
    }, [
        selectedClip?.id,
        selectedClip?.src,
        selectedClip?.type,
        compositionWidth,
        compositionHeight,
    ]);

    // Find which track contains the selected clip
    const track = selectedClip
        ? tracks.find((t) => t.clips.some((c) => c.id === selectedClip.id))
        : null;

    const startFrame = selectedClip?.startFrame ?? 0;
    const durationInFrames = selectedClip?.durationInFrames ?? 90;
    const endFrame = startFrame + durationInFrames;
    const scaleX = selectedClip?.scaleX ?? 1;
    const scaleY = selectedClip?.scaleY ?? 1;
    const clipX = selectedClip?.x ?? 0; // X position (0 = centered)
    const clipY = selectedClip?.y ?? 0; // Y position (0 = centered)

    // Calculate if the clip is currently visible at currentFrame
    const isClipVisibleAtFrame = selectedClip
        ? currentFrame >= startFrame && currentFrame < endFrame
        : false;
    // Show resize borders when clip is selected and visible, but hide during playback
    const shouldShowBorders =
        selectedClip && !isPlaying && isClipVisibleAtFrame;

    // Calculate scale factor from composition to viewport
    const getViewportScale = () => {
        if (!viewportDimensions) return { scaleX: 1, scaleY: 1 };

        const compositionAspectRatio = compositionWidth / compositionHeight;
        const viewportAspectRatio =
            viewportDimensions.width / viewportDimensions.height;

        // Calculate how the composition is scaled to fit the viewport
        let scale: number;
        if (viewportAspectRatio > compositionAspectRatio) {
            // Viewport is wider - scale based on height
            scale = viewportDimensions.height / compositionHeight;
        } else {
            // Viewport is taller - scale based on width
            scale = viewportDimensions.width / compositionWidth;
        }

        return { scaleX: scale, scaleY: scale };
    };

    // Calculate the actual displayed dimensions based on media aspect ratio and objectFit: contain
    // The media fits within the composition while maintaining aspect ratio
    const getDisplayedDimensions = () => {
        if (!mediaDimensions) {
            // Fallback while loading - use composition dimensions
            return { width: compositionWidth, height: compositionHeight };
        }

        const mediaAspectRatio = mediaDimensions.width / mediaDimensions.height;
        const compositionAspectRatio = compositionWidth / compositionHeight;

        let displayedWidth: number;
        let displayedHeight: number;

        if (mediaAspectRatio > compositionAspectRatio) {
            // Media is wider - fit to width
            displayedWidth = compositionWidth;
            displayedHeight = compositionWidth / mediaAspectRatio;
        } else {
            // Media is taller - fit to height
            displayedHeight = compositionHeight;
            displayedWidth = compositionHeight * mediaAspectRatio;
        }

        return { width: displayedWidth, height: displayedHeight };
    };

    const displayedDims = getDisplayedDimensions();
    const viewportScale = getViewportScale();

    // Calculate position and size of the clip in the renderer
    // The clip is centered by default, but can be moved with x and y offsets
    // Account for scale - the visual size is the displayed dimensions multiplied by scale
    const scaledWidth = displayedDims.width * scaleX;
    const scaledHeight = displayedDims.height * scaleY;

    // Convert composition coordinates to viewport coordinates
    const scaledWidthViewport = scaledWidth * viewportScale.scaleX;
    const scaledHeightViewport = scaledHeight * viewportScale.scaleY;

    // Calculate the actual position: center + offset + drag offset (for smooth visual feedback)
    const currentX = clipX + (isDragging ? dragOffsetX : 0);
    const currentY = clipY + (isDragging ? dragOffsetY : 0);

    // Calculate position in composition space, then convert to viewport
    const clipLeftComposition =
        compositionWidth / 2 + currentX - scaledWidth / 2;
    const clipTopComposition =
        compositionHeight / 2 + currentY - scaledHeight / 2;

    // Convert to viewport coordinates
    const compositionAspectRatio = compositionWidth / compositionHeight;
    const viewportAspectRatio = viewportDimensions
        ? viewportDimensions.width / viewportDimensions.height
        : compositionAspectRatio;

    let clipLeft: number;
    let clipTop: number;

    if (viewportDimensions) {
        if (viewportAspectRatio > compositionAspectRatio) {
            // Viewport is wider - letterboxing on sides
            const viewportScaleY =
                viewportDimensions.height / compositionHeight;
            const scaledViewportWidth =
                viewportDimensions.height * compositionAspectRatio;
            const offsetX =
                (viewportDimensions.width - scaledViewportWidth) / 2;
            clipLeft = offsetX + clipLeftComposition * viewportScaleY;
            clipTop = clipTopComposition * viewportScaleY;
        } else {
            // Viewport is taller - letterboxing on top/bottom
            const viewportScaleX = viewportDimensions.width / compositionWidth;
            const scaledViewportHeight =
                viewportDimensions.width / compositionAspectRatio;
            const offsetY =
                (viewportDimensions.height - scaledViewportHeight) / 2;
            clipLeft = clipLeftComposition * viewportScaleX;
            clipTop = offsetY + clipTopComposition * viewportScaleX;
        }
    } else {
        // Fallback while viewport dimensions are loading
        clipLeft = clipLeftComposition;
        clipTop = clipTopComposition;
    }

    // Handle resize start
    const handleResizeStart = (
        e: React.MouseEvent,
        handle:
            | 'right'
            | 'left'
            | 'top'
            | 'bottom'
            | 'top-left'
            | 'top-right'
            | 'bottom-left'
            | 'bottom-right'
    ) => {
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
                // Use initial displayed dimensions for initial handle positions (from when resize started)
                const initialDisplayedDims = mediaDimensions
                    ? (() => {
                          const mediaAspectRatio =
                              mediaDimensions.width / mediaDimensions.height;
                          const compositionAspectRatio =
                              compositionWidth / compositionHeight;
                          let w: number, h: number;
                          if (mediaAspectRatio > compositionAspectRatio) {
                              w = compositionWidth;
                              h = compositionWidth / mediaAspectRatio;
                          } else {
                              h = compositionHeight;
                              w = compositionHeight * mediaAspectRatio;
                          }
                          return { width: w, height: h };
                      })()
                    : { width: compositionWidth, height: compositionHeight };
                const initialScaledWidth =
                    initialDisplayedDims.width * initialScaleX;
                const initialScaledHeight =
                    initialDisplayedDims.height * initialScaleY;
                const initialClipLeftComposition =
                    compositionWidth / 2 + clipX - initialScaledWidth / 2;
                const initialClipTopComposition =
                    compositionHeight / 2 + clipY - initialScaledHeight / 2;

                // Convert composition coordinates to viewport coordinates for handle positions
                const compositionAspectRatio =
                    compositionWidth / compositionHeight;
                const viewportAspectRatio = rect.width / rect.height;
                let initialClipLeft: number;
                let initialClipTop: number;
                let initialScaledWidthViewport: number;
                let initialScaledHeightViewport: number;

                if (viewportAspectRatio > compositionAspectRatio) {
                    // Viewport is wider - letterboxing on sides
                    const viewportScaleY = rect.height / compositionHeight;
                    const scaledViewportWidth =
                        rect.height * compositionAspectRatio;
                    const offsetX = (rect.width - scaledViewportWidth) / 2;
                    initialClipLeft =
                        offsetX + initialClipLeftComposition * viewportScaleY;
                    initialClipTop = initialClipTopComposition * viewportScaleY;
                    initialScaledWidthViewport =
                        initialScaledWidth * viewportScaleY;
                    initialScaledHeightViewport =
                        initialScaledHeight * viewportScaleY;
                } else {
                    // Viewport is taller - letterboxing on top/bottom
                    const viewportScaleX = rect.width / compositionWidth;
                    const scaledViewportHeight =
                        rect.width / compositionAspectRatio;
                    const offsetY = (rect.height - scaledViewportHeight) / 2;
                    initialClipLeft =
                        initialClipLeftComposition * viewportScaleX;
                    initialClipTop =
                        offsetY + initialClipTopComposition * viewportScaleX;
                    initialScaledWidthViewport =
                        initialScaledWidth * viewportScaleX;
                    initialScaledHeightViewport =
                        initialScaledHeight * viewportScaleX;
                }

                if (resizeHandle === 'right') {
                    startMouseX =
                        rect.left +
                        initialClipLeft +
                        initialScaledWidthViewport;
                    startMouseY =
                        rect.top +
                        initialClipTop +
                        initialScaledHeightViewport / 2;
                } else if (resizeHandle === 'left') {
                    startMouseX = rect.left + initialClipLeft;
                    startMouseY =
                        rect.top +
                        initialClipTop +
                        initialScaledHeightViewport / 2;
                } else if (resizeHandle === 'bottom') {
                    startMouseX =
                        rect.left +
                        initialClipLeft +
                        initialScaledWidthViewport / 2;
                    startMouseY =
                        rect.top + initialClipTop + initialScaledHeightViewport;
                } else if (resizeHandle === 'top') {
                    startMouseX =
                        rect.left +
                        initialClipLeft +
                        initialScaledWidthViewport / 2;
                    startMouseY = rect.top + initialClipTop;
                } else if (resizeHandle === 'bottom-right') {
                    startMouseX =
                        rect.left +
                        initialClipLeft +
                        initialScaledWidthViewport;
                    startMouseY =
                        rect.top + initialClipTop + initialScaledHeightViewport;
                } else if (resizeHandle === 'bottom-left') {
                    startMouseX = rect.left + initialClipLeft;
                    startMouseY =
                        rect.top + initialClipTop + initialScaledHeightViewport;
                } else if (resizeHandle === 'top-right') {
                    startMouseX =
                        rect.left +
                        initialClipLeft +
                        initialScaledWidthViewport;
                    startMouseY = rect.top + initialClipTop;
                } else if (resizeHandle === 'top-left') {
                    startMouseX = rect.left + initialClipLeft;
                    startMouseY = rect.top + initialClipTop;
                }
                hasStarted = true;
            }

            const currentMouseX = e.clientX;
            const currentMouseY = e.clientY;
            const deltaXViewport = currentMouseX - startMouseX;
            const deltaYViewport = currentMouseY - startMouseY;

            // Convert viewport pixel deltas to composition pixel deltas
            if (!overlayRef.current) return;
            const rect = overlayRef.current.getBoundingClientRect();
            const compositionAspectRatio = compositionWidth / compositionHeight;
            const viewportAspectRatio = rect.width / rect.height;
            let scaleFactor: number;

            if (viewportAspectRatio > compositionAspectRatio) {
                // Viewport is wider - scale based on height
                scaleFactor = compositionHeight / rect.height;
            } else {
                // Viewport is taller - scale based on width
                scaleFactor = compositionWidth / rect.width;
            }

            const deltaX = deltaXViewport * scaleFactor;
            const deltaY = deltaYViewport * scaleFactor;

            // Calculate scale change based on mouse movement
            // Maintain aspect ratio for all resize operations
            let newScaleX = initialScaleX;
            let newScaleY = initialScaleY;

            if (resizeHandle === 'right' || resizeHandle === 'left') {
                // Horizontal resize - change scaleX, maintain aspect ratio for scaleY
                // Use displayed width instead of composition width for scaling calculations
                const displayedWidth = mediaDimensions
                    ? (() => {
                          const mediaAspectRatio =
                              mediaDimensions.width / mediaDimensions.height;
                          const compositionAspectRatio =
                              compositionWidth / compositionHeight;
                          return mediaAspectRatio > compositionAspectRatio
                              ? compositionWidth
                              : compositionHeight * mediaAspectRatio;
                      })()
                    : compositionWidth;
                const scaleDelta =
                    resizeHandle === 'left'
                        ? -(deltaX / displayedWidth) * 2
                        : (deltaX / displayedWidth) * 2;
                newScaleX = Math.max(
                    0.1,
                    Math.min(3, initialScaleX + scaleDelta)
                );
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
                // Use displayed height instead of composition height for scaling calculations
                const displayedHeight = mediaDimensions
                    ? (() => {
                          const mediaAspectRatio =
                              mediaDimensions.width / mediaDimensions.height;
                          const compositionAspectRatio =
                              compositionWidth / compositionHeight;
                          return mediaAspectRatio > compositionAspectRatio
                              ? compositionWidth / mediaAspectRatio
                              : compositionHeight;
                      })()
                    : compositionHeight;
                const scaleDelta =
                    resizeHandle === 'top'
                        ? -(deltaY / displayedHeight) * 2
                        : (deltaY / displayedHeight) * 2;
                newScaleY = Math.max(
                    0.1,
                    Math.min(3, initialScaleY + scaleDelta)
                );
                // Maintain aspect ratio: scaleX = scaleY * aspectRatio
                newScaleX = newScaleY * aspectRatio;
                // Clamp scaleX to valid range
                newScaleX = Math.max(0.1, Math.min(3, newScaleX));
                // Recalculate scaleY to maintain exact ratio if scaleX was clamped
                if (newScaleX === 3 || newScaleX === 0.1) {
                    newScaleY = newScaleX / aspectRatio;
                    newScaleY = Math.max(0.1, Math.min(3, newScaleY));
                }
            } else if (
                resizeHandle === 'top-left' ||
                resizeHandle === 'top-right' ||
                resizeHandle === 'bottom-left' ||
                resizeHandle === 'bottom-right'
            ) {
                // Corner resize - use the larger delta to determine scale, maintain aspect ratio
                const displayedWidth = mediaDimensions
                    ? (() => {
                          const mediaAspectRatio =
                              mediaDimensions.width / mediaDimensions.height;
                          const compositionAspectRatio =
                              compositionWidth / compositionHeight;
                          return mediaAspectRatio > compositionAspectRatio
                              ? compositionWidth
                              : compositionHeight * mediaAspectRatio;
                      })()
                    : compositionWidth;
                const displayedHeight = mediaDimensions
                    ? (() => {
                          const mediaAspectRatio =
                              mediaDimensions.width / mediaDimensions.height;
                          const compositionAspectRatio =
                              compositionWidth / compositionHeight;
                          return mediaAspectRatio > compositionAspectRatio
                              ? compositionWidth / mediaAspectRatio
                              : compositionHeight;
                      })()
                    : compositionHeight;

                // Adjust delta signs based on corner direction
                let adjustedDeltaX = deltaX;
                let adjustedDeltaY = deltaY;

                if (
                    resizeHandle === 'top-left' ||
                    resizeHandle === 'bottom-left'
                ) {
                    // Left corners: invert X delta
                    adjustedDeltaX = -deltaX;
                }
                if (
                    resizeHandle === 'top-left' ||
                    resizeHandle === 'top-right'
                ) {
                    // Top corners: invert Y delta
                    adjustedDeltaY = -deltaY;
                }

                const scaleDeltaX = (adjustedDeltaX / displayedWidth) * 2;
                const scaleDeltaY = (adjustedDeltaY / displayedHeight) * 2;

                // Use the dominant movement direction
                const absDeltaX = Math.abs(scaleDeltaX);
                const absDeltaY = Math.abs(scaleDeltaY);

                if (absDeltaX > absDeltaY) {
                    // Horizontal movement is dominant
                    newScaleX = Math.max(
                        0.1,
                        Math.min(3, initialScaleX + scaleDeltaX)
                    );
                    newScaleY = newScaleX / aspectRatio;
                    newScaleY = Math.max(0.1, Math.min(3, newScaleY));
                    if (newScaleY === 3 || newScaleY === 0.1) {
                        newScaleX = newScaleY * aspectRatio;
                        newScaleX = Math.max(0.1, Math.min(3, newScaleX));
                    }
                } else {
                    // Vertical movement is dominant
                    newScaleY = Math.max(
                        0.1,
                        Math.min(3, initialScaleY + scaleDeltaY)
                    );
                    newScaleX = newScaleY * aspectRatio;
                    newScaleX = Math.max(0.1, Math.min(3, newScaleX));
                    if (newScaleX === 3 || newScaleX === 0.1) {
                        newScaleY = newScaleX / aspectRatio;
                        newScaleY = Math.max(0.1, Math.min(3, newScaleY));
                    }
                }
            }

            onResize(
                selectedClip.id,
                durationInFrames,
                newScaleX,
                newScaleY,
                clipX,
                clipY
            );
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
    }, [
        isResizing,
        resizeHandle,
        initialScaleX,
        initialScaleY,
        aspectRatio,
        selectedClip,
        onResize,
        compositionWidth,
        compositionHeight,
        durationInFrames,
        clipX,
        clipY,
        scaleX,
        scaleY,
        mediaDimensions,
    ]);

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
        // Store the actual mouse position where the drag started
        initialMousePositionRef.current = {
            x: e.clientX,
            y: e.clientY,
        };
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
                onResize(
                    selectedClip.id,
                    durationInFrames,
                    scaleX,
                    scaleY,
                    pendingUpdate.x,
                    pendingUpdate.y
                );
                pendingUpdate = null;
                lastUpdateTime = performance.now();
            }
            rafIdRef.current = null;
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!overlayRef.current || !selectedClip) return;

            if (!hasStarted) {
                // Use the stored initial mouse position from handleDragStart
                if (initialMousePositionRef.current) {
                    startMouseX = initialMousePositionRef.current.x;
                    startMouseY = initialMousePositionRef.current.y;
                } else {
                    // Fallback: calculate from clip center (shouldn't happen, but safety check)
                    const rect = overlayRef.current.getBoundingClientRect();
                    const compositionAspectRatio =
                        compositionWidth / compositionHeight;
                    const viewportAspectRatio = rect.width / rect.height;
                    let centerXViewport: number;
                    let centerYViewport: number;

                    if (viewportAspectRatio > compositionAspectRatio) {
                        // Viewport is wider - letterboxing on sides
                        const viewportScaleY = rect.height / compositionHeight;
                        const scaledViewportWidth =
                            rect.height * compositionAspectRatio;
                        const offsetX = (rect.width - scaledViewportWidth) / 2;
                        centerXViewport =
                            offsetX +
                            (compositionWidth / 2 + clipX) * viewportScaleY;
                        centerYViewport =
                            (compositionHeight / 2 + clipY) * viewportScaleY;
                    } else {
                        // Viewport is taller - letterboxing on top/bottom
                        const viewportScaleX = rect.width / compositionWidth;
                        const scaledViewportHeight =
                            rect.width / compositionAspectRatio;
                        const offsetY =
                            (rect.height - scaledViewportHeight) / 2;
                        centerXViewport =
                            (compositionWidth / 2 + clipX) * viewportScaleX;
                        centerYViewport =
                            offsetY +
                            (compositionHeight / 2 + clipY) * viewportScaleX;
                    }

                    startMouseX = rect.left + centerXViewport;
                    startMouseY = rect.top + centerYViewport;
                }
                hasStarted = true;
            }

            const currentMouseX = e.clientX;
            const currentMouseY = e.clientY;
            const deltaXViewport = currentMouseX - startMouseX;
            const deltaYViewport = currentMouseY - startMouseY;

            // Convert viewport pixel deltas to composition pixel deltas
            if (!overlayRef.current) return;
            const rect = overlayRef.current.getBoundingClientRect();
            const compositionAspectRatio = compositionWidth / compositionHeight;
            const viewportAspectRatio = rect.width / rect.height;
            let scaleFactor: number;

            if (viewportAspectRatio > compositionAspectRatio) {
                // Viewport is wider - scale based on height
                scaleFactor = compositionHeight / rect.height;
            } else {
                // Viewport is taller - scale based on width
                scaleFactor = compositionWidth / rect.width;
            }

            const deltaX = deltaXViewport * scaleFactor;
            const deltaY = deltaYViewport * scaleFactor;

            // Calculate new position (clamp to keep clip within bounds)
            const currentDisplayedDims = mediaDimensions
                ? (() => {
                      const mediaAspectRatio =
                          mediaDimensions.width / mediaDimensions.height;
                      const compositionAspectRatio =
                          compositionWidth / compositionHeight;
                      let w: number, h: number;
                      if (mediaAspectRatio > compositionAspectRatio) {
                          w = compositionWidth;
                          h = compositionWidth / mediaAspectRatio;
                      } else {
                          h = compositionHeight;
                          w = compositionHeight * mediaAspectRatio;
                      }
                      return { width: w, height: h };
                  })()
                : { width: compositionWidth, height: compositionHeight };
            const currentScaledWidth = currentDisplayedDims.width * scaleX;
            const currentScaledHeight = currentDisplayedDims.height * scaleY;
            const maxX = (compositionWidth - currentScaledWidth) / 2;
            const maxY = (compositionHeight - currentScaledHeight) / 2;

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
                onResize(
                    selectedClip.id,
                    durationInFrames,
                    scaleX,
                    scaleY,
                    pendingUpdate.x,
                    pendingUpdate.y
                );
                pendingUpdate = null;
            }
            setIsDragging(false);
            setDragOffsetX(0);
            setDragOffsetY(0);
            hasStarted = false;
            initialMousePositionRef.current = null; // Clear initial position
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };

        window.addEventListener('mousemove', handleMouseMove, {
            passive: true,
        });
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [
        isDragging,
        initialX,
        initialY,
        selectedClip,
        onResize,
        compositionWidth,
        compositionHeight,
        durationInFrames,
        scaleX,
        scaleY,
        clipX,
        clipY,
        mediaDimensions,
        viewportDimensions,
    ]);

    // Handle clicks on clips to select them
    const handleClick = (e: React.MouseEvent) => {
        // Don't handle clicks if resizing or dragging
        if (isResizing || isDragging || !onClipSelect) return;

        // Don't handle clicks on resize handles (they have higher z-index)
        const target = e.target as HTMLElement;
        if (target.closest('[data-resize-handle]')) return;

        if (!overlayRef.current) return;

        const rect = overlayRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert screen coordinates to composition coordinates
        // The overlay covers the player, which is scaled to fit the container
        // We need to calculate the composition coordinates based on the aspect ratio
        const overlayWidth = rect.width;
        const overlayHeight = rect.height;
        const aspectRatio = compositionWidth / compositionHeight;
        const overlayAspectRatio = overlayWidth / overlayHeight;

        let compX: number;
        let compY: number;

        if (overlayAspectRatio > aspectRatio) {
            // Overlay is wider - letterboxing on sides
            const scaledHeight = overlayHeight;
            const scaledWidth = scaledHeight * aspectRatio;
            const offsetX = (overlayWidth - scaledWidth) / 2;
            compX = ((clickX - offsetX) / scaledWidth) * compositionWidth;
            compY = (clickY / scaledHeight) * compositionHeight;
        } else {
            // Overlay is taller - letterboxing on top/bottom
            const scaledWidth = overlayWidth;
            const scaledHeight = scaledWidth / aspectRatio;
            const offsetY = (overlayHeight - scaledHeight) / 2;
            compX = (clickX / scaledWidth) * compositionWidth;
            compY = ((clickY - offsetY) / scaledHeight) * compositionHeight;
        }

        // Find all clips visible at current frame
        const visibleClips: Array<{
            clip: Clip;
            trackIndex: number;
            clipIndex: number;
        }> = [];
        tracks.forEach((track, trackIndex) => {
            track.clips.forEach((clip, clipIndex) => {
                const startFrame = clip.startFrame ?? 0;
                const endFrame = startFrame + clip.durationInFrames;
                if (currentFrame >= startFrame && currentFrame < endFrame) {
                    visibleClips.push({ clip, trackIndex, clipIndex });
                }
            });
        });

        // Sort by z-index (higher z-index = rendered on top)
        visibleClips.sort((a, b) => {
            const aZ = (tracks.length - 1 - a.trackIndex) * 1000 + a.clipIndex;
            const bZ = (tracks.length - 1 - b.trackIndex) * 1000 + b.clipIndex;
            return bZ - aZ; // Higher z-index first
        });

        // Find the topmost clip that contains the click point
        for (const { clip } of visibleClips) {
            const clipScaleX = clip.scaleX ?? 1;
            const clipScaleY = clip.scaleY ?? 1;
            const clipX = clip.x ?? 0;
            const clipY = clip.y ?? 0;

            const scaledWidth = compositionWidth * clipScaleX;
            const scaledHeight = compositionHeight * clipScaleY;
            const clipLeft = compositionWidth / 2 + clipX - scaledWidth / 2;
            const clipTop = compositionHeight / 2 + clipY - scaledHeight / 2;

            if (
                compX >= clipLeft &&
                compX <= clipLeft + scaledWidth &&
                compY >= clipTop &&
                compY <= clipTop + scaledHeight
            ) {
                onClipSelect(clip.id);
                return;
            }
        }

        // If no clip was clicked, deselect
        onClipSelect(null);
    };

    const handleSize = 12;
    const handleOffset = 6;

    return (
        <div
            ref={overlayRef}
            onClick={handleClick}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                pointerEvents:
                    isResizing || isDragging
                        ? 'auto'
                        : onClipSelect
                        ? 'auto'
                        : 'none',
                zIndex: 1000,
            }}>
            {shouldShowBorders && (
                <>
                    {/* Border around the clip */}
                    <div
                        style={{
                            position: 'absolute',
                            left: `${clipLeft}px`,
                            top: `${clipTop}px`,
                            width: `${scaledWidthViewport}px`,
                            height: `${scaledHeightViewport}px`,
                            border: '3px solid #4a9eff',
                            boxSizing: 'border-box',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Draggable area for moving the clip (the inner content area) */}
                    <div
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent click handler from firing
                            handleDragStart(e);
                        }}
                        style={{
                            position: 'absolute',
                            left: `${clipLeft}px`,
                            top: `${clipTop}px`,
                            width: `${scaledWidthViewport}px`,
                            height: `${scaledHeightViewport}px`,
                            cursor: isDragging ? 'grabbing' : 'grab',
                            pointerEvents: isResizing ? 'none' : 'auto',
                            zIndex: 999,
                        }}
                    />
                </>
            )}

            {shouldShowBorders && (
                <>
                    {/* Left resize handle */}
                    <div
                        data-resize-handle
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent click handler from firing
                            handleResizeStart(e, 'left');
                        }}
                        style={{
                            position: 'absolute',
                            left: `${clipLeft - handleOffset}px`,
                            top: `${
                                clipTop +
                                scaledHeightViewport / 2 -
                                handleSize / 2
                            }px`,
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
                        data-resize-handle
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent click handler from firing
                            handleResizeStart(e, 'right');
                        }}
                        style={{
                            position: 'absolute',
                            left: `${
                                clipLeft + scaledWidthViewport - handleOffset
                            }px`,
                            top: `${
                                clipTop +
                                scaledHeightViewport / 2 -
                                handleSize / 2
                            }px`,
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
                        data-resize-handle
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent click handler from firing
                            handleResizeStart(e, 'top');
                        }}
                        style={{
                            position: 'absolute',
                            left: `${
                                clipLeft +
                                scaledWidthViewport / 2 -
                                handleSize / 2
                            }px`,
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
                        data-resize-handle
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent click handler from firing
                            handleResizeStart(e, 'bottom');
                        }}
                        style={{
                            position: 'absolute',
                            left: `${
                                clipLeft +
                                scaledWidthViewport / 2 -
                                handleSize / 2
                            }px`,
                            top: `${
                                clipTop + scaledHeightViewport - handleOffset
                            }px`,
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

                    {/* Corner resize handles - Bottom Right */}
                    <div
                        data-resize-handle
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent click handler from firing
                            handleResizeStart(e, 'bottom-right');
                        }}
                        style={{
                            position: 'absolute',
                            left: `${
                                clipLeft + scaledWidthViewport - handleOffset
                            }px`,
                            top: `${
                                clipTop + scaledHeightViewport - handleOffset
                            }px`,
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

                    {/* Corner resize handles - Bottom Left */}
                    <div
                        data-resize-handle
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent click handler from firing
                            handleResizeStart(e, 'bottom-left');
                        }}
                        style={{
                            position: 'absolute',
                            left: `${clipLeft - handleOffset}px`,
                            top: `${
                                clipTop + scaledHeightViewport - handleOffset
                            }px`,
                            width: `${handleSize}px`,
                            height: `${handleSize}px`,
                            backgroundColor: '#4a9eff',
                            border: '2px solid #ffffff',
                            borderRadius: '50%',
                            cursor: 'nesw-resize',
                            pointerEvents: 'auto',
                            zIndex: 1001,
                        }}
                    />

                    {/* Corner resize handles - Top Right */}
                    <div
                        data-resize-handle
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent click handler from firing
                            handleResizeStart(e, 'top-right');
                        }}
                        style={{
                            position: 'absolute',
                            left: `${
                                clipLeft + scaledWidthViewport - handleOffset
                            }px`,
                            top: `${clipTop - handleOffset}px`,
                            width: `${handleSize}px`,
                            height: `${handleSize}px`,
                            backgroundColor: '#4a9eff',
                            border: '2px solid #ffffff',
                            borderRadius: '50%',
                            cursor: 'nesw-resize',
                            pointerEvents: 'auto',
                            zIndex: 1001,
                        }}
                    />

                    {/* Corner resize handles - Top Left */}
                    <div
                        data-resize-handle
                        onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent click handler from firing
                            handleResizeStart(e, 'top-left');
                        }}
                        style={{
                            position: 'absolute',
                            left: `${clipLeft - handleOffset}px`,
                            top: `${clipTop - handleOffset}px`,
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
                </>
            )}
        </div>
    );
};
