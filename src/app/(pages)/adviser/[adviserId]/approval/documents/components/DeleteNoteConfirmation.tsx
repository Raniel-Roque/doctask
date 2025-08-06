import React from "react";
import { FaTrash } from "react-icons/fa";
import { useModalFocus } from "@/hooks/use-modal-focus";

interface DeleteNoteConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteNoteConfirmation: React.FC<DeleteNoteConfirmationProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  // Use modal focus management hook
  const modalRef = useModalFocus({
    isOpen,
    onClose: () => onCancel(),
    focusFirstInput: false, // No input fields in this modal
  });

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-note-modal-title"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="text-red-500">
            <FaTrash />
          </div>
          <h3 id="delete-note-modal-title" className="text-lg font-semibold">
            Delete Note
          </h3>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete this note? This action cannot be
          undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteNoteConfirmation;
