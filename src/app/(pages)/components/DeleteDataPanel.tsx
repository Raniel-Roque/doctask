"use client";

import React, { useState } from "react";
import { FaTrash, FaExclamationTriangle, FaCheck, FaTimes } from "react-icons/fa";

interface DeleteDataPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTables: string[]) => void;
  isSubmitting: boolean;
}

interface TableOption {
  id: string;
  label: string;
  description: string;
  warning?: string;
  dependencies?: string[];
}

const TABLE_OPTIONS: TableOption[] = [
  {
    id: "students",
    label: "Students",
    description: "Remove all student accounts and their project data",
    warning: "This will permanently delete all student accounts and their associated projects, documents, and submissions",
    dependencies: ["Project groups", "Documents", "Submissions", "Task assignments", "Review notes"]
  },
  {
    id: "advisers", 
    label: "Advisers",
    description: "Remove all adviser accounts and their project data",
    warning: "This will permanently delete all adviser accounts and their associated projects, reviews, and feedback",
    dependencies: ["Project groups", "Documents", "Submissions", "Task assignments", "Review notes"]
  },
  {
    id: "groups",
    label: "Project Groups", 
    description: "Remove all project groups and their work",
    warning: "This will permanently delete all project groups and their documents, submissions, and progress. Student and adviser accounts will remain.",
    dependencies: ["Documents", "Submissions", "Task assignments", "Review notes"]
  },
  {
    id: "adviser_logs",
    label: "Adviser Activity Logs",
    description: "Clear all adviser activity history",
    warning: "This will permanently delete all records of adviser actions and activities"
  },
  {
    id: "general_logs",
    label: "System Activity Logs", 
    description: "Clear all system activity history",
    warning: "This will permanently delete all records of system activities and user actions"
  }
];

const DeleteDataPanel: React.FC<DeleteDataPanelProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting
}) => {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const handleTableToggle = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleConfirm = () => {
    if (selectedTables.length === 0) {
      return;
    }
    onConfirm(selectedTables);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedTables([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-red-500 text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">
              Delete System Data
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <p className="text-gray-600 mb-2">
              Choose what you want to delete. You can select multiple options.
            </p>
            <p className="text-red-600 font-medium text-sm">
              ⚠️ This action cannot be undone
            </p>
          </div>

          {/* Table Options */}
          <div className="space-y-3">
            {TABLE_OPTIONS.map((option) => (
              <div
                key={option.id}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  selectedTables.includes(option.id)
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => handleTableToggle(option.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedTables.includes(option.id)
                        ? "border-red-500 bg-red-500"
                        : "border-gray-300"
                    }`}>
                      {selectedTables.includes(option.id) && (
                        <FaCheck className="text-white text-xs" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {option.label}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {option.description}
                    </p>
                    {option.dependencies && option.dependencies.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Also removes:</span>{" "}
                          {option.dependencies.join(", ")}
                        </p>
                      </div>
                    )}
                    {option.warning && (
                      <div className="bg-red-100 border border-red-200 rounded p-2">
                        <p className="text-red-700 text-xs">
                          {option.warning}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Selection Summary */}
          {selectedTables.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">
                Ready to delete:
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {selectedTables.map(tableId => {
                  const option = TABLE_OPTIONS.find(opt => opt.id === tableId);
                  return (
                    <li key={tableId} className="flex items-center gap-2">
                      <FaTrash className="text-xs" />
                      {option?.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedTables.length === 0 || isSubmitting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <FaTrash className="text-sm" />
                Delete Selected
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteDataPanel;
