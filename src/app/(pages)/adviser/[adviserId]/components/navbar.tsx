"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useState, useRef, useEffect } from "react";
import { FaHome, FaClipboardList, FaCheckCircle } from "react-icons/fa";
import { Users, FileText, LogOut, User as UserIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { LogoutConfirmation } from "@/app/(pages)/components/LogoutConfirmation";

interface NavbarProps {
  adviserId: string;
}

export const Navbar = ({ adviserId }: NavbarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isApprovalDropdownOpen, setIsApprovalDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const approvalDropdownRef = useRef<HTMLLIElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user data from Convex
  const convexUser = useQuery(api.fetch.getUserByClerkId, { 
    clerkId: user?.id || "" 
  });

  // Format the name with middle initial if available
  const formatName = () => {
    if (!convexUser) return "Loading...";
    const middleInitial = convexUser.middle_name ? ` ${convexUser.middle_name[0]}.` : "";
    return `${convexUser.first_name}${middleInitial} ${convexUser.last_name}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (approvalDropdownRef.current && !approvalDropdownRef.current.contains(event.target as Node)) {
        setIsApprovalDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => pathname === path;
  const isApprovalActive = () => pathname.includes(`/adviser/${adviserId}/approval`);
  const isLogsActive = () => pathname.includes(`/adviser/${adviserId}/logs`);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirmation(false);
    }
  };

  return (
    <>
      <header className="bg-white shadow-md">
        {/* Top Section with Logo and Profile */}
        <div className="flex items-center justify-between px-6 py-2 bg-gray-200">
          <Link href={`/adviser/${adviserId}/home`} className="flex items-center gap-3">
            <Image
              src="/doctask.ico"
              alt="Logo"
              width={45}
              height={45}
              className="rounded-full"
            />
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">DOCTASK</h1>
          </Link>
          {/* Profile Image and Name Dropdown (top right) */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
              aria-label="Open profile menu"
            >
              <Image
                src={user?.imageUrl || "/default-profile.png"}
                alt="Profile"
                width={36}
                height={36}
                className="rounded-full border border-black shadow"
              />
              <span className="text-gray-800 font-medium whitespace-nowrap">
                {formatName()}
              </span>
            </button>
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50 text-gray-800">
                <Link
                  href={`/adviser/${adviserId}/profile`}
                  className="px-4 py-2 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <UserIcon className="w-4 h-4" />
                  View Profile
                </Link>
                <button
                  onClick={() => {
                    setShowLogoutConfirmation(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Nav Section */}
        <nav className="bg-[#B54A4A] px-6 py-3">
          <ul className="flex items-center gap-6 text-white font-medium">
            {/* Home Link */}
            <li>
              <Link
                href={`/adviser/${adviserId}/home`}
                className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/adviser/${adviserId}/home`) ? 'underline italic' : ''}`}
              >
                <FaHome size={20} />
                Home
              </Link>
            </li>

            <li className="font-semibold text-white">|</li>

            {/* Approval Dropdown */}
            <li className="relative" ref={approvalDropdownRef}>
              <button
                onClick={() => setIsApprovalDropdownOpen(!isApprovalDropdownOpen)}
                className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isApprovalActive() ? 'underline italic' : ''}`}
              >
                <FaCheckCircle size={20} />
                Approval
                <svg className={`w-4 h-4 transition-transform ${isApprovalDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isApprovalDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-50">
                  <Link
                    href={`/adviser/${adviserId}/approval/documents`}
                    className={`flex items-center gap-2 px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/adviser/${adviserId}/approval/documents`) ? 'bg-gray-100 font-medium' : ''}`}
                    onClick={() => setIsApprovalDropdownOpen(false)}
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    Documents
                  </Link>
                  <Link
                    href={`/adviser/${adviserId}/approval/groups`}
                    className={`flex items-center gap-2 px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 ${isActive(`/adviser/${adviserId}/approval/groups`) ? 'bg-gray-100 font-medium' : ''}`}
                    onClick={() => setIsApprovalDropdownOpen(false)}
                  >
                    <Users className="w-4 h-4 text-purple-600" />
                    Groups
                  </Link>
                </div>
              )}
            </li>

            <li className="font-semibold text-white">|</li>

            {/* Logs Link */}
            <li>
              <Link
                href={`/adviser/${adviserId}/logs`}
                className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isLogsActive() ? 'underline italic' : ''}`}
              >
                <FaClipboardList size={20} />
                Logs
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <LogoutConfirmation
        isOpen={showLogoutConfirmation}
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={handleLogout}
        isSubmitting={isLoggingOut}
      />
    </>
  );
};
