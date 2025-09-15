import React, { useEffect, useRef, useCallback } from "react";

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
  context?: "profile" | "terms"; // "profile" = close popup, "terms" = go back to agreement
  onBackToTerms?: () => void; // Callback for going back to terms agreement
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  isOpen,
  onClose,
  context = "profile",
  onBackToTerms,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackClick = useCallback(() => {
    if (context === "terms" && onBackToTerms) {
      onBackToTerms();
    } else {
      onClose();
    }
  }, [context, onBackToTerms, onClose]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleBackClick();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleBackClick();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleBackClick]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
          <button
            onClick={handleBackClick}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Back
          </button>
        </div>

        <div className="space-y-6 text-gray-700">
          <p>
            <strong>Effective date:</strong> September 9, 2025
          </p>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              1. Information We Collect
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                Account information (name, email, profile image, Clerk ID,
                role/subrole).
              </li>
              <li>
                Groups and assignments (group membership, instructor/adviser
                relationships).
              </li>
              <li>
                Content you create (documents, notes/comments, uploaded images,
                titles/chapters/statuses).
              </li>
              <li>
                Collaboration signals (presence, cursors, selections) for
                real‑time features.
              </li>
              <li>
                Usage/log data (device, IP, timestamps, errors, rate‑limit and
                health checks).
              </li>
              <li>
                Cookies/local storage (authentication cookies, resend timers,
                flow flags).
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              2. How We Use Your Information
            </h3>
            <p className="mb-2">We process personal information to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Authenticate users and manage sessions (Clerk).</li>
              <li>Provide collaboration and presence (Liveblocks).</li>
              <li>Store/synchronize documents, tasks, and groups (Convex).</li>
              <li>Track document edits for contributor features.</li>
              <li>Operate image uploads and media delivery.</li>
              <li>Maintain security, detect abuse, and apply rate limits.</li>
              <li>Monitor availability and reliability (health checks).</li>
              <li>Comply with legal obligations and enforce terms.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              3. Information Sharing
            </h3>
            <p className="mb-2">
              We do not sell personal information. We share information only as
              necessary to operate and protect the service:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                Processors: Clerk (auth), Convex (data), Liveblocks (realtime).
              </li>
              <li>
                Organization members: limited profile visibility for
                collaboration.
              </li>
              <li>
                Legal and safety: to comply with law or protect rights and
                security.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">4. Data Security</h3>
            <p>
              We use appropriate administrative, technical, and organizational
              safeguards (HTTPS, access controls, rate‑limiting, reviews). No
              method of transmission or storage is fully secure.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">5. Your Rights</h3>
            <p className="mb-2">
              Subject to law, you may request access, correction, deletion,
              export, or restriction of processing, and withdraw consent where
              applicable.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">6. Data Retention</h3>
            <p>
              We retain data while your account is active and as required for
              operations and legal obligations. Documents and collaboration data
              persist until removed by authorized users or per institutional
              policy. Logs and rate‑limit data are retained for shorter
              operational windows.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              7. Cookies and Local Storage
            </h3>
            <p>
              Authentication cookies (Clerk) and local storage are used for
              essential login flows (e.g., resend timers) and preferences. You
              can control non‑essential storage in your browser.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              8. International Transfers
            </h3>
            <p>
              Processors may operate in multiple jurisdictions. We implement
              safeguards for cross‑border transfers where required.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              9. Changes to This Policy
            </h3>
            <p>
              We may update this policy and will notify you of material changes
              via the product
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
