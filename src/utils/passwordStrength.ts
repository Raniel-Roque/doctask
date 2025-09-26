// Password strength calculation based on NIST SP 800-63B guidelines
// NIST recommends focusing on length over complexity and avoiding mandatory composition rules

export interface PasswordStrength {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: string;
  isAcceptable: boolean; // Based on NIST guidelines
}

export const calculatePasswordStrength = (
  password: string,
): PasswordStrength => {
  if (!password) {
    return {
      score: 0,
      feedback: "Enter a password to see strength",
      isAcceptable: false,
    };
  }

  // NIST minimum length requirement (8 characters minimum)
  if (password.length < 8) {
    return {
      score: 0,
      feedback: "Password must be at least 8 characters long",
      isAcceptable: false,
    };
  }

  // NIST maximum length (64 characters)
  if (password.length > 64) {
    return {
      score: 0,
      feedback: "Password is too long (maximum 64 characters)",
      isAcceptable: false,
    };
  }

  let score = 0;
  let feedback = "";

  // Length scoring (NIST emphasizes length over complexity)
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (password.length >= 20) score += 1;

  // Character variety (bonus points, not required by NIST)
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/.test(password);
  const hasSpace = /\s/.test(password);

  const varietyCount = [
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSpecialChar,
    hasSpace,
  ].filter(Boolean).length;

  // Bonus for character variety (but not required)
  if (varietyCount >= 3) score += 1;
  if (varietyCount >= 4) score += 1;

  // Cap at 4
  score = Math.min(score, 4);

  // Check for common patterns that weaken passwords
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i,
    /letmein/i,
    /12345678/,
    /password123/i,
    /qwerty123/i,
    /admin123/i,
  ];

  const hasCommonPattern = commonPatterns.some((pattern) =>
    pattern.test(password),
  );
  if (hasCommonPattern && score > 1) {
    score = Math.max(1, score - 1);
    feedback = "Avoid common patterns";
  }

  // Generate feedback based on score
  switch (score) {
    case 0:
      feedback = feedback || "Very weak - Use at least 8 characters";
      break;
    case 1:
      feedback = feedback || "Weak - Consider using more characters";
      break;
    case 2:
      feedback = feedback || "Fair - Good length, consider adding variety";
      break;
    case 3:
      feedback = feedback || "Good - Strong password";
      break;
    case 4:
      feedback = feedback || "Very strong - Excellent password";
      break;
  }

  return {
    score,
    feedback,
    isAcceptable: password.length >= 8 && password.length <= 64,
  };
};

export const getStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
      return "bg-red-500";
    case 1:
      return "bg-orange-500";
    case 2:
      return "bg-yellow-500";
    case 3:
      return "bg-blue-500";
    case 4:
      return "bg-green-500";
    default:
      return "bg-gray-300";
  }
};

export const getStrengthLabel = (score: number): string => {
  switch (score) {
    case 0:
      return "Very Weak";
    case 1:
      return "Weak";
    case 2:
      return "Fair";
    case 3:
      return "Good";
    case 4:
      return "Very Strong";
    default:
      return "Unknown";
  }
};
