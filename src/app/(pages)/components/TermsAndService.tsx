import React, { useState } from "react";
import { FaCheck, FaSpinner } from "react-icons/fa";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { NotificationBanner } from "./NotificationBanner";

interface TermsAndServiceProps {
  isOpen: boolean;
  onAgree: () => void;
  onDisagree: () => void;
}

export const TermsAndService: React.FC<TermsAndServiceProps> = ({
  isOpen,
  onAgree,
  onDisagree,
}) => {
  const { user } = useUser();
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  const updateTermsAgreement = useMutation(api.mutations.updateTermsAgreement);

  const handleAgree = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get user from Convex by clerk_id
      const response = await fetch(
        `/api/convex/get-user-by-email?email=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`,
      );
      const userData = await response.json();

      if (!userData.user) {
        throw new Error("User not found in database");
      }

      await updateTermsAgreement({
        userId: userData.user._id,
        termsAgreed: true,
        privacyAgreed: true,
      });

      onAgree();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update agreement",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisagree = () => {
    onDisagree();
  };

  const canAgree = termsAgreed && privacyAgreed;

  if (!isOpen) return null;

  // Privacy Policy Content
  const PrivacyPolicyContent = () => (
    <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Privacy Policy</h3>
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section>
          <h4 className="font-semibold mb-2">1. Information We Collect</h4>
          <p>
            We collect information you provide directly to us, such as when you
            create an account, update your profile, or communicate with us. This
            may include your name, email address, and other contact information.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">2. How We Use Your Information</h4>
          <p>
            We use the information we collect to provide, maintain, and improve
            our services, to communicate with you, and to ensure the security of
            our platform.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">3. Information Sharing</h4>
          <p>
            We do not sell, trade, or otherwise transfer your personal
            information to third parties without your consent, except as
            described in this policy or as required by law.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">4. Data Security</h4>
          <p>
            We implement appropriate security measures to protect your personal
            information against unauthorized access, alteration, disclosure, or
            destruction.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">5. Your Rights</h4>
          <p>
            You have the right to access, update, or delete your personal
            information. You may also request a copy of your data or withdraw
            your consent at any time.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">6. Contact Us</h4>
          <p>
            If you have any questions about this Privacy Policy, please contact
            us at privacy@doctask.com
          </p>
        </section>
      </div>
    </div>
  );

  // Terms of Service Content
  const TermsOfServiceContent = () => (
    <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Terms of Service</h3>
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section>
          <h4 className="font-semibold mb-2">1. Acceptance of Terms</h4>
          <p>
            By accessing and using DocTask, you accept and agree to be bound by
            the terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">2. Use License</h4>
          <p>
            Permission is granted to temporarily use DocTask for personal,
            non-commercial transitory viewing only. This is the grant of a
            license, not a transfer of title.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">3. User Responsibilities</h4>
          <p>
            You are responsible for maintaining the confidentiality of your
            account and password. You agree to accept responsibility for all
            activities that occur under your account.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">4. Prohibited Uses</h4>
          <p>
            You may not use DocTask for any unlawful purpose or to solicit
            others to perform unlawful acts. You may not violate any
            international, federal, provincial, or state regulations, rules,
            laws, or local ordinances.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">5. Intellectual Property</h4>
          <p>
            The content on DocTask is owned by us and is protected by copyright,
            trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">6. Termination</h4>
          <p>
            We may terminate or suspend your account and bar access to the
            service immediately, without prior notice or liability, under our
            sole discretion.
          </p>
        </section>

        <section>
          <h4 className="font-semibold mb-2">7. Contact Information</h4>
          <p>
            If you have any questions about these Terms of Service, please
            contact us at terms@doctask.com
          </p>
        </section>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {showPrivacyPolicy ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Privacy Policy
              </h2>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Back
              </button>
            </div>
            <PrivacyPolicyContent />
          </div>
        ) : showTermsOfService ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Terms of Service
              </h2>
              <button
                onClick={() => setShowTermsOfService(false)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Back
              </button>
            </div>
            <TermsOfServiceContent />
          </div>
        ) : (
          <div>
            <div className="flex justify-center items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Terms of Service & Privacy Policy
              </h2>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Welcome to DocTask! Before you can access our services, please
                review and agree to our Terms of Service and Privacy Policy.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 text-[#B54A4A] focus:ring-[#B54A4A] border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <div className="flex-1">
                    <label htmlFor="terms" className="text-sm text-gray-700">
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsOfService(true)}
                        className="text-[#B54A4A] hover:text-[#A43A3A] underline"
                        disabled={isLoading}
                      >
                        Terms of Service
                      </button>
                    </label>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="privacy"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 text-[#B54A4A] focus:ring-[#B54A4A] border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <div className="flex-1">
                    <label htmlFor="privacy" className="text-sm text-gray-700">
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyPolicy(true)}
                        className="text-[#B54A4A] hover:text-[#A43A3A] underline"
                        disabled={isLoading}
                      >
                        Privacy Policy
                      </button>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDisagree}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                I Disagree
              </button>
              <button
                onClick={handleAgree}
                disabled={!canAgree || isLoading}
                className="px-4 py-2 bg-[#B54A4A] text-white rounded-md hover:bg-[#A43A3A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B54A4A] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FaCheck />
                    <span>I Agree</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <NotificationBanner
          message={error}
          type="error"
          onClose={() => setError(null)}
          autoClose={false}
        />
      </div>
    </div>
  );
};
