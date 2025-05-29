/*
==========
PASSWORD GENERATION
==========
*/

export function generatePassword(firstName: string, lastName: string, creationTime: number): string {
  // First Initial: exactly 1 character
  const firstInitial = firstName.charAt(0).toUpperCase();
  
  // Last Name part: will be adjusted to fit within max length
  const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const lastInitial = cleanLastName.charAt(0).toUpperCase();
  
  // Timestamp: minimum 4 digits, will add more if needed to reach 8 chars
  const timestampDigits = creationTime.toString().replace(/[^0-9]/g, '');
  const timestampPart = timestampDigits.slice(-4); // Start with last 4 digits
  
  // Calculate available space for remaining last name
  // Total max: 12, used: firstInitial(1) + lastInitial(1) + timestamp(4) = 6
  const maxLastNameLength = 12 - 6; // 6 characters available for remaining last name
  
  // Take remaining last name characters, up to available space
  const remainingLastName = cleanLastName.slice(1, maxLastNameLength + 1);
  
  // Combine parts
  let password = `${firstInitial}${lastInitial}${remainingLastName}${timestampPart}`;
  
  // If password is too short, add more timestamp digits
  if (password.length < 8) {
    const neededDigits = 8 - password.length;
    const additionalDigits = timestampDigits.slice(-(4 + neededDigits), -4);
    password = `${firstInitial}${lastInitial}${remainingLastName}${additionalDigits}${timestampPart}`;
  }
  
  // Final length check (should never exceed 12)
  if (password.length > 12) {
    password = password.slice(0, 12);
  }
  
  return password;
} 