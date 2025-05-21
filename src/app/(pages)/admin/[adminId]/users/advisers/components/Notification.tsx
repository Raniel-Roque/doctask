import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from "react-icons/fa";
import { Notification as NotificationType } from "./types";

interface NotificationProps {
  notification: NotificationType | null;
  onClose: () => void;
}

export const Notification = ({ notification, onClose }: NotificationProps) => {
  if (!notification) return null;

  return (
    <div className={`w-full px-6 py-3 flex items-center justify-between ${
      notification.type === 'success' ? 'bg-green-100 text-green-800' :
      notification.type === 'error' ? 'bg-red-100 text-red-800' :
      'bg-blue-100 text-blue-800'
    }`}>
      <div className="flex items-center gap-2">
        {notification.type === 'success' ? <FaCheckCircle /> :
         notification.type === 'error' ? <FaExclamationTriangle /> :
         <FaInfoCircle />}
        <span>{notification.message}</span>
      </div>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700"
      >
        <FaTimes />
      </button>
    </div>
  );
}; 