import React from "react";
import { FaTimes } from "react-icons/fa";

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-6 text-gray-700">
          <p>
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              1. Information We Collect
            </h3>
            <p className="mb-2">
              We collect information you provide directly to us, such as when
              you create an account, update your profile, or communicate with
              us. This may include your name, email address, and other contact
              information.
            </p>
            <p>
              We also collect information about your use of our services,
              including your interactions with documents, groups, and other
              users.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              2. How We Use Your Information
            </h3>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and manage your account</li>
              <li>Communicate with you about your account and our services</li>
              <li>Ensure the security of our platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              3. Information Sharing
            </h3>
            <p className="mb-2">
              We do not sell, trade, or otherwise transfer your personal
              information to third parties without your consent, except as
              described in this policy or as required by law.
            </p>
            <p>We may share your information with:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Service providers who assist us in operating our platform</li>
              <li>
                Other users within your group (as necessary for collaboration)
              </li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">4. Data Security</h3>
            <p>
              We implement appropriate security measures to protect your
              personal information against unauthorized access, alteration,
              disclosure, or destruction. This includes encryption, secure
              servers, and regular security assessments.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">5. Your Rights</h3>
            <p className="mb-2">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Access your personal information</li>
              <li>Update or correct your information</li>
              <li>Delete your account and associated data</li>
              <li>Request a copy of your data</li>
              <li>Withdraw your consent at any time</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">6. Data Retention</h3>
            <p>
              We retain your personal information for as long as your account is
              active or as needed to provide you services. We will delete your
              information when you delete your account or when it&apos;s no
              longer needed for the purposes outlined in this policy.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              7. Cookies and Tracking
            </h3>
            <p>
              We use cookies and similar technologies to enhance your
              experience, analyze usage, and provide personalized content. You
              can control cookie settings through your browser.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              8. Changes to This Policy
            </h3>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">9. Contact Us</h3>
            <p>
              If you have any questions about this Privacy Policy or our data
              practices, please contact us at:
            </p>
            <div className="mt-2 p-3 bg-gray-50 rounded">
              <p>
                <strong>Email:</strong> privacy@doctask.com
              </p>
              <p>
                <strong>Address:</strong> [Your Company Address]
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
