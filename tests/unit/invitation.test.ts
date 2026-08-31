import { describe, expect, it } from "vitest";

import { parseInvitationToken } from "@/lib/invitation";

const TOKEN = "A1".repeat(32);

describe("parseInvitationToken", () => {
  it("normalise un token brut", () => {
    expect(parseInvitationToken(`  ${TOKEN}  `)).toBe(TOKEN.toLowerCase());
  });

  it("extrait le token d’un lien d’invitation", () => {
    expect(parseInvitationToken(`https://baby-foot-chi.vercel.app/join/${TOKEN}`)).toBe(TOKEN.toLowerCase());
  });

  it.each(["", "abc", "https://example.com/join/not-a-token", "f".repeat(63), "z".repeat(64)])(
    "refuse une invitation invalide : %s",
    (value) => expect(parseInvitationToken(value)).toBeNull(),
  );
});
