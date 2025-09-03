"use client";

import { useSignIn, useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
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
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";

interface ClerkError {
  errors: Array<{
    message: string;
    code?: string;
  }>;
}

const LoginPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: Verification Code, 3: Password, 4: Reset Password
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success" | "warning" | "info";
  } | null>(null);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(false); // false: login, true: forgot password
  const [forgotStepIndex, setForgotStepIndex] = useState(0); // 0: code, 1: reset password
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Check for success parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const successPassword = urlParams.get("successpassword");
    const successVerify = urlParams.get("successverify");
    const successRestore = urlParams.get("successrestore");

    if (successPassword === "true") {
      setNotification({
        message:
          "Password reset successful! Please log in with your new password.",
        type: "success",
      });
    } else if (successVerify === "true") {
      setNotification({
        message:
          "Email verified successfully! Please log in with your password.",
        type: "success",
      });
    } else if (successRestore === "true") {
      setNotification({
        message:
          "Database has been restored successfully! Please check your email for the new password.",
        type: "success",
      });
    }
  }, [router]);

  useEffect(() => {
    // Check for restore banner flag in localStorage
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("showRestoreBanner") === "true"
    ) {
      setNotification({
        message:
          "Database has been restored successfully! Please check your email for the new password.",
        type: "success",
      });
      localStorage.removeItem("showRestoreBanner");
    }
  }, []);

  useEffect(() => {
    setIsClient(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const updateCodeRateLimit = (email: string) => {
    const rateLimitKey = `rateLimit_${email}`;
    const timerKey = `resendTimer_${email}`;
    const now = Date.now();
    // Set 2 min timer
    localStorage.setItem(timerKey, JSON.stringify({ resetTime: now + 120000 }));
    // Update rate limit (3 per 5 min)
    const rateLimitData = localStorage.getItem(rateLimitKey);
    if (rateLimitData) {
      const { count, resetTime: oldResetTime } = JSON.parse(rateLimitData);
      if (now < oldResetTime) {
        localStorage.setItem(
          rateLimitKey,
          JSON.stringify({ count: count + 1, resetTime: oldResetTime }),
        );
      } else {
        localStorage.setItem(
          rateLimitKey,
          JSON.stringify({ count: 1, resetTime: now + 300000 }),
        );
      }
    } else {
      localStorage.setItem(
        rateLimitKey,
        JSON.stringify({ count: 1, resetTime: now + 300000 }),
      );
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    // Prevent submission if email is empty
    if (!email || email.trim() === "") {
      setNotification({
        message: "Please enter your email address",
        type: "error",
      });
      return;
    }

    // Convert email to lowercase only when submitting
    const emailToCheck = email.toLowerCase();

    // Custom email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToCheck)) {
      setNotification({
        message: "Please enter a valid email address",
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);

      // Check if email exists in our database
      const response = await fetch("/api/convex/get-user-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToCheck, checkOnly: true }),
      });

      const data = await response.json();

      if (!data.exists) {
        setNotification({ message: "Email not found", type: "error" });
        return;
      }

      // Get full user info for verification status
      const userRes = await fetch("/api/convex/get-user-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToCheck }),
      });

      if (!userRes.ok) {
        throw new Error("Failed to fetch user verification status");
      }

      const user = await userRes.json();

      if (user.email_verified) {
        // If email is verified, proceed to password step
        setStep(3);
        setNotification({ message: "", type: "info" });
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
            updateCodeRateLimit(emailToCheck);
            setStep(2);
            setNotification({
              message:
                "A new verification code has been sent to your email. Please check your inbox and spam folder.",
              type: "success",
            });
            setCode("");
          } else {
            setNotification({
              message: "Failed to send verification code. Please try again.",
              type: "error",
            });
          }
        } else {
          // Just proceed to verification step without sending code
          setStep(2);
          setNotification({ message: "", type: "info" });
          setCode("");
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      setNotification({
        message: errorMessage || "An error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutocomplete = async (email: string) => {
    if (!isLoaded) return;

    // Custom email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setNotification({
        message: "Please enter a valid email address",
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);

      setEmail(email);

      // Check if email exists in our database
      const response = await fetch("/api/convex/get-user-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, checkOnly: true }),
      });

      const data = await response.json();

      if (!data.exists) {
        setNotification({ message: "Email not found", type: "error" });
        return;
      }

      // Get full user info for verification status
      const userRes = await fetch("/api/convex/get-user-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!userRes.ok) {
        throw new Error("Failed to fetch user verification status");
      }

      const user = await userRes.json();

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
              localStorage.setItem(
                "lastActivityTimestamp",
                Date.now().toString(),
              );
              return; // Success, user will be redirected
            } else {
              setNotification({
                message: "Incorrect password. Please try again.",
                type: "error",
              });
            }
          } catch (err) {
            const clerkError = err as ClerkError;
            setNotification({
              message:
                clerkError.errors?.[0]?.message ||
                "An error occurred during sign in",
              type: "error",
            });
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
            setNotification({
              message:
                "A new verification code has been sent to your email. Please check your inbox and spam folder.",
              type: "success",
            });
            setCode("");
          } else {
            setNotification({
              message: "Failed to send verification code. Please try again.",
              type: "error",
            });
          }
        } else {
          // Just proceed to verification step without sending code
          setStep(2);
          setNotification({ message: "", type: "info" });
          setCode("");
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      setNotification({
        message: errorMessage || "An error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    // Prevent submission if verification code is empty
    if (!code || code.trim() === "") {
      setNotification({
        message: "Please enter the verification code sent to your email",
        type: "error",
      });
      return;
    }

    if (code.length !== 6) {
      setNotification({
        message: "Verification code must be exactly 6 digits",
        type: "error",
      });
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setNotification({
        message: "Verification code must contain only numbers",
        type: "error",
      });
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
          const userRes = await fetch("/api/convex/get-user-by-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          if (!userRes.ok) {
            throw new Error("Failed to fetch user for verification update");
          }

          const user = await userRes.json();

          // Call the mark-email-verified API to update the user's email verification status
          const verifyRes = await fetch("/api/convex/mark-email-verified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user._id }),
          });

          if (!verifyRes.ok) {
            throw new Error("Failed to mark email as verified");
          }

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
          setNotification({
            message:
              "Email verified but failed to update database. Please try logging in again.",
            type: "warning",
          });
        }
      } else {
        setNotification({
          message:
            "Invalid verification code. Please check your email and try again.",
          type: "error",
        });
        setCode(""); // Clear the code input on error
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      if (errorMessage.toLowerCase().includes("expired")) {
        setNotification({
          message: "Verification code has expired. Please request a new code.",
          type: "error",
        });
      } else if (errorMessage.toLowerCase().includes("invalid")) {
        setNotification({
          message:
            "Invalid verification code. Please check your email and try again.",
          type: "error",
        });
      } else {
        setNotification({
          message:
            "Verification failed. Please try again or request a new code.",
          type: "error",
        });
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
      setNotification({ message: "Please enter your password", type: "error" });
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
        localStorage.setItem("lastActivityTimestamp", Date.now().toString());
      } else {
        setNotification({
          message: "Incorrect password. Please try again.",
          type: "error",
        });
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
        setNotification({
          message:
            "This password has been compromised in a data breach. Please use forgot password.",
          type: "error",
        });
      } else if (errorMessage.includes("Your account is locked")) {
        setNotification({
          message: `Your account is locked. Please try again later or contact your capstone instructor.`,
          type: "error",
        });
      } else if (
        errorMessage.toLowerCase().includes("password") ||
        errorMessage.toLowerCase().includes("invalid credentials") ||
        errorMessage.toLowerCase().includes("incorrect")
      ) {
        setNotification({
          message: "Incorrect password. Please try again.",
          type: "error",
        });
      } else {
        setNotification({
          message: "An error occurred during sign in",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;

    // Check if there's an existing timer
    const timerKey = `resendTimer_${email}`;
    const storedTimer = localStorage.getItem(timerKey);
    if (storedTimer) {
      const { resetTime } = JSON.parse(storedTimer);
      const now = Date.now();
      if (now < resetTime) {
        // Timer is still active, skip sending but don't show error
        return;
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

        setNotification({
          message:
            "A new verification code has been sent to your email. Please check your inbox and spam folder.",
          type: "success",
        });
      } else {
        setNotification({
          message: "Failed to send new code. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      setNotification({
        message: errorMessage || "An error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleForgotPasswordResendCode = async () => {
    if (!isLoaded) return;

    // Check if there's an existing timer for forgot password
    const timerKey = `forgotPasswordResendTimer_${email}`;
    const storedTimer = localStorage.getItem(timerKey);
    if (storedTimer) {
      const { resetTime } = JSON.parse(storedTimer);
      const now = Date.now();
      if (now < resetTime) {
        // Timer is still active, skip sending but don't show error
        return;
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

        // Start the timer immediately for forgot password
        const resetTime = Date.now() + 120000;
        localStorage.setItem(
          `forgotPasswordResendTimer_${email}`,
          JSON.stringify({ resetTime }),
        );

        updateCodeRateLimit(email);

        setNotification({
          message:
            "A new password reset code has been sent to your email. Please check your inbox and spam folder.",
          type: "success",
        });
      } else {
        setNotification({
          message: "Failed to send new code. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      setNotification({
        message: errorMessage || "An error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotStep(true);
    setStep(4);
    setForgotStepIndex(0);
    setNotification({ message: "", type: "info" });
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

    // Store flag to indicate if we should send code when reset input loads
    localStorage.setItem(
      `shouldSendForgotPasswordCode_${email}`,
      shouldSendCode.toString(),
    );

    // Don't send code immediately - let the ResetCodeInput component handle it
    // This makes it consistent with the regular verification flow
  };

  const handleForgotBack = () => {
    if (forgotStepIndex === 1) {
      // If on reset password input, go back to password input (step 3)
      setForgotStep(false);
      setStep(3);
      setNotification({ message: "", type: "info" });
      setCode("");
      setPassword("");
      setConfirmPassword("");
    } else if (step === 2) {
      // If on verification code step, go back to email input (step 1)
      setStep(1);
      setNotification({ message: "", type: "info" });
      setCode("");
    } else if (step === 3 && !forgotStep) {
      // If on password step, go back to email input
      setStep(1);
      setNotification({ message: "", type: "info" });
      setPassword("");
    } else {
      setForgotStep(false);
      setStep(3);
      setNotification({ message: "", type: "info" });
      setCode("");
      setPassword("");
      setConfirmPassword("");
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
        <NotificationBanner
          message={notification?.message || null}
          type={notification?.type || "info"}
          onClose={() => setNotification(null)}
        />
        <div className="w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl space-y-8 z-10 relative pb-16">
          {/* Back Button for steps 2, 3, 4 */}
          {step > 1 && (
            <button
              type="button"
              onClick={handleForgotBack}
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
                onClick={() => {
                  setStep(1);
                  setCode("");
                  setNotification(null);
                }}
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
                  email={email}
                  onResendCode={handleResendCode}
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
                onClick={handleForgotBack}
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
                        setNotification({
                          message:
                            "Please enter the verification code sent to your email",
                          type: "error",
                        });
                        return;
                      }

                      if (code.length !== 6) {
                        setNotification({
                          message: "Verification code must be exactly 6 digits",
                          type: "error",
                        });
                        return;
                      }

                      if (!/^\d{6}$/.test(code)) {
                        setNotification({
                          message:
                            "Verification code must contain only numbers",
                          type: "error",
                        });
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
                          setNotification({
                            message:
                              "Invalid verification code. Please check your email and try again.",
                            type: "error",
                          });
                        }
                      } catch (err) {
                        const errorMessage =
                          err instanceof Error ? err.message : "";
                        if (errorMessage.toLowerCase().includes("expired")) {
                          setNotification({
                            message:
                              "Verification code has expired. Please request a new code.",
                            type: "error",
                          });
                        } else if (
                          errorMessage.toLowerCase().includes("invalid")
                        ) {
                          setNotification({
                            message:
                              "Invalid verification code. Please check your email and try again.",
                            type: "error",
                          });
                        } else {
                          setNotification({
                            message:
                              "Verification failed. Please try again or request a new code.",
                            type: "error",
                          });
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
                  isValid={
                    password.length >= 8 &&
                    /[a-z]/.test(password) &&
                    /[A-Z]/.test(password) &&
                    /\d/.test(password) &&
                    /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/.test(password) &&
                    password === confirmPassword &&
                    password.trim() !== "" &&
                    confirmPassword.trim() !== ""
                  }
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!isLoaded) return;

                    // Clear any existing notifications
                    setNotification({ message: "", type: "info" });

                    // Prevent submission if passwords are empty
                    if (!password || password.trim() === "") {
                      setNotification({
                        message: "Please enter your new password",
                        type: "error",
                      });
                      return;
                    }

                    if (!confirmPassword || confirmPassword.trim() === "") {
                      setNotification({
                        message: "Please confirm your new password",
                        type: "error",
                      });
                      return;
                    }

                    // Basic validation to prevent submission when requirements aren't met
                    if (password !== confirmPassword) {
                      return; // Don't submit, let visual requirements show the error
                    }

                    if (password.length < 8) {
                      return; // Don't submit, let visual requirements show the error
                    }

                    // Check if all requirements are met
                    const hasLowercase = /[a-z]/.test(password);
                    const hasUppercase = /[A-Z]/.test(password);
                    const hasNumber = /\d/.test(password);
                    const hasSpecialChar =
                      /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/.test(password);

                    if (
                      !hasLowercase ||
                      !hasUppercase ||
                      !hasNumber ||
                      !hasSpecialChar
                    ) {
                      return; // Don't submit, let visual requirements show the error
                    }

                    setLoading(true);
                    try {
                      const result = await signIn.resetPassword({ password });
                      if (result.status === "complete") {
                        // Update Convex database to mark email as verified
                        const userRes = await fetch(
                          "/api/convex/get-user-by-email",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email }),
                          },
                        );
                        if (userRes.ok) {
                          const user = await userRes.json();
                          await fetch("/api/convex/mark-email-verified", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: user._id }),
                          });
                        }

                        // Clear forgot password timer on successful reset
                        const timerKey = `forgotPasswordResendTimer_${email}`;
                        localStorage.removeItem(timerKey);

                        // Set success notification before signing out
                        setNotification({
                          message:
                            "Password reset successful! Please log in with your new password.",
                          type: "success",
                        });

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
                        setNotification({
                          message:
                            "Failed to reset password. Please try again.",
                          type: "error",
                        });
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
                        setNotification({
                          message:
                            "Password is too weak. Please choose a stronger password.",
                          type: "error",
                        });
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
                        setNotification({
                          message:
                            "Password does not meet requirements. Please ensure it has at least 8 characters with uppercase, lowercase, numbers, and special characters.",
                          type: "error",
                        });
                      }
                      // Check for rate limiting
                      else if (
                        errorMessage.toLowerCase().includes("rate limit") ||
                        errorMessage
                          .toLowerCase()
                          .includes("too many requests") ||
                        errorMessage.toLowerCase().includes("try again later")
                      ) {
                        setNotification({
                          message:
                            "Too many password reset attempts. Please wait a moment before trying again.",
                          type: "error",
                        });
                      }
                      // Generic error fallback
                      else {
                        setNotification({
                          message:
                            "An error occurred while resetting your password. Please try again.",
                          type: "error",
                        });
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
                      "https://github.com/Raniel-Roque/doctask/releases/download/v1.0.0/DocTask-Setup-1.0.0.exe";
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
                          "https://github.com/Raniel-Roque/doctask/releases/download/v1.0.0/DocTask-Setup-1.0.0.exe";
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
                          "https://github.com/Raniel-Roque/doctask/releases/download/v1.0.0/DocTask-Setup-1.0.0.exe",
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-150 flex items-center gap-2"
                  >
                    <span className="text-blue-600">🪟</span>
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
                    <span className="text-orange-600">🐧</span>
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
                    <span className="text-gray-600">🍎</span>
                    macOS (.zip)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
