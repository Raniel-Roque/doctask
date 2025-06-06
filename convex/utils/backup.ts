interface ClerkUser {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification?: {
      status: string;
      strategy: string;
    };
  }>;
  first_name: string | null;
  last_name: string | null;
  created_at: number;
  updated_at: number;
  last_sign_in_at: number | null;
  public_metadata: Record<string, unknown>;
  private_metadata: Record<string, unknown>;
  unsafe_metadata: Record<string, unknown>;
  password_enabled: boolean;
  password_last_changed_at: number | null;
  hashed_password: string | null;
}

interface ClerkBackup {
  timestamp: string;
  version: string;
  users: Array<{
    id: string;
    emailAddresses: Array<{
      id: string;
      emailAddress: string;
      verification: {
        status: string;
        strategy: string;
      };
    }>;
    firstName: string | null;
    lastName: string | null;
    createdAt: number;
    updatedAt: number;
    lastSignInAt: number | null;
    publicMetadata: Record<string, unknown>;
    privateMetadata: Record<string, unknown>;
    unsafeMetadata: Record<string, unknown>;
    passwordEnabled: boolean;
    passwordLastChangedAt: number | null;
    hashedPassword: string | null;
  }>;
}

export async function downloadClerkBackup(clerkApiKey: string): Promise<ClerkBackup> {
  try {
    // Get all users from Clerk with pagination
    let allUsers: ClerkUser[] = [];
    let offset = 0;
    const limit = 100; // Clerk's recommended batch size
    
    while (true) {
      const response = await fetch(
        `https://api.clerk.dev/v1/users?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${clerkApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Clerk API error: ${response.statusText}`);
      }

      const data = await response.json();
      allUsers = [...allUsers, ...data];
      
      // If we got fewer users than the limit, we've reached the end
      if (data.length < limit) {
        break;
      }
      
      offset += limit;
    }
    
    // Create backup object with timestamp
    const backup: ClerkBackup = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      users: allUsers.map(user => ({
        id: user.id,
        emailAddresses: user.email_addresses.map(email => ({
          id: email.id,
          emailAddress: email.email_address,
          verification: {
            status: email.verification?.status || "unverified",
            strategy: email.verification?.strategy || "email_code",
          },
        })),
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastSignInAt: user.last_sign_in_at,
        publicMetadata: user.public_metadata,
        privateMetadata: user.private_metadata,
        unsafeMetadata: user.unsafe_metadata,
        passwordEnabled: user.password_enabled,
        passwordLastChangedAt: user.password_last_changed_at,
        hashedPassword: user.hashed_password,
      }))
    };

    return backup;
  } catch {
    throw new Error("Failed to download Clerk backup");
  }
}

interface ConvexBackup {
  timestamp: string;
  version: string;
  tables: {
    users: unknown[];
    groups: unknown[];
    students: unknown[];
    advisers: unknown[];
    logs: unknown[];
  };
}

export function validateBackupFile(file: unknown): file is ConvexBackup {
  if (!file || typeof file !== 'object') {
    throw new Error("Invalid backup file format");
  }

  const backup = file as ConvexBackup;
  if (!backup.timestamp || !backup.version || !backup.tables) {
    throw new Error("Backup file is missing required fields");
  }

  // Validate each table exists and has data
  const requiredTables = ['users', 'groups', 'students', 'advisers', 'logs'];
  for (const table of requiredTables) {
    if (!backup.tables[table as keyof typeof backup.tables] || 
        !Array.isArray(backup.tables[table as keyof typeof backup.tables])) {
      throw new Error(`Backup file is missing or has invalid ${table} table`);
    }
  }

  return true;
} 