"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useState, useRef, useEffect } from "react";
import { FaHome, FaClipboardList } from "react-icons/fa";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { LogoutConfirmation } from "@/app/(pages)/components/LogoutConfirmation";
import UserAvatar from "@/app/(pages)/components/UserAvatar";

interface NavbarProps {
  studentId: string;
}

export const Navbar = ({ studentId }: NavbarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user data from Convex
  const convexUser = useQuery(api.fetch.getUserByClerkId, {
    clerkId: user?.id || "",
  });

  // Format the name with middle initial if available
  const formatName = () => {
    if (!convexUser) return "Loading...";
    const middleInitial = convexUser.middle_name
      ? ` ${convexUser.middle_name[0]}.`
      : "";
    return `${convexUser.first_name}${middleInitial} ${convexUser.last_name}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear viewed notes from localStorage on logout
      localStorage.removeItem("viewedNotesDocuments");
      localStorage.removeItem("viewedNoteCounts");
      await signOut();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirmation(false);
    }
  };

  // Function to handle navigation prevention when already on the page
  const handleNavClick = (targetPath: string, e: React.MouseEvent) => {
    if (pathname === targetPath) {
      e.preventDefault();
    }
  };

  return (
    <>
      <header className="bg-white shadow-md">
        {/* Top Section with Logo and Profile */}
        <div className="flex items-center justify-between px-6 py-2 bg-gray-200">
          <Link
            href={`/student/${studentId}/member/home`}
            onClick={(e) =>
              handleNavClick(`/student/${studentId}/member/home`, e)
            }
            className="flex items-center gap-3"
          >
            <Image
              src="/doctask.webp"
              alt="Logo"
              width={45}
              height={45}
              className="rounded-full"
            />
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              DOCTASK
            </h1>
          </Link>
          {/* Profile Image and Name Dropdown (top right) */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
              aria-label="Open profile menu"
            >
              <UserAvatar
                firstName={convexUser?.first_name || user?.firstName || ""}
                lastName={convexUser?.last_name || user?.lastName || ""}
                imageUrl={user?.imageUrl}
                size={36}
              />
              <span className="text-gray-800 font-medium whitespace-nowrap">
                {formatName()}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isProfileDropdownOpen ? "rotate-180" : "rotate-0"}`}
                aria-hidden="true"
              />
            </button>
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50 text-gray-800">
                <Link
                  href={`/student/${studentId}/member/profile`}
                  onClick={(e) => {
                    handleNavClick(`/student/${studentId}/member/profile`, e);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2"
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
                href={`/student/${studentId}/member/home`}
                onClick={(e) =>
                  handleNavClick(`/student/${studentId}/member/home`, e)
                }
                className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/student/${studentId}/member/home`) ? "underline italic" : ""}`}
              >
                <FaHome size={20} />
                Home
              </Link>
            </li>

            <li className="font-semibold text-white">|</li>

            {/* Tasks Link */}
            <li>
              <Link
                href={`/student/${studentId}/member/tasks`}
                onClick={(e) =>
                  handleNavClick(`/student/${studentId}/member/tasks`, e)
                }
                className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/student/${studentId}/member/tasks`) ? "underline italic" : ""}`}
              >
                <FaClipboardList size={20} />
                Tasks
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
