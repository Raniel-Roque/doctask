"use client";

import { useState } from "react";
import { useSignIn, useClerk } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

const ForgotPasswordPage = () => {
  const { isLoaded, signIn } = useSignIn();
  const { signOut } = useClerk();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: 2FA, 3: New Password

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

      // If email exists, initiate password reset
      const result = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      if (result.status === "needs_first_factor") {
        setStep(2);
        setError(""); // Clear any previous errors
        // Add a success message about checking spam
        const successMessage = document.createElement("div");
        successMessage.className = "text-green-300 text-sm text-center mt-4";
        successMessage.innerHTML = "Verification code sent! Please check your email, including the spam folder if you don't see it in your inbox.";
        const form = document.querySelector("form");
        if (form) {
          form.insertBefore(successMessage, form.firstChild);
        }
      } else if (result.status === "complete") {
        // If somehow the reset is already complete, redirect to login
        router.push("/login");
      } else {
        setError("Failed to initiate password reset. Please try again.");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      setLoading(true);
      setError("");

      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });

      if (result.status === "needs_new_password") {
        setStep(3);
      } else {
        setError("Invalid code. Please try again.");
      }
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password requirements
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await signIn.resetPassword({
        password: newPassword,
      });

      if (result.status === "complete") {
        // Update Convex database to mark email as verified
        // Fetch user by email to get userId
        const userRes = await fetch("/api/convex/get-user-by-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        if (!userRes.ok) {
          throw new Error("Failed to fetch user for verification update");
        }
        const user = await userRes.json();
        // Call a new API endpoint or directly use Convex client to update email_verified
        // For now, assume a new API endpoint /api/convex/mark-email-verified
        const verifyRes = await fetch("/api/convex/mark-email-verified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id })
        });
        if (!verifyRes.ok) {
          throw new Error("Failed to update verification status");
        }
        // Sign out all sessions
        await signOut();
        // Redirect to login
        router.push("/login");
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setError("Failed to reset password. Please try again.");
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
        strategy: "reset_password_email_code",
        identifier: email,
      });

      if (result.status === "needs_first_factor") {
        setError(""); // Clear any previous errors
        // Add a success message about checking spam
        const successMessage = document.createElement("div");
        successMessage.className = "text-green-300 text-sm text-center mt-4";
        successMessage.innerHTML = "Verification code resent! Please check your email, including the spam folder if you don't see it in your inbox.";
        const form = document.querySelector("form");
        if (form) {
          form.insertBefore(successMessage, form.firstChild);
        }
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } catch (error) {
      console.error("Resend code error:", error);
      setError("An error occurred. Please try again.");
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
            <h2 className="text-4xl font-bold text-white mb-3">Forgot Password</h2>
            <p className="text-white text-lg md:text-2xl font-light">
              {step === 1 && "Enter your email"}
              {step === 2 && "Enter verification code"}
              {step === 3 && "Enter new password"}
            </p>
          </div>

          {step === 1 && (
            <form className="mt-8 space-y-6" onSubmit={handleEmailSubmit}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
                  <FaEnvelope color="#9CA3AF" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm"
                  placeholder="Email"
                />
              </div>

              {error && (
                <div className="text-red-300 text-sm text-center">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {loading ? "Sending..." : "Send Code"}
                </button>
              </div>

              <div className="text-sm text-center">
                <Link
                  href="/login"
                  className="font-medium text-red-200 hover:text-red-100"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          {step === 2 && (
            <form className="mt-8 space-y-6" onSubmit={handleCodeSubmit}>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm"
                  placeholder="Enter verification code"
                />
              </div>

              {error && (
                <div className="text-red-300 text-sm text-center">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </div>

              <div className="text-sm text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="font-medium text-red-200 hover:text-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Didn&apos;t receive a code? Click here to resend
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form className="mt-8 space-y-6" onSubmit={handlePasswordSubmit}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
                  <FaLock color="#9CA3AF" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm"
                  placeholder="New Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-20"
                >
                  {showPassword ? <FaEye color="#9CA3AF" /> : <FaEyeSlash color="#9CA3AF" />}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
                  <FaLock color="#9CA3AF" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm"
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-20"
                >
                  {showConfirmPassword ? <FaEye color="#9CA3AF" /> : <FaEyeSlash color="#9CA3AF" />}
                </button>
              </div>

              {error && (
                <div className="text-red-300 text-sm text-center">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}

          {/* College of Computer Studies Text */}
          <div className="absolute bottom-6 right-6 text-sm text-red-200 font-light">
            College of Computer Studies
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 