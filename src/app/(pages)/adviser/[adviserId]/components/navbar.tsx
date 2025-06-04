"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/clerk-react";
import { useState } from "react";
import { FaHome, FaSignOutAlt } from "react-icons/fa";
import { LogoutConfirmation } from "../../../components/LogoutConfirmation";

interface NavbarProps {
  adviserId: string;
}

export const Navbar = ({ adviserId }: NavbarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white shadow-md">
      {/* Top Section */}
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
