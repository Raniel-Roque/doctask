"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation"; 

interface NavbarProps {
  adminId: string;
}

export const Navbar = ({ adminId }: NavbarProps) => {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-white shadow-md">
      {/* Top Section */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-200">
        <Link href={`/admin/${adminId}/home`} className="flex items-center gap-3">
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
              href={`/admin/${adminId}/home`}
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/admin/${adminId}/home`) ? 'underline' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Home
            </Link>
          </li>

          <li className="font-semibold text-white">|</li>

          {/* Assign Link */}
          <li>
            <Link
              href={`/admin/${adminId}/groups`}
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/admin/${adminId}/groups`) ? 'underline' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              Groups
            </Link>
          </li>

          <li className="font-semibold text-white">|</li>

          {/* Logs Link */}
          <li>
            <Link
              href={`/admin/${adminId}/logs`}
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200 ${isActive(`/admin/${adminId}/logs`) ? 'underline' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Logs
            </Link>
          </li>

          {/* Logout Link */}
          <li className="ml-auto">
            <Link
              href="/logout"
              className={`flex items-center gap-2 hover:text-gray-300 transition-colors duration-200`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
              Logout
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};
