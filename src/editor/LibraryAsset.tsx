import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Clip } from "../remotion/types/timeline";

interface LibraryAssetProps {
  asset: Clip;
}

export const LibraryAsset = ({ asset }: LibraryAssetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `library-asset-${asset.id}`, // Prefix to distinguish from timeline clips
    data: {
      type: 'library-asset',
      asset: asset,
    },
  });

  const style: React.CSSProperties = {
    padding: '6px 8px',
    border: '1px solid rgb(218, 165, 221)',
    borderRadius: '3px',
    marginBottom: '4px',
    backgroundColor: isDragging ? '#f0f0f0' : '#feedff',
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Translate.toString(transform),
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'auto',
    boxShadow: "rgba(211, 110, 197, 0.15) 1.95px 1.95px 2.6px",
    // box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <p style={{ 
        margin: 0, 
        fontSize: '11px', 
        fontWeight: 500,
        color: '#1a1a1a',
        marginBottom: '2px',
        lineHeight: '1.2',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {asset.name}
      </p>
      <span style={{ 
        fontSize: '9px', 
        color: '#666',
        textTransform: 'capitalize',
        lineHeight: '1.2',
      }}>
        {asset.type}
      </span>
    </div>
  );
};
