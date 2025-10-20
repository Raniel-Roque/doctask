import React, { useState } from "react";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

interface BackdoorPanelProps {
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<void>;
  loading?: boolean;
}

const BackdoorPanel: React.FC<BackdoorPanelProps> = ({
  onClose,
  onLogin,
  loading = false,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(username, password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Emergency Access</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
              <FaLock color="#B54A4A" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="appearance-none rounded-lg relative block w-full pl-10 pr-3 h-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm shadow-sm bg-white"
              placeholder="Username"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
              <FaLock color="#B54A4A" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-lg relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm shadow-sm bg-white"
              placeholder="Password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-20"
              tabIndex={-1}
              disabled={loading}
            >
              {showPassword ? (
                <FaEye color="#9CA3AF" />
              ) : (
                <FaEyeSlash color="#9CA3AF" />
              )}
            </button>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Accessing..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BackdoorPanel;
