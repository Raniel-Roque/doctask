/*
==========
PASSWORD GENERATION
==========
*/

/**
 * Generates a cryptographically secure random string
 */
function getSecureRandom(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[array[i] % charset.length];
  }
  return result;
}

/**
 * Generates a secure random number within a range
 */
function getSecureRandomNumber(min: number, max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] % (max - min + 1));
}

export function generatePassword(firstName: string, lastName: string): string {
  // First Initial: exactly 1 character
  const firstInitial = firstName.charAt(0).toUpperCase();

  // Last Name part: will be adjusted to fit within max length
  // Handle compound last names by removing spaces and keeping only first letter capitalized
  const cleanLastName = lastName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z]/g, "");
  const lastInitial = cleanLastName.charAt(0).toUpperCase();

  // Use secure random numbers instead of timestamp
  // Generate 4-6 random digits for better entropy
  const randomDigits = getSecureRandomNumber(1000, 999999).toString();

  // Calculate available space for remaining last name
  // Total max: 12, used: firstInitial(1) + lastInitial(1) + random(4-6) = 6-8
  const maxLastNameLength = 12 - 6; // 6 characters available for remaining last name

  // Take remaining last name characters, up to available space
  const remainingLastName = cleanLastName.slice(1, maxLastNameLength + 1);

  // Combine parts
  let password = `${firstInitial}${lastInitial}${remainingLastName}${randomDigits}`;

  // If password is too short, add more random characters
  if (password.length < 8) {
    const neededChars = 8 - password.length;
    const additionalRandom = getSecureRandom(neededChars);
    password = `${firstInitial}${lastInitial}${remainingLastName}${randomDigits}${additionalRandom}`;
  }

  // Final length check (should never exceed 12)
  if (password.length > 12) {
    password = password.slice(0, 12);
  }

  return password;
}
