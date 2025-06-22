"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";
import {
  FaHome,
  FaUser,
  FaUsers,
  FaClipboardList,
  FaDatabase,
  FaSignOutAlt,
  FaChevronDown,
} from "react-icons/fa";
import { Users, GraduationCap } from "lucide-react";
import { LogoutConfirmation } from "../../../components/LogoutConfirmation";

interface NavbarProps {
  instructorId: string;
}

export const Navbar = ({ instructorId }: NavbarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = useState(false);
  const [isLogsDropdownOpen, setIsLogsDropdownOpen] = useState(false);
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] =
    useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);
  const logsDropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUsersDropdownOpen(false);
      }
      if (
        logsDropdownRef.current &&
        !logsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLogsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => pathname === path;
  const isUsersActive = () =>
    pathname.includes(`/instructor/${instructorId}/users`);
  const isLogsActive = () =>
    pathname.includes(`/instructor/${instructorId}/logs`);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.replace("/login");
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white shadow-md">
      {/* Top Section */}
      <div className="flex items-center justify-between px-6 py-2 bg-gray-200">
        <Link
          href={`/instructor/${instructorId}/home`}
          className="flex items-center gap-3"
        >
          <Image
            src="/doctask.ico"
            alt="Logo"
            width={45}
            height={45}
            className="rounded-full"
          />
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
            DOCTASK
          </h1>
        </Link>
      </div>

      {/* Nav Section */}
      <nav className="bg-[#B54A4A] px-6 py-3">
        <ul className="flex items-center gap-6 text-white font-medium">
          {/* Home Link */}
          <li>
            <Link
              href={`/instructor/${instructorId}/home`}
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/home`) ? "underline italic" : ""}`}
            >
              <FaHome size={20} />
              Home
            </Link>
          </li>

          <li className="font-semibold text-white">|</li>

          {/* Users Link with Dropdown */}
          <li className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUsersDropdownOpen(!isUsersDropdownOpen)}
                className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isUsersActive() ? "underline italic" : ""}`}
              >
                <FaUser size={16} />
                Users
                <div
                  style={{
                    transform: isUsersDropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                >
                  <FaChevronDown size={16} />
                </div>
              </button>
            </div>

            {/* Dropdown Menu */}
            {isUsersDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <Link
                  href={`/instructor/${instructorId}/users/advisers`}
                  className={`flex items-center gap-2 px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/users/advisers`) ? "bg-gray-100 font-medium" : ""}`}
                  onClick={() => setIsUsersDropdownOpen(false)}
                >
                  <Users className="w-6 h-6 text-purple-600" />
                  Advisers
                </Link>
                <Link
                  href={`/instructor/${instructorId}/users/students`}
                  className={`flex items-center gap-2 px-4 py-3 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/users/students`) ? "bg-gray-100 font-medium" : ""}`}
                  onClick={() => setIsUsersDropdownOpen(false)}
                >
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                  Students
                </Link>
              </div>
            )}
          </li>

          <li className="font-semibold text-white">|</li>

          {/* Groups Link */}
          <li>
            <Link
              href={`/instructor/${instructorId}/groups`}
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/groups`) ? "underline italic" : ""}`}
            >
              <FaUsers size={20} />
              Groups
            </Link>
          </li>

          <li className="font-semibold text-white">|</li>

          {/* Logs Link with Dropdown */}
          <li className="relative" ref={logsDropdownRef}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLogsDropdownOpen(!isLogsDropdownOpen)}
                className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isLogsActive() ? "underline italic" : ""}`}
              >
                <FaClipboardList size={16} />
                Logs
                <div
                  style={{
                    transform: isLogsDropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                >
                  <FaChevronDown size={16} />
                </div>
              </button>
            </div>

            {/* Logs Dropdown Menu */}
            {isLogsDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <Link
                  href={`/instructor/${instructorId}/logs/instructor`}
                  className={`flex items-center gap-2 px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/logs/instructor`) ? "bg-gray-100 font-medium" : ""}`}
                  onClick={() => setIsLogsDropdownOpen(false)}
                >
                  Instructor Logs
                </Link>
                <Link
                  href={`/instructor/${instructorId}/logs/adviser`}
                  className={`flex items-center gap-2 px-4 py-3 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/logs/adviser`) ? "bg-gray-100 font-medium" : ""}`}
                  onClick={() => setIsLogsDropdownOpen(false)}
                >
                  Adviser Logs
                </Link>
              </div>
            )}
          </li>

          <li className="font-semibold text-white">|</li>

          {/* Backup & Restore Link */}
          <li>
            <Link
              href={`/instructor/${instructorId}/backup`}
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/backup`) ? "underline italic" : ""}`}
            >
              <FaDatabase size={16} />
              Backup & Restore
            </Link>
          </li>

          {/* Logout Button */}
          <li className="ml-auto">
            <button
              onClick={() => setIsLogoutConfirmationOpen(true)}
              className="flex items-center gap-2 hover:text-gray-300 transition-colors duration-200"
            >
              <FaSignOutAlt size={20} />
              Logout
            </button>
          </li>
        </ul>
      </nav>

      <LogoutConfirmation
        isOpen={isLogoutConfirmationOpen}
        onClose={() => setIsLogoutConfirmationOpen(false)}
        onConfirm={handleLogout}
        isSubmitting={isLoggingOut}
      />
    </header>
  );
};
