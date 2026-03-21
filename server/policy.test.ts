import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Policy Router Tests
 *
 * These tests verify:
 * 1. The policy router is correctly mounted on the appRouter
 * 2. Protected procedures reject unauthenticated callers
 * 3. Auth procedures work correctly (me, logout)
 */

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAuthenticatedContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@oplytics.digital",
    name: "Test User",
    loginMethod: "portal",
    role: "admin",
    enterpriseId: 100,
    portalUserId: 42,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Policy Router — mount check", () => {
  it("appRouter has a policy namespace", () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    // The policy namespace should exist and have callable procedures
    expect(caller.policy).toBeDefined();
  });
});

describe("Policy Router — auth enforcement", () => {
  it("auth.me returns null for unauthenticated users", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated users", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.openId).toBe("test-user-001");
    expect(result?.enterpriseId).toBe(100);
  });

  it("policy.listPlans rejects unauthenticated callers", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.policy.listPlans()).rejects.toThrow();
  });

  it("policy.listTeamMembers rejects unauthenticated callers", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.policy.listTeamMembers()).rejects.toThrow();
  });

  it("policy.listSites rejects unauthenticated callers", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.policy.listSites()).rejects.toThrow();
  });
});

describe("Policy Router — user context", () => {
  it("authenticated user has enterpriseId for scoping", async () => {
    const ctx = createAuthenticatedContext({ enterpriseId: 200 });
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.enterpriseId).toBe(200);
    expect(user?.role).toBe("admin");
  });

  it("platform_admin role is recognised", async () => {
    const ctx = createAuthenticatedContext({ role: "platform_admin" });
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.role).toBe("platform_admin");
  });
});
