// =========================================
// Constants
// =========================================
export const VALIDATION_RULES = {
  // Name fields
  firstName: {
    maxLength: 50,
    pattern: /^[a-zA-ZÀ-ÿ\s-']+$/,
    message:
      "First name can only contain letters, spaces, hyphens, and apostrophes",
    required: true,
  },
  middleName: {
    maxLength: 50,
    pattern: /^[a-zA-ZÀ-ÿ\s-']*$/,
    message:
      "Middle name can only contain letters, spaces, hyphens, and apostrophes",
    required: false,
  },
  lastName: {
    maxLength: 50,
    pattern: /^[a-zA-ZÀ-ÿ\s-']+$/,
    message:
      "Last name can only contain letters, spaces, hyphens, and apostrophes",
    required: true,
  },
  // Email
  email: {
    maxLength: 100,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Invalid email format",
    required: true,
  },
} as const;

// =========================================
// Field Name Mapping
// =========================================
const FIELD_LABELS: Record<keyof typeof VALIDATION_RULES, string> = {
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  email: "Email",
};

// =========================================
// Validation Functions
// =========================================
export const validateField = (
  value: string,
  fieldName: keyof typeof VALIDATION_RULES,
): string | null => {
  const rules = VALIDATION_RULES[fieldName];
  const fieldLabel = FIELD_LABELS[fieldName];

  // Check if required - trim the value to handle whitespace-only strings
  const trimmedValue = value?.trim() || "";
  if (rules.required && !trimmedValue) {
    return `${fieldLabel} is required`;
  }

  // Skip validation if not required and empty
  if (!rules.required && !trimmedValue) {
    return null;
  }

  // Check max length
  if (trimmedValue.length > rules.maxLength) {
    return `${fieldLabel} must be less than ${rules.maxLength} characters`;
  }

  // Check email local part length (Clerk limit is 64 characters)
  if (fieldName === "email") {
    const localPart = trimmedValue.split("@")[0];
    if (localPart && localPart.length > 64) {
      return "Email username (before @) must be less than 64 characters";
    }
  }

  // Check pattern
  if (!rules.pattern.test(trimmedValue)) {
    return rules.message;
  }

  return null;
};

// =========================================
// Form Validation
// =========================================
export const validateUserForm = (formData: {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
}): { [key: string]: string } | null => {
  const errors: { [key: string]: string } = {};

  console.log("validateUserForm called with:", formData);

  // Validate each field
  const firstNameError = validateField(formData.first_name, "firstName");
  console.log("firstName validation:", formData.first_name, "->", firstNameError);
  if (firstNameError) errors.first_name = firstNameError;

  if (formData.middle_name) {
    const middleNameError = validateField(formData.middle_name, "middleName");
    console.log("middleName validation:", formData.middle_name, "->", middleNameError);
    if (middleNameError) errors.middle_name = middleNameError;
  }

  const lastNameError = validateField(formData.last_name, "lastName");
  console.log("lastName validation:", formData.last_name, "->", lastNameError);
  if (lastNameError) errors.last_name = lastNameError;

  const emailError = validateField(formData.email, "email");
  console.log("email validation:", formData.email, "->", emailError);
  if (emailError) errors.email = emailError;

  console.log("Final validation errors:", errors);
  return Object.keys(errors).length > 0 ? errors : null;
};
