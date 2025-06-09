import React from 'react';
import { FaExclamationTriangle, FaCheck, FaTimes, FaSpinner, FaBan } from "react-icons/fa";
import { Group } from './types';

interface GroupActionConfirmationProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  networkError?: string | null;
  action: 'accept' | 'reject';
}

export default function GroupActionConfirmation({ 
  group, 
  isOpen, 
  onClose, 
  onConfirm,
  isSubmitting = false,
  networkError = null,
  action
}: GroupActionConfirmationProps) {
  if (!isOpen || !group) return null;

  const isAccept = action === 'accept';
  const title = isAccept ? 'Accept Group' : 'Reject Group';
  const icon = isAccept ? FaCheck : FaBan;
  const iconColor = isAccept ? '#059669' : '#DC2626';
  const confirmButtonColor = isAccept ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';
  const confirmText = isAccept ? 'Accept' : 'Reject';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <FaExclamationTriangle size={24} color={iconColor} />
          {title}
        </h2>

        {/* Error Message */}
        {networkError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FaExclamationTriangle />
              <span>{networkError}</span>
            </div>
          </div>
        )}

        {/* Confirmation Message */}
        <p className="mb-8 text-gray-600">
          Are you sure you want to {action} group &quot;{group.projectManager ? `${group.projectManager.last_name} et al` : 'Unknown Group'}&quot;?
          {isAccept 
            ? ' This will make you the adviser for this group.'
            : ' This will remove the group from your pending requests.'}
        </p>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300 flex items-center gap-2"
            disabled={isSubmitting}
          >
            <FaTimes />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${confirmButtonColor}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin">
                  <FaSpinner />
                </div>
                {isAccept ? 'Accepting...' : 'Rejecting...'}
              </>
            ) : (
              <>
                {React.createElement(icon)}
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

 