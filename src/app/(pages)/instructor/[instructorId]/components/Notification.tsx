import React from 'react';
import { FaExclamationCircle, FaTimes } from 'react-icons/fa';

interface NotificationProps {
  message: string | null;
  type: 'error' | 'success' | 'warning' | 'info';
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  if (!message) return null;

  const bgColor = {
    error: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }[type];

  const textColor = {
    error: 'text-red-700',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    info: 'text-blue-700'
  }[type];

  const iconColor = {
    error: 'text-red-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  }[type];

  return (
    <div className={`fixed top-4 right-4 ${bgColor} border rounded-lg p-4 shadow-lg flex items-center gap-3 z-50`}>
      <div className={iconColor}>
        <FaExclamationCircle size={20} />
      </div>
      <span className={textColor}>{message}</span>
      <button
        onClick={onClose}
        className={`${iconColor} hover:opacity-80 transition-opacity`}
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
}; 