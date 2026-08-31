const INVITATION_TOKEN = /^[a-f0-9]{64}$/i;

export function parseInvitationToken(value: string): string | null {
  const trimmed = value.trim();
  let candidate = trimmed;

  try {
    candidate = new URL(trimmed).pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    candidate = trimmed.split("/").filter(Boolean).at(-1) ?? "";
  }

  return INVITATION_TOKEN.test(candidate) ? candidate.toLowerCase() : null;
}
