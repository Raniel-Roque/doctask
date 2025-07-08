"use client";

import { useSignIn } from "@clerk/clerk-react";
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
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";

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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: Verification Code, 3: Password, 4: Reset Password
  const [resentSuccess, setResentSuccess] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success" | "warning" | "info";
  } | null>(null);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(false); // false: login, true: forgot password
  const [forgotStepIndex, setForgotStepIndex] = useState(0); // 0: code, 1: reset password
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (isSignedIn) {
      router.push("/");
    }
  }, [isSignedIn, router]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setResentSuccess(false);
  }, [step]);

  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [step, forgotStep, forgotStepIndex]);

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

    try {
      setLoading(true);

      // Convert email to lowercase only when submitting
      const emailToCheck = email.toLowerCase();

      // First check if email exists in our database
      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToCheck }),
      });

      const data = await response.json();

      if (!data.exists) {
        setNotification({ message: "Email not found", type: "error" });
        return;
      }

      // Check if email is verified in Convex
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
      } else {
        // If email is not verified, send verification code
        const result = await signIn.create({
          strategy: "email_code",
          identifier: emailToCheck,
        });

        if (result.status === "needs_first_factor") {
          setStep(2);
        } else {
          setNotification({
            message: "Failed to send verification code. Please try again.",
            type: "error",
          });
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

    try {
      setLoading(true);

      setEmail(email);

      // Check if email exists in our database
      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!data.exists) {
        setNotification({ message: "Email not found", type: "error" });
        return;
      }

      // Check if email is verified in Convex
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
        // If email is not verified, send verification code
        const result = await signIn.create({
          strategy: "email_code",
          identifier: email,
        });

        if (result.status === "needs_first_factor") {
          setStep(2);
        } else {
          setNotification({
            message: "Failed to send verification code. Please try again.",
            type: "error",
          });
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
    setResentSuccess(false);

    try {
      setLoading(true);

      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete") {
        // Update Convex database to mark email as verified
        const userRes = await fetch("/api/convex/get-user-by-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (!userRes.ok) {
          throw new Error("Failed to fetch user for verification update");
        }

        // Update email_verified status
        await signOut();
        localStorage.setItem("lastActivityTimestamp", Date.now().toString());
      } else {
        setNotification({
          message: "Invalid code. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      setNotification({
        message: errorMessage || "Invalid code. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

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
      if (errorMessage.includes("Your account is locked")) {
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

    try {
      setLoading(true);

      const result = await signIn.create({
        strategy: "email_code",
        identifier: email,
      });

      if (result.status === "needs_first_factor") {
        setResentSuccess(true);
        setNotification({
          message:
            "A new verification code has been sent to your email. Please check your inbox and spam folder.",
          type: "success",
        });
      } else {
        setNotification({
          message: "Failed to resend code. Please try again.",
          type: "error",
        });
        setResentSuccess(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      setNotification({
        message: errorMessage || "An error occurred. Please try again.",
        type: "error",
      });
      setResentSuccess(false);
    } finally {
      setLoading(false);
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
    setLoading(true);
    try {
      if (!signIn) throw new Error("SignIn is not loaded");
      const result = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      if (result.status === "needs_first_factor") {
        setNotification({
          message:
            "A password reset code has been sent to your email. Please check your inbox and spam folder.",
          type: "success",
        });
      } else {
        setNotification({
          message: "Failed to send reset code. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      setNotification({
        message: errorMessage || "Failed to send reset code. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
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
            src="/doctask.ico"
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
        <div className="max-w-sm w-full space-y-8 z-10 relative pb-16">
          {/* Back Button for steps 2, 3, 4 */}
          {step > 1 && (
            <button
              type="button"
              onClick={handleForgotBack}
              className="absolute top-0 left-0 flex items-center text-white hover:text-gray-200 focus:outline-none z-20"
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
            <form className="mt-8 space-y-6" onSubmit={handleCodeSubmit}>
              {resentSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-2 py-1 rounded relative mb-2 text-xs">
                  {notification?.message}
                </div>
              )}
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
                  {loading ? "Processing..." : "Verify Code"}
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
              </div>
            </form>
          )}
          {/* Step 3: Password Input with Forgot Password */}
          {step === 3 && !forgotStep && (
            <form
              className="mt-8 space-y-6"
              onSubmit={handlePasswordSubmit}
              autoComplete="on"
            >
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
                  className="font-medium text-red-200 hover:text-red-100"
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
                className="absolute top-0 left-0 flex items-center text-white hover:text-gray-200 focus:outline-none z-20"
                style={{ marginTop: "-2rem", marginLeft: "-1rem" }}
              >
                <FaArrowLeft className="mr-2" /> Back
              </button>
              {forgotStepIndex === 0 && (
                <>
                  {notification?.message && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-2 py-1 rounded relative mb-2 text-xs">
                      {notification.message}
                    </div>
                  )}
                  <ResetCodeInput
                    code={code}
                    setCode={setCode}
                    loading={loading}
                    error={notification?.message}
                    onResendCode={handleResendCode}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!isLoaded) return;
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
                            message: "Invalid code. Please try again.",
                            type: "error",
                          });
                        }
                      } catch {
                        setNotification({
                          message: "Invalid code. Please try again.",
                          type: "error",
                        });
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
                  error={notification?.message}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!isLoaded) return;
                    if (password !== confirmPassword) {
                      setNotification({
                        message: "Passwords do not match",
                        type: "error",
                      });
                      return;
                    }
                    if (password.length < 8) {
                      setNotification({
                        message: "Password must be at least 8 characters long",
                        type: "error",
                      });
                      return;
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
                        await signOut();
                        router.push("/login");
                        localStorage.setItem(
                          "lastActivityTimestamp",
                          Date.now().toString(),
                        );
                      } else {
                        setNotification({
                          message:
                            "Failed to reset password. Please try again.",
                          type: "error",
                        });
                      }
                    } catch {
                      setNotification({
                        message: "Failed to reset password. Please try again.",
                        type: "error",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              )}
            </>
          )}
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
