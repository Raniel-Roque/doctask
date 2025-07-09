import React from "react";
import { FaTimes } from "react-icons/fa";

interface TermsOfServiceProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Terms of Service</h2>
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
              1. Acceptance of Terms
            </h3>
            <p>
              By accessing and using DocTask, you accept and agree to be bound
              by the terms and provision of this agreement. If you do not agree
              to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">2. Use License</h3>
            <p className="mb-2">
              Permission is granted to temporarily use DocTask for personal,
              non-commercial transitory viewing only. This is the grant of a
              license, not a transfer of title.
            </p>
            <p>
              This license shall automatically terminate if you violate any of
              these restrictions.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              3. User Responsibilities
            </h3>
            <p className="mb-2">You are responsible for:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                Maintaining the confidentiality of your account and password
              </li>
              <li>All activities that occur under your account</li>
              <li>
                Ensuring your account information is accurate and up-to-date
              </li>
              <li>
                Notifying us immediately of any unauthorized use of your account
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">4. Prohibited Uses</h3>
            <p className="mb-2">
              You may not use DocTask for any unlawful purpose or to solicit
              others to perform unlawful acts. You may not violate any
              international, federal, provincial, or state regulations, rules,
              laws, or local ordinances.
            </p>
            <p>Specifically, you agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Transmit any viruses, malware, or other harmful code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Harass, abuse, or harm other users</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              5. Intellectual Property
            </h3>
            <p className="mb-2">
              The content on DocTask is owned by us and is protected by
              copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You retain ownership of content you create, but grant us a license
              to use, store, and display that content in connection with
              providing our services.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">6. Privacy</h3>
            <p>
              Your privacy is important to us. Please review our Privacy Policy,
              which also governs your use of the service, to understand our
              practices.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">7. Disclaimers</h3>
            <p className="mb-2">
              The service is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis. We make no warranties, expressed or
              implied, and hereby disclaim all warranties.
            </p>
            <p>
              We do not warrant that the service will be uninterrupted, secure,
              or error-free.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              8. Limitation of Liability
            </h3>
            <p>
              In no event shall DocTask, nor its directors, employees, partners,
              agents, suppliers, or affiliates, be liable for any indirect,
              incidental, special, consequential, or punitive damages, including
              without limitation, loss of profits, data, use, goodwill, or other
              intangible losses.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">9. Termination</h3>
            <p className="mb-2">
              We may terminate or suspend your account and bar access to the
              service immediately, without prior notice or liability, under our
              sole discretion.
            </p>
            <p>
              Upon termination, your right to use the service will cease
              immediately. If you wish to terminate your account, you may simply
              discontinue using the service.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">10. Governing Law</h3>
            <p>
              These Terms shall be interpreted and governed by the laws of [Your
              Jurisdiction], without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">11. Changes to Terms</h3>
            <p>
              We reserve the right to modify or replace these Terms at any time.
              If a revision is material, we will provide at least 30 days notice
              prior to any new terms taking effect.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              12. Contact Information
            </h3>
            <p>
              If you have any questions about these Terms of Service, please
              contact us at:
            </p>
            <div className="mt-2 p-3 bg-gray-50 rounded">
              <p>
                <strong>Email:</strong> terms@doctask.com
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
