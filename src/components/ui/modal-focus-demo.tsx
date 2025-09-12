import React, { useState } from "react";
import { useModalFocus } from "@/hooks/use-modal-focus";
import { Button } from "./button";

interface ModalFocusDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalFocusDemo: React.FC<ModalFocusDemoProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const modalRef = useModalFocus({
    isOpen,
    onClose,
    focusFirstInput: false,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl border-2 border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
      >
        <h2 id="demo-modal-title" className="text-xl font-bold mb-4">
          Modal Focus Demo
        </h2>

        <form className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-1">
              Message
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your message"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                console.log("Form submitted:", formData);
                onClose();
              }}
            >
              Submit
            </Button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
          <p>
            <strong>Tab Navigation Test:</strong>
          </p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Tab should focus on inputs first (Name → Email → Message)</li>
            <li>Then focus on buttons (Cancel → Submit)</li>
            <li>Tab from last element should wrap to first input</li>
            <li>Shift+Tab from first input should wrap to last button</li>
            <li>Escape key should close the modal</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
