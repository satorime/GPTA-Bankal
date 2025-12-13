import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUserFriendlyError } from "./error-messages";

export function jsonResponse<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function handleApiError(error: unknown) {
  console.error(error);

  if (error instanceof ZodError) {
    // Format Zod validation errors into user-friendly messages
    const issues = error.flatten().fieldErrors;
    const fieldMessages: string[] = [];
    
    for (const [field, messages] of Object.entries(issues)) {
      if (Array.isArray(messages) && messages.length > 0) {
        const fieldName = field.replace(/([A-Z])/g, " $1").toLowerCase().trim();
        fieldMessages.push(`${fieldName}: ${messages[0]}`);
      }
    }
    
    const message = fieldMessages.length > 0
      ? `Please check your input: ${fieldMessages.join(". ")}`
      : "Please check your input and try again.";

    return NextResponse.json(
      {
        message,
        issues: error.flatten(),
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    const friendlyMessage = getUserFriendlyError(error);
    return NextResponse.json({ message: friendlyMessage }, { status: 500 });
  }

  return NextResponse.json(
    { message: "An unexpected error occurred. Please try again." },
    { status: 500 }
  );
}

