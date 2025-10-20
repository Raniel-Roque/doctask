"use client";

import { useSignIn, useUser } from "@clerk/clerk-react";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { FaArrowLeft } from "react-icons/fa";
import EmailInput from "../components/EmailInput";
import VerifyCodeInput from "../components/VerifyCodeInput";
import PasswordInput from "../components/PasswordInput";
import ResetCodeInput from "../components/ResetCodeInput";
import ResetPasswordInput from "../components/ResetPasswordInput";
import ResendTimer from "../components/ResendTimer";
import BackdoorPanel from "../components/BackdoorPanel";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import { calculatePasswordStrength } from "@/utils/passwordStrength";
import { apiRequest } from "@/lib/utils";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";

interface ClerkError {
  errors: Array<{
    message: string;
    code?: string;
  }>;
}

interface EmailCheckResponse {
  exists: boolean;
}

interface UserResponse {
  _id: string;
  email_verified: boolean;
  first_name: string;
  last_name: string;
}

const LoginPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { addBanner } = useBannerManager();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: Verification Code, 3: Password, 4: Reset Password
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(false); // false: login, true: forgot password
  const [forgotStepIndex, setForgotStepIndex] = useState(0); // 0: code, 1: reset password
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [showBackdoor, setShowBackdoor] = useState(false);
  const [backdoorLoading, setBackdoorLoading] = useState(false);

  // Helper function to show notifications using the new banner system
  const showNotification = useCallback(
    (message: string, type: "error" | "success" | "warning" | "info") => {
      addBanner({
        message,
        type,
        onClose: () => {}, // Banner will auto-close
        autoClose: true,
      });
    },
    [addBanner],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check for success parameters in URL after mount
    if (mounted) {
      const urlParams = new URLSearchParams(window.location.search);
      const successPassword = urlParams.get("successpassword");
      const successVerify = urlParams.get("successverify");
      const successRestore = urlParams.get("successrestore");

      if (successPassword === "true") {
        showNotification(
          "Password reset successful! Please log in with your new password.",
          "success",
        );
      } else if (successVerify === "true") {
        showNotification(
          "Email verified successfully! Please log in with your password.",
          "success",
        );
      } else if (successRestore === "true") {
        showNotification(
          "Database has been restored successfully! Please check your email for the new password.",
          "success",
        );
      }
    }
  }, [router, mounted, showNotification]);

  useEffect(() => {
    // Check for restore banner flag in localStorage after mount
    if (mounted && localStorage.getItem("showRestoreBanner") === "true") {
      showNotification(
        "Database has been restored successfully! Please check your email for the new password.",
        "success",
      );
      localStorage.removeItem("showRestoreBanner");
    }
  }, [mounted, showNotification]);

  useEffect(() => {
    if (mounted) {
      setIsClient(true);

      const checkMobile = () => {
        setIsMobile(window.innerWidth < 1024);
      };

      checkMobile();
      window.addEventListener("resize", checkMobile);

      return () => window.removeEventListener("resize", checkMobile);
    }
  }, [mounted]);

  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [step, forgotStep, forgotStepIndex]);

  // Redirect if user is already authenticated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Redirect to root page to let the SmartRedirect handle the navigation
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, user, router]);

  // Avoid SSR/CSR mismatch by rendering only after mount
  if (!mounted) return null;

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#B54A4A] flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Desktop Only</h1>
          <p className="text-lg">
            Please access this application from a desktop device for the best
            experience.
          </p>
        </div>
      </div>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    // Prevent submission if email is empty
    if (!email || email.trim() === "") {
      showNotification("Please enter your email address", "error");
      return;
    }

    // Convert email to lowercase only when submitting
    const emailToCheck = email.toLowerCase();

    // Custom email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToCheck)) {
      showNotification("Please enter a valid email address", "error");
      return;
    }

    try {
      setLoading(true);

      // Check session-based rate limiting to prevent navigation bypass
      const sessionRateLimitKey = `sessionEmailRateLimit_${emailToCheck}`;
      const sessionData = localStorage.getItem(sessionRateLimitKey);
      const now = Date.now();

      if (sessionData) {
        const { count, resetTime } = JSON.parse(sessionData);
        if (now < resetTime && count >= 5) {
          showNotification(
            "Too many email submission attempts. Please wait before trying again.",
            "error",
          );
          return;
        }
      }

      // Check if email exists in our database with enhanced retry logic
      const data = await apiRequest<EmailCheckResponse>(
        "/api/convex/get-user-by-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToCheck, checkOnly: true }),
        },
      );

      if (!data.exists) {
        showNotification("Email not found", "error");
        return;
      }

      // Get full user info for verification status with enhanced retry logic
      const user = await apiRequest<UserResponse>(
        "/api/convex/get-user-by-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToCheck }),
        },
      );

      if (user.email_verified) {
        // If email is verified, proceed to password step
        setStep(3);
        // Clear any existing notifications
        setCode("");
      } else {
        // If email is not verified, check if there's an active timer
        const timerKey = `resendTimer_${emailToCheck}`;
        const storedTimer = localStorage.getItem(timerKey);
        let shouldSendCode = true;

        if (storedTimer) {
          const { resetTime } = JSON.parse(storedTimer);
          const now = Date.now();
          if (now < resetTime) {
            // Timer is still active, don't send code automatically
            shouldSendCode = false;
          }
        }

        // Store flag to indicate if we should send code when verify input loads
        localStorage.setItem(
          `shouldSendCode_${emailToCheck}`,
          shouldSendCode.toString(),
        );

        if (shouldSendCode) {
          // Send verification code only if no active timer
          const result = await signIn.create({
            strategy: "email_code",
            identifier: emailToCheck,
          });

          if (result.status === "needs_first_factor") {
            setStep(2);
            showNotification(
              "A new verification code has been sent to your email. Please check your inbox and spam folder.",
              "success",
            );
            setCode("");

            // Update session-based rate limit after successful email submission
            const sessionRateLimitKey = `sessionEmailRateLimit_${emailToCheck}`;
            const storedSessionData = localStorage.getItem(sessionRateLimitKey);
            const now = Date.now();

            if (storedSessionData) {
              const { count, resetTime: oldResetTime } =
                JSON.parse(storedSessionData);
              if (now < oldResetTime) {
                localStorage.setItem(
                  sessionRateLimitKey,
                  JSON.stringify({ count: count + 1, resetTime: oldResetTime }),
                );
              } else {
                localStorage.setItem(
                  sessionRateLimitKey,
                  JSON.stringify({ count: 1, resetTime: now + 600000 }), // 10 minutes
                );
              }
            } else {
              localStorage.setItem(
                sessionRateLimitKey,
                JSON.stringify({ count: 1, resetTime: now + 600000 }), // 10 minutes
              );
            }
          } else {
            showNotification(
              "Failed to send verification code. Please try again.",
              "error",
            );
          }
        } else {
          // Just proceed to verification step without sending code
          setStep(2);
          // Clear any existing notifications
          setCode("");
        }
      }
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        ErrorContexts.fetchData("user"),
      );
      showNotification(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAutocomplete = async (email: string) => {
    if (!isLoaded) return;

    // Custom email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showNotification("Please enter a valid email address", "error");
      return;
    }

    try {
      setLoading(true);

      setEmail(email);

      // Check if email exists in our database with enhanced retry logic
      const data = await apiRequest<EmailCheckResponse>(
        "/api/convex/get-user-by-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, checkOnly: true }),
        },
      );

      if (!data.exists) {
        showNotification("Email not found", "error");
        return;
      }

      // Get full user info for verification status with enhanced retry logic
      const user = await apiRequest<UserResponse>(
        "/api/convex/get-user-by-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      if (user.email_verified) {
        // If email is verified, try to auto-login if password is present
        if (password) {
          // Try to log in
          setLoading(true);
          setStep(3); // Show password step in case login fails
          try {
            const result = await signIn.create({
              identifier: email,
              password,
            });
            if (result.status === "complete") {
              await setActive({ session: result.createdSessionId });
              // Update both localStorage and secure storage for session timeout
              const now = Date.now();
              localStorage.setItem("lastActivityTimestamp", now.toString());
              // Also update secure storage to prevent immediate timeout
              if (typeof window !== "undefined") {
                const { secureStorage } = await import("@/lib/secure-storage");
                secureStorage.set("lastActivityTimestamp", now);
                // Clear any old session data that might interfere
                secureStorage.remove("viewedNotesDocuments");
                secureStorage.remove("viewedNoteCounts");
              }
              return; // Success, user will be redirected
            } else {
              showNotification(
                "Incorrect password. Please try again.",
                "error",
              );
            }
          } catch (err) {
            const clerkError = err as ClerkError;
            showNotification(
              clerkError.errors?.[0]?.message ||
                "An error occurred during sign in",
              "error",
            );
          } finally {
            setLoading(false);
          }
        } else {
          // No password present, show password step
          setStep(3);
        }
      } else {
        // If email is not verified, check if there's an active timer
        const timerKey = `resendTimer_${email}`;
        const storedTimer = localStorage.getItem(timerKey);
        let shouldSendCode = true;

        if (storedTimer) {
          const { resetTime } = JSON.parse(storedTimer);
          const now = Date.now();
          if (now < resetTime) {
            // Timer is still active, don't send code automatically
            shouldSendCode = false;
          }
        }

        // Store flag to indicate if we should send code when verify input loads
        localStorage.setItem(
          `shouldSendCode_${email}`,
          shouldSendCode.toString(),
        );

        if (shouldSendCode) {
          // Send verification code only if no active timer
          const result = await signIn.create({
            strategy: "email_code",
            identifier: email,
          });

          if (result.status === "needs_first_factor") {
            setStep(2);
            showNotification(
              "A new verification code has been sent to your email. Please check your inbox and spam folder.",
              "success",
            );
            setCode("");
          } else {
            showNotification(
              "Failed to send verification code. Please try again.",
              "error",
            );
          }
        } else {
          // Just proceed to verification step without sending code
          setStep(2);
          // Clear any existing notifications
          setCode("");
        }
      }
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        ErrorContexts.fetchData("user"),
      );
      showNotification(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    // Prevent submission if verification code is empty
    if (!code || code.trim() === "") {
      showNotification(
        "Please enter the verification code sent to your email",
        "error",
      );
      return;
    }

    if (code.length !== 6) {
      showNotification("Verification code must be exactly 6 digits", "error");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      showNotification("Verification code must contain only numbers", "error");
      return;
    }

    try {
      setLoading(true);

      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete") {
        try {
          // Update Convex database to mark email as verified
          // Get user data with enhanced retry logic
          const user = await apiRequest<UserResponse>(
            "/api/convex/get-user-by-email",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            },
          );

          // Call the mark-email-verified API to update the user's email verification status with enhanced retry logic
          await apiRequest("/api/convex/mark-email-verified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user._id }),
          });

          // Clear resend timer to allow resending on subsequent attempts
          const timerKey = `resendTimer_${email}`;
          localStorage.removeItem(timerKey);

          // Clear the code input
          setCode("");

          // Sign out and redirect to login with success message
          await signOut();
          router.push("/login?successverify=true");
          localStorage.setItem("lastActivityTimestamp", Date.now().toString());
        } catch {
          await signOut();
          setStep(1);
          setCode("");
          showNotification(
            "Email verified but failed to update database. Please try logging in again.",
            "warning",
          );
        }
      } else {
        showNotification(
          "Invalid verification code. Please check your email and try again.",
          "error",
        );
        setCode(""); // Clear the code input on error
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      if (errorMessage.toLowerCase().includes("expired")) {
        showNotification(
          "Verification code has expired. Please request a new code.",
          "error",
        );
      } else if (errorMessage.toLowerCase().includes("invalid")) {
        showNotification(
          "Invalid verification code. Please check your email and try again.",
          "error",
        );
      } else {
        showNotification(
          "Verification failed. Please try again or request a new code.",
          "error",
        );
      }
      setCode(""); // Clear the code input on error
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    // Prevent submission if password is empty
    if (!password || password.trim() === "") {
      showNotification("Please enter your password", "error");
      return;
    }

    try {
      setLoading(true);

      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Update both localStorage and secure storage for session timeout
        const now = Date.now();
        localStorage.setItem("lastActivityTimestamp", now.toString());
        // Also update secure storage to prevent immediate timeout
        if (typeof window !== "undefined") {
          const { secureStorage } = await import("@/lib/secure-storage");
          secureStorage.set("lastActivityTimestamp", now);
          // Clear any old session data that might interfere
          secureStorage.remove("viewedNotesDocuments");
          secureStorage.remove("viewedNoteCounts");
        }
      } else {
        showNotification("Incorrect password. Please try again.", "error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";

      // Check for compromised password error first
      if (
        errorMessage.toLowerCase().includes("compromised") ||
        errorMessage.toLowerCase().includes("pwned") ||
        errorMessage.toLowerCase().includes("breach") ||
        errorMessage.toLowerCase().includes("data breach") ||
        errorMessage.toLowerCase().includes("password has been compromised")
      ) {
        showNotification(
          "This password has been compromised in a data breach. Please use forgot password.",
          "error",
        );
      } else if (
        errorMessage.includes("Your account is locked") ||
        errorMessage.includes("account is locked")
      ) {
        showNotification(
          "Your account is locked. Please try again later or contact your capstone instructor.",
          "error",
        );
      } else if (
        errorMessage.toLowerCase().includes("password") ||
        errorMessage.toLowerCase().includes("invalid credentials") ||
        errorMessage.toLowerCase().includes("incorrect")
      ) {
        showNotification("Incorrect password. Please try again.", "error");
      } else {
        showNotification("An error occurred during sign in", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (): Promise<boolean> => {
    if (!isLoaded) return false;

    // Check if there's an existing timer
    const timerKey = `resendTimer_${email}`;
    const storedTimer = localStorage.getItem(timerKey);
    if (storedTimer) {
      const { resetTime } = JSON.parse(storedTimer);
      const now = Date.now();
      if (now < resetTime) {
        // Timer is still active, show user feedback
        const remainingTime = Math.ceil((resetTime - now) / 1000);
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        showNotification(
          `Please wait ${minutes}:${seconds.toString().padStart(2, "0")} before requesting another code.`,
          "warning",
        );
        return false;
      }
    }

    try {
      setSendingCode(true);

      const result = await signIn.create({
        strategy: "email_code",
        identifier: email,
      });

      if (result.status === "needs_first_factor") {
        // Clear the shouldSendCode flag since we just sent a code
        localStorage.removeItem(`shouldSendCode_${email}`);

        // Rate limit tracking is now handled by the ResendTimer component

        showNotification(
          "A new verification code has been sent to your email. Please check your inbox and spam folder.",
          "success",
        );
        return true;
      } else {
        showNotification("Failed to send new code. Please try again.", "error");
        return false;
      }
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        ErrorContexts.fetchData("user"),
      );
      showNotification(errorMessage, "error");
      return false;
    } finally {
      setSendingCode(false);
    }
  };

  const handleForgotPasswordResendCode = async (): Promise<boolean> => {
    if (!isLoaded) return false;

    // Check if there's an existing timer for forgot password
    const timerKey = `forgotPasswordResendTimer_${email}`;
    const storedTimer = localStorage.getItem(timerKey);
    if (storedTimer) {
      const { resetTime } = JSON.parse(storedTimer);
      const now = Date.now();
      if (now < resetTime) {
        // Timer is still active, show user feedback
        const remainingTime = Math.ceil((resetTime - now) / 1000);
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        showNotification(
          `Please wait ${minutes}:${seconds.toString().padStart(2, "0")} before requesting another password reset code.`,
          "warning",
        );
        return false;
      }
    }

    try {
      setSendingCode(true);

      const result = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      if (result.status === "needs_first_factor") {
        // Clear the shouldSendForgotPasswordCode flag since we just sent a code
        localStorage.removeItem(`shouldSendForgotPasswordCode_${email}`);

        // Timer and rate limit tracking is now handled by the ForgotPasswordResendTimer component

        showNotification(
          "A new password reset code has been sent to your email. Please check your inbox and spam folder.",
          "success",
        );
        return true;
      } else {
        showNotification("Failed to send new code. Please try again.", "error");
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";

      // Check for account locked error specifically
      if (
        errorMessage.includes("Your account is locked") ||
        errorMessage.includes("account is locked")
      ) {
        showNotification(
          "Your account is locked. Please try again later or contact your capstone instructor.",
          "error",
        );
      } else {
        const genericErrorMessage = getErrorMessage(
          err,
          ErrorContexts.fetchData("user"),
        );
        showNotification(genericErrorMessage, "error");
      }
      return false;
    } finally {
      setSendingCode(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotStep(true);
    setStep(4);
    setForgotStepIndex(0);
    // Clear any existing notifications
    setCode("");
    setPassword("");
    setConfirmPassword("");

    // Check if there's an active timer for forgot password
    const timerKey = `forgotPasswordResendTimer_${email}`;
    const storedTimer = localStorage.getItem(timerKey);
    let shouldSendCode = true;

    if (storedTimer) {
      const { resetTime } = JSON.parse(storedTimer);
      const now = Date.now();
      if (now < resetTime) {
        // Timer is still active, don't send code automatically
        shouldSendCode = false;
      }
    }

    if (shouldSendCode) {
      // Send password reset code only if no active timer
      if (!isLoaded || !signIn) return;

      try {
        setSendingCode(true);
        const result = await signIn.create({
          strategy: "reset_password_email_code",
          identifier: email,
        });

        if (result.status === "needs_first_factor") {
          setForgotStepIndex(0);
          showNotification(
            "A new password reset code has been sent to your email. Please check your inbox and spam folder.",
            "success",
          );
          setCode("");
        } else {
          showNotification(
            "Failed to send password reset code. Please try again.",
            "error",
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "";

        // Check for account locked error specifically
        if (
          errorMessage.includes("Your account is locked") ||
          errorMessage.includes("account is locked")
        ) {
          showNotification(
            "Your account is locked. Please try again later or contact your capstone instructor.",
            "error",
          );
        } else {
          const genericErrorMessage = getErrorMessage(
            err,
            ErrorContexts.fetchData("user"),
          );
          showNotification(genericErrorMessage, "error");
        }
      } finally {
        setSendingCode(false);
      }
    } else {
      // Just proceed to reset code step without sending code
      setForgotStepIndex(0);
      setCode("");
    }
  };

  const handleBack = () => {
    if (step === 2) {
      // If on verification code step, go back to email input (step 1)
      setStep(1);
      setCode("");
    } else if (step === 3 && !forgotStep) {
      // If on password step (normal login), go back to email input
      setStep(1);
      setPassword("");
    } else if (step === 4 && forgotStep) {
      // If in forgot password flow
      if (forgotStepIndex === 1) {
        // If on reset password input, go back to password step (step 3)
        setForgotStep(false);
        setStep(3);
        setPassword("");
        setConfirmPassword("");
      } else if (forgotStepIndex === 0) {
        // If on reset code input, go back to password step (step 3)
        setForgotStep(false);
        setStep(3);
        setCode("");
      }
    }
  };

  const handleBackdoorTrigger = () => {
    setShowBackdoor(true);
    setEmail(""); // Clear the email field
  };

  const handleBackdoorLogin = async (username: string, password: string) => {
    try {
      setBackdoorLoading(true);

      const response = await fetch("/api/backdoor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Backdoor access failed");
      }

      if (data.success && data.newCredentials) {
        // Account replacement successful, now log in with new credentials
        const { email, password: newPassword } = data.newCredentials;
        
        // Set the email and password for normal login
        setEmail(email);
        setPassword(newPassword);
        
        // Close backdoor panel
        setShowBackdoor(false);
        
        // Show success message
        showNotification("Instructor account credentials updated. Logging in...", "success");
        
        // Automatically proceed to password step and login
        setStep(3);
        
        // Wait a moment then attempt login
        setTimeout(async () => {
          try {
            if (!signIn) {
              showNotification("Sign in not available. Please try manually.", "error");
              return;
            }

            const result = await signIn.create({
              identifier: email,
              password: newPassword,
            });

            if (result.status === "complete" && setActive) {
              await setActive({ session: result.createdSessionId });
              
              const now = Date.now();
              localStorage.setItem("lastActivityTimestamp", now.toString());
              
              if (typeof window !== "undefined") {
                const { secureStorage } = await import("@/lib/secure-storage");
                secureStorage.set("lastActivityTimestamp", now);
                secureStorage.remove("viewedNotesDocuments");
                secureStorage.remove("viewedNoteCounts");
              }

              showNotification("Successfully logged in with updated instructor account.", "success");
              router.replace("/");
            } else {
              showNotification("Failed to login with new credentials. Please try manually.", "error");
            }
          } catch {
            showNotification("Account updated but login failed. Please try manually.", "error");
          }
        }, 1000);
      }
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Emergency access failed",
        "error"
      );
    } finally {
      setBackdoorLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white">
      {/* Left Section */}
      <div className="w-full md:w-[65%] bg-gradient-to-r from-white to-gray-200 border-l-8 border-[#B54A4A] flex flex-col items-center justify-center p-8 md:p-12 shadow-lg">
        <div className="text-center max-w-2xl">
          <Image
            src="/doctask.webp"
            alt="DocTask Logo"
            width={180}
            height={180}
            priority
            fetchPriority="high"
            sizes="(max-width: 768px) 120px, 180px"
            className="rounded-full mb-8 mx-auto shadow-xl border-4 border-black"
          />
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-wider">
            DOCTASK
          </h1>
          <p className="text-gray-600 text-lg md:text-xl leading-relaxed mx-auto max-w-md font-light">
            A Collaborative Documentation and Management Desktop Web App
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full md:w-[35%] bg-[#B54A4A] flex flex-col items-center justify-center p-8 md:p-12 relative shadow-2xl">
        <div className="w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl space-y-8 z-10 relative pb-16">
          {/* Back Button for steps 2, 3, 4 */}
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={sendingCode}
              className="absolute top-0 left-0 flex items-center text-white hover:text-gray-200 focus:outline-none z-20 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ marginTop: "-2rem", marginLeft: "-1rem" }}
            >
              <FaArrowLeft className="mr-2" /> Back
            </button>
          )}
          <div className="text-center mb-8">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-3">
              {forgotStep ? "Reset" : "Login"}
            </h2>
            <p className="text-white text-lg md:text-2xl font-light">
              {step === 1 && "Enter your email"}
              {step === 2 && "Enter verification code"}
              {step === 3 && "Enter your password"}
              {step === 4 && "Reset your password"}
            </p>
          </div>
          {/* Step 1: Email Input */}
          {step === 1 && (
            <form
              className="mt-8 space-y-6"
              onSubmit={handleEmailSubmit}
              autoComplete="on"
              action="#"
              method="post"
            >
              <EmailInput
                email={email}
                setEmail={setEmail}
                loading={loading}
                name="email"
                onAutocomplete={handleAutocomplete}
                onBackdoorTrigger={handleBackdoorTrigger}
              />
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {loading ? "Processing..." : "Continue"}
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
            </form>
          )}
          {/* Step 2: Verification Code */}
          {step === 2 && (
            <>
              {/* Back Button for verification step */}
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="absolute top-0 left-0 flex items-center text-white hover:text-gray-200 focus:outline-none z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ marginTop: "-2rem", marginLeft: "-1rem" }}
              >
                <FaArrowLeft className="mr-2" /> Back
              </button>
              <form className="mt-8 space-y-6" onSubmit={handleCodeSubmit}>
                <VerifyCodeInput
                  code={code}
                  setCode={setCode}
                  loading={loading}
                />
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
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
                  <ResendTimer
                    onResend={handleResendCode}
                    disabled={sendingCode}
                    loading={sendingCode}
                    email={email}
                  />
                </div>
              </form>
            </>
          )}
          {/* Step 3: Password Input with Forgot Password */}
          {step === 3 && !forgotStep && (
            <form
              className="mt-8 space-y-6"
              onSubmit={handlePasswordSubmit}
              autoComplete="on"
            >
              {/* Hidden username field for accessibility and password managers */}
              <input
                type="email"
                name="username"
                value={email.toLowerCase()}
                readOnly
                style={{ display: "none" }}
                autoComplete="username"
              />
              <PasswordInput
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                loading={loading}
                name="password"
                autoComplete="current-password"
              />
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {loading ? "Processing..." : "Log In"}
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
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingCode}
                  className="font-medium text-red-200 hover:text-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}
          {/* Step 4: Forgot Password Flow (sequential) */}
          {step === 4 && forgotStep && (
            <>
              {/* Back Button for forgot password sub-steps */}
              <button
                type="button"
                onClick={handleBack}
                disabled={sendingCode}
                className="absolute top-0 left-0 flex items-center text-white hover:text-gray-200 focus:outline-none z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ marginTop: "-2rem", marginLeft: "-1rem" }}
              >
                <FaArrowLeft className="mr-2" /> Back
              </button>
              {forgotStepIndex === 0 && (
                <>
                  <ResetCodeInput
                    code={code}
                    setCode={setCode}
                    loading={loading}
                    sendingCode={sendingCode}
                    email={email}
                    onResendCode={handleForgotPasswordResendCode}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!isLoaded) return;

                      // Prevent submission if verification code is empty
                      if (!code || code.trim() === "") {
                        showNotification(
                          "Please enter the verification code sent to your email",
                          "error",
                        );
                        return;
                      }

                      if (code.length !== 6) {
                        showNotification(
                          "Verification code must be exactly 6 digits",
                          "error",
                        );
                        return;
                      }

                      if (!/^\d{6}$/.test(code)) {
                        showNotification(
                          "Verification code must contain only numbers",
                          "error",
                        );
                        return;
                      }

                      setLoading(true);
                      try {
                        const result = await signIn.attemptFirstFactor({
                          strategy: "reset_password_email_code",
                          code,
                        });
                        if (result.status === "needs_new_password") {
                          setForgotStepIndex(1);
                        } else {
                          showNotification(
                            "Invalid verification code. Please check your email and try again.",
                            "error",
                          );
                        }
                      } catch (err) {
                        const errorMessage =
                          err instanceof Error ? err.message : "";
                        if (errorMessage.toLowerCase().includes("expired")) {
                          showNotification(
                            "Verification code has expired. Please request a new code.",
                            "error",
                          );
                        } else if (
                          errorMessage.toLowerCase().includes("invalid")
                        ) {
                          showNotification(
                            "Invalid verification code. Please check your email and try again.",
                            "error",
                          );
                        } else {
                          showNotification(
                            "Verification failed. Please try again or request a new code.",
                            "error",
                          );
                        }
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                </>
              )}
              {forgotStepIndex === 1 && (
                <ResetPasswordInput
                  newPassword={password}
                  setNewPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  showConfirmPassword={showConfirmPassword}
                  setShowConfirmPassword={setShowConfirmPassword}
                  loading={loading}
                  email={email}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!isLoaded) return;

                    // Clear any existing notifications
                    // Clear any existing notifications

                    // Prevent submission if passwords are empty
                    if (!password || password.trim() === "") {
                      showNotification(
                        "Please enter your new password",
                        "error",
                      );
                      return;
                    }

                    if (!confirmPassword || confirmPassword.trim() === "") {
                      showNotification(
                        "Please confirm your new password",
                        "error",
                      );
                      return;
                    }

                    // Basic validation to prevent submission when requirements aren't met
                    if (password !== confirmPassword) {
                      return; // Don't submit, let visual requirements show the error
                    }

                    // Check if password meets NIST standards
                    const passwordStrength =
                      calculatePasswordStrength(password);
                    if (!passwordStrength.isAcceptable) {
                      return; // Don't submit, let visual requirements show the error
                    }

                    setLoading(true);
                    try {
                      const result = await signIn.resetPassword({ password });
                      if (result.status === "complete") {
                        // Update Convex database to mark email as verified with enhanced retry logic
                        try {
                          const user = await apiRequest<UserResponse>(
                            "/api/convex/get-user-by-email",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email }),
                            },
                          );
                          await apiRequest("/api/convex/mark-email-verified", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: user._id }),
                          });
                        } catch (error) {
                          console.warn(
                            "Failed to update email verification status:",
                            error,
                          );
                        }

                        // Clear forgot password timer on successful reset
                        const timerKey = `forgotPasswordResendTimer_${email}`;
                        localStorage.removeItem(timerKey);

                        // Set success notification before signing out
                        showNotification(
                          "Password reset successful! Please log in with your new password.",
                          "success",
                        );

                        // Clear all form data
                        setCode("");
                        setPassword("");
                        setConfirmPassword("");
                        setForgotStep(false);
                        setForgotStepIndex(0);
                        setStep(1);

                        // Wait a moment for the success message to be visible, then sign out
                        setTimeout(async () => {
                          await signOut();
                          router.push("/login?successpassword=true");
                          localStorage.setItem(
                            "lastActivityTimestamp",
                            Date.now().toString(),
                          );
                        }, 2000); // Show success message for 2 seconds
                      } else {
                        showNotification(
                          "Failed to reset password. Please try again.",
                          "error",
                        );
                      }
                    } catch (err) {
                      const errorMessage =
                        err instanceof Error ? err.message : "";

                      // Check for compromised/weak password error
                      if (
                        errorMessage.toLowerCase().includes("compromised") ||
                        errorMessage.toLowerCase().includes("data breach") ||
                        errorMessage
                          .toLowerCase()
                          .includes("found in breach") ||
                        errorMessage.toLowerCase().includes("pwned") ||
                        errorMessage.toLowerCase().includes("weak") ||
                        errorMessage.toLowerCase().includes("common") ||
                        errorMessage.toLowerCase().includes("weak_password") ||
                        errorMessage
                          .toLowerCase()
                          .includes("password_strength") ||
                        errorMessage
                          .toLowerCase()
                          .includes("not strong enough") ||
                        errorMessage
                          .toLowerCase()
                          .includes("password is too weak") ||
                        errorMessage.toLowerCase().includes("too common") ||
                        errorMessage
                          .toLowerCase()
                          .includes("password is too common")
                      ) {
                        showNotification(
                          "Password is too weak. Please choose a stronger password.",
                          "error",
                        );
                      }
                      // Check for password validation errors
                      else if (
                        errorMessage
                          .toLowerCase()
                          .includes("password_validation") ||
                        errorMessage
                          .toLowerCase()
                          .includes("invalid password") ||
                        errorMessage
                          .toLowerCase()
                          .includes("password requirements")
                      ) {
                        showNotification(
                          "Password does not meet requirements. Please ensure it has at least 8 characters and is not too common.",
                          "error",
                        );
                      }
                      // Check for rate limiting
                      else if (
                        errorMessage.toLowerCase().includes("rate limit") ||
                        errorMessage
                          .toLowerCase()
                          .includes("too many requests") ||
                        errorMessage.toLowerCase().includes("try again later")
                      ) {
                        showNotification(
                          "Too many password reset attempts. Please wait a moment before trying again.",
                          "error",
                        );
                      }
                      // Generic error fallback
                      else {
                        showNotification(
                          "An error occurred while resetting your password. Please try again.",
                          "error",
                        );
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              )}
            </>
          )}
        </div>
        {/* Download Button - bottom left */}
        {isClient && typeof window !== "undefined" && !window.electron && (
          <div className="absolute bottom-0 left-0 mb-4 ml-4">
            <div className="relative group">
              <button
                onClick={() => {
                  // Detect user's operating system
                  const userAgent = navigator.userAgent.toLowerCase();
                  let downloadUrl = "";
                  let fileName = "";

                  if (userAgent.includes("win")) {
                    // Windows
                    downloadUrl =
                      "https://github.com/Raniel-Roque/doctask/releases/download/Windows/DocTask-Setup-1.0.0.exe";
                    fileName = "DocTask-Setup-1.0.0.exe";
                  } else if (userAgent.includes("mac")) {
                    // macOS
                    downloadUrl =
                      "https://github.com/Raniel-Roque/doctask/releases/download/MacOS/DocTask-1.0.0-mac.zip";
                    fileName = "DocTask-1.0.0-mac.zip";
                  } else if (userAgent.includes("linux")) {
                    // Linux
                    downloadUrl =
                      "https://github.com/Raniel-Roque/doctask/releases/download/Linux/DocTask-1.0.0.AppImage";
                    fileName = "DocTask-1.0.0.AppImage";
                  } else {
                    // Default to Windows for unknown OS
                    downloadUrl =
                      "https://github.com/Raniel-Roque/doctask/releases/download/Windows/DocTask-Setup-1.0.0.exe";
                    fileName = "DocTask-Setup-1.0.0.exe";
                  }

                  // Download the appropriate version
                  try {
                    const link = document.createElement("a");
                    link.href = downloadUrl;
                    link.download = fileName;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";

                    // Ensure the link is properly attached to the DOM
                    document.body.appendChild(link);
                    link.click();

                    // Clean up the link element
                    setTimeout(() => {
                      if (document.body.contains(link)) {
                        document.body.removeChild(link);
                      }
                    }, 100);
                  } catch {
                    window.open(downloadUrl, "_blank", "noopener,noreferrer");
                  }
                }}
                className="text-sm text-red-200 font-light underline italic hover:text-white transition-colors duration-200 select-none"
              >
                Download Desktop App
              </button>

              {/* Dropdown menu */}
              <div className="absolute bottom-full left-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px] z-50">
                <div className="p-2">
                  <div className="text-xs text-gray-500 font-medium mb-2 px-2">
                    Choose Platform:
                  </div>

                  {/* Windows */}
                  <button
                    onClick={() => {
                      try {
                        const link = document.createElement("a");
                        link.href =
                          "https://github.com/Raniel-Roque/doctask/releases/download/Windows/DocTask-Setup-1.0.0.exe";
                        link.download = "DocTask-Setup-1.0.0.exe";
                        link.target = "_blank";
                        link.rel = "noopener noreferrer";

                        document.body.appendChild(link);
                        link.click();

                        setTimeout(() => {
                          if (document.body.contains(link)) {
                            document.body.removeChild(link);
                          }
                        }, 100);
                      } catch {
                        window.open(
                          "https://github.com/Raniel-Roque/doctask/releases/download/Windows/DocTask-Setup-1.0.0.exe",
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-150 flex items-center gap-2"
                  >
                    Windows (.exe)
                  </button>

                  {/* Linux */}
                  <button
                    onClick={() => {
                      try {
                        const link = document.createElement("a");
                        link.href =
                          "https://github.com/Raniel-Roque/doctask/releases/download/Linux/DocTask-1.0.0.AppImage";
                        link.download = "DocTask-1.0.0.AppImage";
                        link.target = "_blank";
                        link.rel = "noopener noreferrer";

                        document.body.appendChild(link);
                        link.click();

                        setTimeout(() => {
                          if (document.body.contains(link)) {
                            document.body.removeChild(link);
                          }
                        }, 100);
                      } catch {
                        window.open(
                          "https://github.com/Raniel-Roque/doctask/releases/download/Linux/DocTask-1.0.0.AppImage",
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-150 flex items-center gap-2"
                  >
                    Linux (.AppImage)
                  </button>

                  {/* Mac */}
                  <button
                    onClick={() => {
                      try {
                        const link = document.createElement("a");
                        link.href =
                          "https://github.com/Raniel-Roque/doctask/releases/download/MacOS/DocTask-1.0.0-mac.zip";
                        link.download = "DocTask-1.0.0-mac.zip";
                        link.target = "_blank";
                        link.rel = "noopener noreferrer";

                        document.body.appendChild(link);
                        link.click();

                        setTimeout(() => {
                          if (document.body.contains(link)) {
                            document.body.removeChild(link);
                          }
                        }, 100);
                      } catch {
                        window.open(
                          "https://github.com/Raniel-Roque/doctask/releases/download/MacOS/DocTask-1.0.0-mac.zip",
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-150 flex items-center gap-2"
                  >
                    macOS (.zip)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backdoor Panel */}
      {showBackdoor && (
        <BackdoorPanel
          onClose={() => setShowBackdoor(false)}
          onLogin={handleBackdoorLogin}
          loading={backdoorLoading}
        />
      )}
    </div>
  );
};

export default LoginPage;
