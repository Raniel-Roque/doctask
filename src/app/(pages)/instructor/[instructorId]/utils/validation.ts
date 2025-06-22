// =========================================
// Constants
// =========================================
export const VALIDATION_RULES = {
  // Name fields
  firstName: {
    maxLength: 50,
    pattern: /^[a-zA-Z\s-']+$/,
    message:
      "First name can only contain letters, spaces, hyphens, and apostrophes",
    required: true,
  },
  middleName: {
    maxLength: 50,
    pattern: /^[a-zA-Z\s-']*$/,
    message:
      "Middle name can only contain letters, spaces, hyphens, and apostrophes",
    required: false,
  },
  lastName: {
    maxLength: 50,
    pattern: /^[a-zA-Z\s-']+$/,
    message:
      "Last name must be less than 50 characters and can only contain letters, spaces, hyphens, and apostrophes",
    required: true,
  },
  // Email
  email: {
    maxLength: 100,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: "Invalid email format",
    required: true,
  },
} as const;

// =========================================
// Validation Functions
// =========================================
export const validateField = (
  value: string,
  fieldName: keyof typeof VALIDATION_RULES,
): string | null => {
  const rules = VALIDATION_RULES[fieldName];

  // Check if required
  if (rules.required && !value) {
    return `${fieldName} is required`;
  }

  // Skip validation if not required and empty
  if (!rules.required && !value) {
    return null;
  }

  // Check max length
  if (value.length > rules.maxLength) {
    return `${fieldName} must be less than ${rules.maxLength} characters`;
  }

  // Check pattern
  if (!rules.pattern.test(value)) {
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

  // Validate each field
  const firstNameError = validateField(formData.first_name, "firstName");
  if (firstNameError) errors.first_name = firstNameError;

  if (formData.middle_name) {
    const middleNameError = validateField(formData.middle_name, "middleName");
    if (middleNameError) errors.middle_name = middleNameError;
  }

  const lastNameError = validateField(formData.last_name, "lastName");
  if (lastNameError) errors.last_name = lastNameError;

  const emailError = validateField(formData.email, "email");
  if (emailError) errors.email = emailError;

  return Object.keys(errors).length > 0 ? errors : null;
};
