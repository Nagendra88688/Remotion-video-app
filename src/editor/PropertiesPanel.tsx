import type { Clip } from "../remotion/types/timeline";

interface PropertiesPanelProps {
  selectedClip: Clip | null;
}

export const PropertiesPanel = ({ selectedClip }: PropertiesPanelProps) => {
  if (!selectedClip) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #e0e0e0',
        padding: '16px'
      }}>
        <p style={{
          margin: 0,
          color: '#999',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Select a text asset to view styling options.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#ffffff',
      borderLeft: '1px solid #e0e0e0',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <h3 style={{
        margin: 0,
        fontSize: '16px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '16px'
      }}>
        Properties
      </h3>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#666',
          marginBottom: '6px'
        }}>
          Name
        </label>
        <input
          type="text"
          value={selectedClip.name || ''}
          readOnly
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box',
            backgroundColor: '#fafafa'
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#666',
          marginBottom: '6px'
        }}>
          Type
        </label>
        <input
          type="text"
          value={selectedClip.type}
          readOnly
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box',
            backgroundColor: '#fafafa',
            textTransform: 'capitalize'
          }}
        />
      </div>

      {selectedClip.type === 'text' && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#666',
              marginBottom: '6px'
            }}>
              Text Content
            </label>
            <textarea
              value={selectedClip.text || ''}
              readOnly
              rows={4}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: '#fafafa',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#666',
              marginBottom: '6px'
            }}>
              Font Size
            </label>
            <input
              type="number"
              defaultValue={80}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#666',
              marginBottom: '6px'
            }}>
              Text Color
            </label>
            <input
              type="color"
              defaultValue="#ffffff"
              style={{
                width: '100%',
                height: '40px',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          </div>
        </>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#666',
          marginBottom: '6px'
        }}>
          Duration (frames)
        </label>
        <input
          type="number"
          value={selectedClip.durationInFrames}
          readOnly
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box',
            backgroundColor: '#fafafa'
          }}
        />
      </div>
    </div>
  );
};
