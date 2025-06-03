"use client";

import { useSignIn } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import * as Label from "@radix-ui/react-label";

interface ClerkError {
  errors: Array<{
    message: string;
    code?: string;
  }>;
}

const LoginPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, router]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#B54A4A] flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Desktop Only</h1>
          <p className="text-lg">Please access this application from a desktop device for the best experience.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      setLoading(true);
      setError("");

      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        setError("Incorrect Login Credentials. Please try again.");
      }
      
    } catch (err) {
      const clerkError = err as ClerkError;
      setError(clerkError.errors?.[0]?.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white">
      {/* Left Section */}
      <div className="w-full md:w-[65%] bg-gradient-to-r from-white to-gray-200 border-l-8 border-[#B54A4A] flex flex-col items-center justify-center p-8 md:p-12 shadow-lg">
        <div className="text-center max-w-2xl">
          <Image
            src="/doctask.ico"
            alt="DocTask Logo"
            width={180}
            height={180}
            className="rounded-full mb-8 mx-auto shadow-xl border-4 border-black"
          />
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-wider">DOCTASK</h1>
          <p className="text-gray-600 text-lg md:text-xl leading-relaxed mx-auto max-w-md font-light">
            A Collaborative Documentation and Management Desktop Web App
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full md:w-[35%] bg-[#B54A4A] flex flex-col items-center justify-center p-8 md:p-12 relative shadow-2xl">
        <div className="max-w-sm w-full space-y-8 z-10">
          <div className="text-center mb-8">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-3">Login</h2>
            <p className="text-white text-lg md:text-2xl font-light">Login To Your Account</p>
          </div>

          {/* Sign In Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="relative">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
                <FaEnvelope color="#9CA3AF" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm"
                placeholder="Email"
              />
            </div>
            <div className="relative">
              <Label.Root htmlFor="password" className="sr-only">
                Password
              </Label.Root>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
                <FaLock color="#9CA3AF" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-20"
              >
                {showPassword ? <FaEye color="#9CA3AF" /> : <FaEyeSlash color="#9CA3AF" />}
              </button>
            </div>

            {error && (
              <div className="text-red-300 text-sm text-center mt-4">{error}</div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? "Signing In..." : "Log In"}
                <svg 
                  className="ml-2 w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M14 5l7 7m0 0l-7 7m7-7H3" 
                  />
                </svg>
              </button>
            </div>
            <div className="text-sm text-right mt-2">
              <Link
                href="/forgot-password"
                className="font-medium text-red-200 hover:text-red-100"
              >
                Forgot Password?
              </Link>
            </div>

          </form>

          {/* College of Computer Studies Text */}
          <div className="absolute bottom-6 right-6 text-sm text-red-200 font-light">
              College of Computer Studies
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;