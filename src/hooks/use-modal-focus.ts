import { useEffect, useRef, useCallback } from "react";

interface UseModalFocusOptions {
  isOpen: boolean;
  onClose?: () => void;
  focusFirstInput?: boolean;
}

export const useModalFocus = ({
  isOpen,
  onClose,
  focusFirstInput = false,
}: UseModalFocusOptions) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the modal
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];

    const focusableSelectors = [
      'input:not([disabled]):not([type="hidden"])',
      "textarea:not([disabled])",
      "select:not([disabled])",
      "button:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ];

    return Array.from(
      modalRef.current.querySelectorAll(focusableSelectors.join(", ")),
    ).filter((el) => {
      const element = el as HTMLElement;
      return (
        element.offsetParent !== null &&
        element.style.display !== "none" &&
        element.style.visibility !== "hidden"
      );
    }) as HTMLElement[];
  }, []);

  // Focus the first input field
  const focusFirstInputField = useCallback(() => {
    if (!focusFirstInput) return;

    const focusableElements = getFocusableElements();
    const firstInput = focusableElements.find(
      (el) =>
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT",
    );

    if (firstInput) {
      firstInput.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [focusFirstInput, getFocusableElements]);

  // Handle tab key navigation
  const handleTabKey = useCallback(
    (event: KeyboardEvent) => {
      if (!modalRef.current) return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: move backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [getFocusableElements],
  );

  // Handle escape key
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        handleTabKey(event);
      } else if (event.key === "Escape") {
        handleEscapeKey(event);
      }
    },
    [handleTabKey, handleEscapeKey],
  );

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Add event listeners
      document.addEventListener("keydown", handleKeyDown);

      // Focus the first input after a short delay to ensure modal is rendered
      const timeoutId = setTimeout(() => {
        focusFirstInputField();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      // Restore focus to the previous element when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
    }
  }, [isOpen, handleKeyDown, focusFirstInputField]);

  return modalRef;
};
