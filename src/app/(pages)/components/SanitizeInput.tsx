// =========================================
// Types
// =========================================
interface SanitizeInputProps {
  value: string;
  options?: {
    trim?: boolean;
    removeHtml?: boolean;
    escapeSpecialChars?: boolean;
    maxLength?: number;
    allowedPattern?: RegExp;
    preserveCase?: boolean;
  };
}

// =========================================
// Component
// =========================================
export const sanitizeInput = (
  value: string,
  options: SanitizeInputProps["options"] = {},
): string => {
  // Handle null or undefined values
  if (value === null || value === undefined) {
    return "";
  }

  const {
    trim = false, // Changed default to false to preserve spaces during input
    removeHtml = true,
    escapeSpecialChars = true,
    maxLength,
    allowedPattern,
    preserveCase = true,
  } = options;

  let sanitizedValue = value;

  // Apply trimming if enabled
  if (trim) {
    sanitizedValue = sanitizedValue.trim();
  }

  // Remove HTML tags if enabled
  if (removeHtml) {
    sanitizedValue = sanitizedValue.replace(/[<>]/g, "");
  }

  // Escape special characters if enabled
  if (escapeSpecialChars) {
    sanitizedValue = sanitizedValue
      .replace(/[&]/g, "&amp;")
      .replace(/["]/g, "&quot;")
      .replace(/[']/g, "&#x27;")
      .replace(/[\/]/g, "&#x2F;");
  }

  // Apply max length if specified
  if (maxLength && sanitizedValue.length > maxLength) {
    sanitizedValue = sanitizedValue.slice(0, maxLength);
  }

  // Apply pattern matching if specified
  if (allowedPattern && !allowedPattern.test(sanitizedValue)) {
    sanitizedValue = "";
  }

  // Preserve case if enabled
  if (!preserveCase) {
    // sanitizedValue = sanitizedValue.toLowerCase();
  }

  return sanitizedValue;
};

// =========================================
// Validation Rules
// =========================================
export const VALIDATION_RULES = {
  // Name fields
  name: {
    maxLength: 50,
    pattern: /^[a-zA-ZÀ-ÿ\s-']+$/,
    message: "Name can only contain letters, spaces, hyphens, and apostrophes",
    required: true,
  },
  // Email
  email: {
    maxLength: 100,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Invalid email format",
    required: true,
  },
  // General text
  text: {
    maxLength: 255,
    pattern: /^[a-zA-Z0-9\s.,!?-]+$/,
    message: "Can only contain letters, numbers, and basic punctuation",
    required: false,
  },
  // Capstone title
  capstoneTitle: {
    maxLength: 255,
    pattern: /^[a-zA-ZÀ-ÿ0-9\s.,!?;:-]+$/,
    message:
      "Capstone Title can include letters, numbers, spaces, . , ! ? : ; -",
    required: false,
  },
} as const;

// =========================================
// Validation Function
// =========================================
export const validateInput = (
  value: string,
  type: keyof typeof VALIDATION_RULES,
): { isValid: boolean; message?: string } => {
  const rules = VALIDATION_RULES[type];

  // Skip validation if not required and empty
  if (!rules.required && !value) {
    return { isValid: true };
  }

  // Check max length
  if (value.length > rules.maxLength) {
    const fieldName = type === "capstoneTitle" ? "Capstone Title" : type;
    return {
      isValid: false,
      message: `${fieldName} must be less than ${rules.maxLength} characters`,
    };
  }

  // Check pattern
  if (!rules.pattern.test(value)) {
    return { isValid: false, message: rules.message };
  }

  return { isValid: true };
};
