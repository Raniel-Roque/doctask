"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";

interface NavbarProps {
  instructorId: string;
}

export const Navbar = ({ instructorId }: NavbarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = useState(false);
  const [isLogsDropdownOpen, setIsLogsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);
  const logsDropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUsersDropdownOpen(false);
      }
      if (logsDropdownRef.current && !logsDropdownRef.current.contains(event.target as Node)) {
        setIsLogsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => pathname === path;
  const isUsersActive = () => pathname.includes(`/instructor/${instructorId}/users`);
  const isLogsActive = () => pathname.includes(`/instructor/${instructorId}/logs`);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="bg-white shadow-md">
      {/* Top Section */}
      <div className="flex items-center justify-between px-6 py-2 bg-gray-200">
        <Link href={`/instructor/${instructorId}/home`} className="flex items-center gap-3">
          <Image
            src="/doctask.ico"
            alt="Logo"
            width={45}
            height={45}
            className="rounded-full"
          />
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">DOCTASK</h1>
        </Link>
      </div>

      {/* Nav Section */}
      <nav className="bg-[#B54A4A] px-6 py-3">
        <ul className="flex items-center gap-6 text-white font-medium">
          {/* Home Link */}
          <li>
            <Link
              href={`/instructor/${instructorId}/home`}
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/home`) ? 'underline italic' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Home
            </Link>
          </li>

          <li className="font-semibold text-white">|</li>

          {/* Users Link with Dropdown */}
          <li className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUsersDropdownOpen(!isUsersDropdownOpen)}
                className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isUsersActive() ? 'underline italic' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                Users
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform duration-200 ${isUsersDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
            
            {/* Dropdown Menu */}
            {isUsersDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <Link
                  href={`/instructor/${instructorId}/users/advisers`}
                  className={`block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/users/advisers`) ? 'bg-gray-100 font-medium' : ''}`}
                  onClick={() => setIsUsersDropdownOpen(false)}
                >
                  Advisers
                </Link>
                <Link
                  href={`/instructor/${instructorId}/users/students`}
                  className={`block px-4 py-3 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/users/students`) ? 'bg-gray-100 font-medium' : ''}`}
                  onClick={() => setIsUsersDropdownOpen(false)}
                >
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
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/groups`) ? 'underline italic' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              Groups
            </Link>
          </li>

          <li className="font-semibold text-white">|</li>

          {/* Logs Link with Dropdown */}
          <li className="relative" ref={logsDropdownRef}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLogsDropdownOpen(!isLogsDropdownOpen)}
                className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isLogsActive() ? 'underline italic' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                Logs
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform duration-200 ${isLogsDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
            
            {/* Logs Dropdown Menu */}
            {isLogsDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <Link
                  href={`/instructor/${instructorId}/logs/instructor`}
                  className={`block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/logs/instructor`) ? 'bg-gray-100 font-medium' : ''}`}
                  onClick={() => setIsLogsDropdownOpen(false)}
                >
                  instructor Logs
                </Link>
                <Link
                  href={`/instructor/${instructorId}/logs/adviser`}
                  className={`block px-4 py-3 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/logs/adviser`) ? 'bg-gray-100 font-medium' : ''}`}
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
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/instructor/${instructorId}/backup`) ? 'underline italic' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              Backup & Restore
            </Link>
          </li>

          {/* Logout Button */}
          <li className="ml-auto">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 hover:text-gray-300 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};
