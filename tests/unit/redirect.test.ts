import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/auth/redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/match/new", "/match/new"],
    ["/join/token?source=qr#ready", "/join/token?source=qr#ready"],
    [undefined, "/"],
    ["https://evil.example/path", "/"],
    ["//evil.example/path", "/"],
  ])("transforme %s en %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
