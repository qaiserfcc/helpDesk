import { describe, expect, it } from "vitest";
import {
  createTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
} from "./token.js";
import { Role } from "@prisma/client";

describe("token utils", () => {
  it("creates verifiable access and refresh tokens", () => {
    const subject = { id: "user-123", role: Role.user };
    const tokens = createTokenPair(subject);

    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();

    const accessPayload = verifyAccessToken(tokens.accessToken);
    expect(accessPayload.sub).toBe(subject.id);
    expect(accessPayload.role).toBe(subject.role);

    const refreshPayload = verifyRefreshToken(tokens.refreshToken);
    expect(refreshPayload.sub).toBe(subject.id);
    expect(refreshPayload.role).toBe(subject.role);
  });
});
