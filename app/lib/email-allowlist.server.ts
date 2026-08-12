const allowedEmailDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
  .split(",")
  .map((domain) => domain.trim().replace(/^@/, "").toLowerCase())
  .filter(Boolean);

export const EMAIL_DOMAIN_RESTRICTION_MESSAGE =
  "Access restricted to approved email domains";

export function isEmailAllowed(email: string) {
  if (allowedEmailDomains.length === 0) {
    return true;
  }

  const domain = email.split("@").pop()?.trim().toLowerCase();

  return domain !== undefined && allowedEmailDomains.includes(domain);
}
