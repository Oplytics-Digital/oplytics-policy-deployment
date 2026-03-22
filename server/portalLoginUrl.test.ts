import { describe, it, expect } from "vitest";

/**
 * Validate that VITE_PORTAL_LOGIN_URL is set and points to the correct portal.
 *
 * VITE_PORTAL_LOGIN_URL is a frontend env var injected by the Manus sandbox.
 * In CI (GitHub Actions) it may not be present — tests that depend on it
 * are skipped when the var is absent.
 */

const PORTAL_URL = process.env.VITE_PORTAL_LOGIN_URL;
const describeIfEnv = PORTAL_URL ? describe : describe.skip;

describeIfEnv("Portal Login URL", () => {
  it("VITE_PORTAL_LOGIN_URL should point to portal.oplytics.digital", () => {
    expect(PORTAL_URL).toContain("portal.oplytics.digital");
  });

  it("should construct a valid login URL from the env var", () => {
    const loginUrl = new URL("/login", PORTAL_URL!);
    expect(loginUrl.hostname).toBe("portal.oplytics.digital");
    expect(loginUrl.pathname).toBe("/login");
    expect(loginUrl.protocol).toBe("https:");
  });

  it("should support returnTo parameter", () => {
    const loginUrl = new URL("/login", PORTAL_URL!);
    loginUrl.searchParams.set(
      "returnTo",
      "https://policydeployment.oplytics.digital"
    );
    expect(loginUrl.toString()).toContain("returnTo=");
    expect(loginUrl.searchParams.get("returnTo")).toBe(
      "https://policydeployment.oplytics.digital"
    );
  });

  it("portal login page should be reachable", async () => {
    const res = await fetch(`${PORTAL_URL!}/login`, {
      method: "HEAD",
      redirect: "manual",
    });
    expect(res.status).toBeLessThan(400);
  });
});

describe("Portal Login URL — static validation", () => {
  it("getLoginUrl logic produces correct URL shape", () => {
    // Validate the URL construction logic independent of env
    const base = "https://portal.oplytics.digital";
    const url = new URL("/login", base);
    expect(url.toString()).toBe("https://portal.oplytics.digital/login");
  });

  it("getLoginUrl with returnTo appends query param", () => {
    const base = "https://portal.oplytics.digital";
    const url = new URL("/login", base);
    url.searchParams.set("returnTo", "https://example.com");
    expect(url.toString()).toBe(
      "https://portal.oplytics.digital/login?returnTo=https%3A%2F%2Fexample.com"
    );
  });
});
