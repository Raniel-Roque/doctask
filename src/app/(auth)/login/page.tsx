"use client";

import { useSignIn } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';
import * as Label from "@radix-ui/react-label";

interface ClerkError {
  errors: Array<{
    message: string;
    code?: string;
  }>;
}

const LoginPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn, signOut } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: Verification Code, 3: Password
  const [resentSuccess, setResentSuccess] = useState(false);

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

  useEffect(() => {
    setResentSuccess(false);
  }, [step]);

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      setLoading(true);
      setError("");

      // First check if email exists in our database
      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!data.exists) {
        setError("Email not found in our system");
        return;
      }

      // Check if email is verified in Convex
      const userRes = await fetch("/api/convex/get-user-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!userRes.ok) {
        throw new Error("Failed to fetch user verification status");
      }

      const user = await userRes.json();
      
      if (user.email_verified) {
        // If email is verified, proceed to password step
        setStep(3);
      } else {
        // If email is not verified, send verification code
        const result = await signIn.create({
          strategy: "email_code",
          identifier: email,
        });

        if (result.status === "needs_first_factor") {
          setStep(2);
          setError(""); // Clear any previous errors
        } else {
          setError("Failed to send verification code. Please try again.");
        }
      }
    } catch (error) {
      console.error("Email verification error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setResentSuccess(false);

    try {
      setLoading(true);
      setError("");

      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete") {
        // Update Convex database to mark email as verified
        const userRes = await fetch("/api/convex/get-user-by-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        
        if (!userRes.ok) {
          throw new Error("Failed to fetch user for verification update");
        }
        
        const user = await userRes.json();
        
        // Update email_verified status
        const verifyRes = await fetch("/api/convex/mark-email-verified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id })
        });
        
        if (!verifyRes.ok) {
          throw new Error("Failed to update verification status");
        }

        // Sign out to clear the session before moving to password step
        setError(""); // Clear any errors
        await signOut();
      } else {
        setError("Invalid code. Please try again.");
      }
    } catch (error) {
      console.error("Code verification error:", error);
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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
        setError("Incorrect password. Please try again.");
      }
    } catch (err) {
      const clerkError = err as ClerkError;
      setError(clerkError.errors?.[0]?.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;

    try {
      setLoading(true);
      setError("");

      const result = await signIn.create({
        strategy: "email_code",
        identifier: email,
      });

      if (result.status === "needs_first_factor") {
        setError(""); // Clear any previous errors
        setResentSuccess(true);
      } else {
        setError("Failed to resend code. Please try again.");
        setResentSuccess(false);
      }
    } catch (error) {
      console.error("Resend code error:", error);
      setError("An error occurred. Please try again.");
      setResentSuccess(false);
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
        <div className="max-w-sm w-full space-y-8 z-10 relative pb-16">
          {/* Back Button for step 2 and 3 */}
          {(step === 2 || step === 3) && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="absolute top-0 left-0 flex items-center text-white hover:text-gray-200 focus:outline-none z-20"
              style={{ marginTop: '-2rem', marginLeft: '-1rem' }}
            >
              <FaArrowLeft className="mr-2" /> Back
            </button>
          )}
          <div className="text-center mb-8">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-3">Login</h2>
            <p className="text-white text-lg md:text-2xl font-light">
              {step === 1 && "Enter your email"}
              {step === 2 && "Enter verification code"}
              {step === 3 && "Enter your password"}
            </p>
          </div>

          {/* Sign In Form */}
          <form className="mt-8 space-y-6" onSubmit={
            step === 1 ? handleEmailSubmit :
            step === 2 ? handleCodeSubmit :
            handlePasswordSubmit
          }>
            {step === 1 && (
            <div className="relative">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="absolute left-0 top-0 bottom-0 flex items-center h-full pl-3 pointer-events-none z-20">
                <FaEnvelope color="#B54A4A" size={18} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full pl-10 pr-3 h-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white"
                placeholder="Email"
              />
            </div>
            )}

            {step === 2 && (
              <div>
                {resentSuccess && (
                  <div className="text-green-300 text-sm text-center mb-2">Verification code sent! Please check your email, including the spam folder if you don&apos;t see it in your inbox.</div>
                )}
                <div className="relative">
                  <label htmlFor="code" className="sr-only">
                    Verification Code
                  </label>
                  <div className="absolute left-0 top-0 bottom-0 flex items-center h-full pl-3 pointer-events-none z-20">
                    <FaEnvelope color="#B54A4A" size={18} />
                  </div>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full pl-10 pr-3 h-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white"
                    placeholder="Enter verification code"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
            <div className="relative">
              <Label.Root htmlFor="password" className="sr-only">
                Password
              </Label.Root>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                <FaLock color="#B54A4A" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white"
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
            )}

            {error && (
              <div className="text-red-300 text-sm text-center mt-4">{error}</div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? "Processing..." : 
                  step === 1 ? "Continue" :
                  step === 2 ? "Verify Code" :
                  "Log In"
                }
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
              {step === 2 && (
                <div className="text-sm text-center mt-4">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="font-medium text-red-200 hover:text-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Didn&apos;t receive a code? Click here to resend
                  </button>
                </div>
              )}
            </div>

            {step === 3 && (
            <div className="text-sm text-right mt-2">
              <Link
                href="/forgot-password"
                className="font-medium text-red-200 hover:text-red-100"
              >
                Forgot Password?
              </Link>
            </div>
            )}
          </form>
        </div>
        {/* College of Computer Studies Text - always at the bottom right of the red container */}
        <div className="absolute bottom-0 right-0 mb-4 mr-4 text-sm text-red-200 font-light select-none">
              College of Computer Studies
        </div>
      </div>
    </div>
  );
};

export default LoginPage;