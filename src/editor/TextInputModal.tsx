import { useState, useEffect, useRef } from "react";

interface TextInputModalProps {
  isOpen: boolean;
  onConfirm: (text: string) => void;
  onCancel: () => void;
  initialText?: string;
}

export const TextInputModal = ({ 
  isOpen, 
  onConfirm, 
  onCancel,
  initialText = ""
}: TextInputModalProps) => {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      // Focus textarea when modal opens
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialText]);

  const handleConfirm = () => {
    if (text.trim()) {
      onConfirm(text.trim());
      setText("");
    }
  };

  const handleCancel = () => {
    setText("");
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "24px",
          width: "90%",
          maxWidth: "500px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: "0 0 16px 0",
            fontSize: "20px",
            fontWeight: 600,
            color: "#1a1a1a",
          }}
        >
          Enter Text Content
        </h2>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your text here..."
          style={{
            width: "100%",
            minHeight: "120px",
            padding: "12px",
            border: "1px solid #d0d0d0",
            borderRadius: "4px",
            fontSize: "14px",
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "16px",
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #d0d0d0",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              color: "#666",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!text.trim()}
            style={{
              padding: "8px 16px",
              backgroundColor: text.trim() ? "#4a9eff" : "#d0d0d0",
              border: "none",
              borderRadius: "4px",
              cursor: text.trim() ? "pointer" : "not-allowed",
              fontSize: "14px",
              color: "#ffffff",
              fontWeight: 500,
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
