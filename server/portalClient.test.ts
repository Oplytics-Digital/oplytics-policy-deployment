import { describe, expect, it } from "vitest";
import axios from "axios";

/**
 * Portal Client — Secret Validation Tests
 *
 * Validates that PORTAL_API_KEY is set and accepted by the Portal Service API.
 * These tests make a real HTTP request to portal.oplytics.digital to verify
 * the X-Service-Key header is accepted (not 401).
 */

const PORTAL_URL = process.env.PORTAL_URL ?? "https://portal.oplytics.digital";
const PORTAL_API_KEY = process.env.PORTAL_API_KEY ?? "";

describe("Portal Client — PORTAL_API_KEY validation", () => {
  it("PORTAL_API_KEY env var is set and non-empty", () => {
    expect(PORTAL_API_KEY).toBeTruthy();
    expect(PORTAL_API_KEY.length).toBeGreaterThan(5);
  });

  it("Portal Service API accepts the X-Service-Key (not 401)", async () => {
    // Use a known-nonexistent openId to get a 404 (which proves auth passed)
    // A 401 means the key is invalid; a 404 means auth succeeded but user not found
    try {
      const response = await axios.get(
        `${PORTAL_URL}/api/service/users/by-open-id/nonexistent-test-user-000`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Service-Key": PORTAL_API_KEY,
          },
          timeout: 10000,
          validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
        }
      );

      // 404 = auth passed, user not found (expected)
      // 200 = auth passed, user found (unlikely for this fake openId)
      // 401 = auth failed (PORTAL_API_KEY is wrong)
      expect(response.status).not.toBe(401);
    } catch (error: any) {
      // Network error or timeout — skip assertion but don't fail on connectivity
      if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND" || error?.code === "ETIMEDOUT") {
        console.warn("[Test] Portal API unreachable — skipping live validation");
        return;
      }
      throw error;
    }
  });
});
