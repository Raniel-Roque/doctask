import { FaExclamationTriangle } from "react-icons/fa";
import { Adviser } from "./types";

interface DeleteConfirmationProps {
  user: Adviser | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmation = ({ user, onCancel, onConfirm }: DeleteConfirmationProps) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirm Delete</h2>
        <p className="mb-8 text-gray-600">
          Are you sure you want to delete {user.first_name} {user.last_name}? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors border-2 border-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}; 