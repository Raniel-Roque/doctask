import { Resend } from "resend";

// Resend Email Configuration
export const resendConfig = {
  // API Key - Change this in your .env file
  apiKey: process.env.RESEND_API_KEY,

  // Email sender configuration
  from: {
    // Change this to your verified domain when ready
    default: "DocTask <onboarding@resend.dev>",
    // You can add more sender options here
    // support: "DocTask Support <support@yourdomain.com>",
    // noreply: "DocTask <noreply@yourdomain.com>",
  },

  // Email templates configuration
  templates: {
    welcome: {
      subject: "Welcome to DocTask",
      from: "DocTask <onboarding@resend.dev>",
    },
    resetPassword: {
      subject: "DocTask - Your Password Has Been Reset",
      from: "DocTask <onboarding@resend.dev>",
    },
    updateEmail: {
      subject: "Welcome to DocTask - Your Account Details",
      from: "DocTask <onboarding@resend.dev>",
    },
  },

  // Validation
  validateConfig() {
    if (!this.apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    return true;
  },
};

// Helper function to get Resend instance
export const getResendInstance = () => {
  resendConfig.validateConfig();
  return new Resend(resendConfig.apiKey);
};
