import { DatabaseReader } from "../_generated/server";

// Constants for code generation
const CODE_LENGTH = 4;
const CODE_SEGMENTS = 3;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Generates a random code segment of specified length
 */
function generateCodeSegment(length: number): string {
  let segment = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * LETTERS.length);
    segment += LETTERS[randomIndex];
  }
  return segment;
}

/**
 * Generates a complete adviser code in the format XXXX-XXXX-XXXX
 */
export function generateAdviserCode(): string {
  const segments = Array.from({ length: CODE_SEGMENTS }, () =>
    generateCodeSegment(CODE_LENGTH),
  );
  return segments.join("-");
}

/**
 * Validates if a code matches the required format
 */
export function validateAdviserCode(code: string): boolean {
  const codeRegex = new RegExp(
    `^[A-Z]{${CODE_LENGTH}}-[A-Z]{${CODE_LENGTH}}-[A-Z]{${CODE_LENGTH}}$`,
  );
  return codeRegex.test(code);
}

/**
 * Generates a unique adviser code that doesn't exist in the database
 */
export async function generateUniqueAdviserCode(ctx: {
  db: DatabaseReader;
}): Promise<string> {
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    code = generateAdviserCode();
    const existingCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!existingCode) {
      isUnique = true;
      return code;
    }
  }

  throw new Error("Failed to generate unique code after multiple attempts");
}
