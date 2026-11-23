// Read on every call so changing BLOCKED_EMAILS takes effect on the next
// request without a code change.
function getBlockedEmails() {
  return new Set(
    (process.env.BLOCKED_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailBlocked(email: string) {
  return getBlockedEmails().has(email.trim().toLowerCase());
}
