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
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}