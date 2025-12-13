/**
 * Converts technical error messages to user-friendly messages
 */
export function getUserFriendlyError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "An unexpected error occurred. Please try again.";
  }

  const message = error.message.toLowerCase();

  // Database/Network errors
  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  if (message.includes("timeout")) {
    return "The request took too long to complete. Please try again.";
  }

  // Validation errors
  if (message.includes("validation") || message.includes("invalid")) {
    if (message.includes("student code") || message.includes("lrn")) {
      return "Please enter a valid student code (LRN).";
    }
    if (message.includes("email")) {
      return "Please enter a valid email address.";
    }
    if (message.includes("phone") || message.includes("contact")) {
      return "Please enter a valid contact number.";
    }
    if (message.includes("amount") || message.includes("price")) {
      return "Please enter a valid amount (numbers only).";
    }
    if (message.includes("date")) {
      return "Please enter a valid date.";
    }
    if (message.includes("required")) {
      return "Please fill in all required fields.";
    }
    return "Please check your input and try again. Some fields may be invalid or missing.";
  }

  // Database constraint errors
  if (message.includes("unique") || message.includes("duplicate") || message.includes("already exists")) {
    if (message.includes("student_code") || message.includes("lrn")) {
      return "A student with this code (LRN) already exists. Please use a different code.";
    }
    return "This record already exists. Please check for duplicates.";
  }

  if (message.includes("foreign key") || message.includes("constraint")) {
    if (message.includes("student")) {
      return "Cannot perform this action. The student may have related records (payments or requirements).";
    }
    if (message.includes("requirement")) {
      return "Cannot perform this action. This requirement is being used by existing payments.";
    }
    return "Cannot perform this action. This record is being used elsewhere in the system.";
  }

  // Permission errors
  if (message.includes("permission") || message.includes("unauthorized") || message.includes("forbidden")) {
    return "You don't have permission to perform this action. Please contact an administrator.";
  }

  // File system errors
  if (message.includes("permission denied") || message.includes("eacces")) {
    return "Permission denied. The application does not have permission to access this file or folder.";
  }

  if (message.includes("not found") || message.includes("enoent")) {
    return "The requested file or folder could not be found.";
  }

  if (message.includes("read-only") || message.includes("erofs")) {
    return "The file system is read-only. Cannot save files. Please check disk permissions.";
  }

  if (message.includes("backup")) {
    if (message.includes("failed") || message.includes("error")) {
      return "Unable to create backup file. Please check file system permissions and available disk space.";
    }
  }

  // File upload errors
  if (message.includes("file") || message.includes("upload")) {
    if (message.includes("too large") || message.includes("size")) {
      return "The file is too large. Please choose a smaller file.";
    }
    if (message.includes("format") || message.includes("type") || message.includes("extension")) {
      return "Invalid file format. Please upload a supported file type (Excel, CSV).";
    }
    if (message.includes("empty") || message.includes("no data")) {
      return "The uploaded file is empty or contains no valid data. Please check your file.";
    }
    return "There was a problem uploading the file. Please try again.";
  }

  // Payment/Student specific errors
  if (message.includes("student not found")) {
    return "Student not found. Please check the student code (LRN) and try again.";
  }

  if (message.includes("payment")) {
    if (message.includes("insufficient") || message.includes("balance")) {
      return "Insufficient balance or invalid payment amount.";
    }
  }

  // Generic Supabase errors
  if (message.includes("supabase") || message.includes("postgres")) {
    return "A database error occurred. Please try again. If the problem persists, contact support.";
  }

  // Row validation errors
  if (message.includes("row") && message.includes("failed")) {
    return "Some rows in your file could not be processed. Please check the file format and data.";
  }

  // Return original message if it's already user-friendly, otherwise provide generic message
  // Check if the message looks technical (contains codes, paths, etc.)
  if (
    message.includes("error:") ||
    message.includes("at ") ||
    message.includes("code:") ||
    message.includes("c:\\") ||
    message.includes("/") ||
    message.match(/\d{4}-\d{2}-\d{2}/) // dates
  ) {
    return "An error occurred while processing your request. Please try again or contact support if the problem persists.";
  }

  // Return the original message if it seems user-friendly already
  return error.message;
}

