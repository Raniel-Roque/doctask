import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

function generatePassword(firstName: string, lastName: string): string {
  const firstInitial = firstName.charAt(0).toUpperCase();
  const formattedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${firstInitial}${formattedLastName}${hours}${minutes}`;
}

export async function POST(request: Request) {
  try {
    const { email, firstName, lastName } = await request.json();
    const password = generatePassword(firstName, lastName);

    const client = await clerkClient();
    const user = await client.users.createUser({
      emailAddress: [email],
      password,
    });

    return NextResponse.json({ clerkId: user.id, password });
  } catch (error: any) {
    console.error("Error creating user:", error);
    
    // Check for Clerk's duplicate email error
    if (error.errors?.[0]?.message?.includes("email address exists") || 
        error.errors?.[0]?.message?.includes("email_address_exists") ||
        error.errors?.[0]?.message?.includes("email already exists")) {
      return NextResponse.json(
        { error: "This email is already registered in the system. Please use a different email address." },
        { status: 400 }
      );
    }

    // Return a more specific error message for other cases
    return NextResponse.json(
      { error: error.errors?.[0]?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}