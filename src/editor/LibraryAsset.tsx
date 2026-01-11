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
    padding: '12px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    marginBottom: '8px',
    backgroundColor: isDragging ? '#f0f0f0' : '#fafafa',
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Translate.toString(transform),
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
  );
};
