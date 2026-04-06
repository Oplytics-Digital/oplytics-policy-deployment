import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getPortalUserByOpenId } from "../portalClient";
import { ENV } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";

/** Map portal role strings to local role enum values */
function mapPortalRole(portalRole: string): "user" | "admin" | "platform_admin" {
  switch (portalRole) {
    case "platform_admin":
      return "platform_admin";
    case "enterprise_admin":
    case "superuser":
    case "admin":
      return "admin";
    default:
      return "user";
  }
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error("[OAuth] ERROR: OAUTH_SERVER_URL is not configured!");
    }
  }

  private decodeState(state: string): string {
    return atob(state);
  }

  async getTokenByCode(code: string, state: string): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };
    const { data } = await this.client.post<ExchangeTokenResponse>(EXCHANGE_TOKEN_PATH, payload);
    return data;
  }

  async getUserInfoByToken(token: ExchangeTokenResponse): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(GET_USER_INFO_PATH, {
      accessToken: token.accessToken,
    });
    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({ baseURL: ENV.oAuthServerUrl, timeout: AXIOS_TIMEOUT_MS });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(platforms: unknown, fallback: string | null | undefined): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(platforms.filter((p): p is string => typeof p === "string"));
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE")) return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  async exchangeCodeForToken(code: string, state: string): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({ accessToken } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod((data as any)?.platforms, (data as any)?.platform ?? data.platform ?? null);
    return { ...(data as any), platform: loginMethod, loginMethod } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  /**
   * Portal JWT secret — shared with portal.oplytics.digital for cross-subdomain SSO.
   */
  private getPortalSecret() {
    const secret = ENV.portalJwtSecret;
    if (!secret) throw new Error("PORTAL_JWT_SECRET is not configured");
    return new TextEncoder().encode(secret);
  }

  /** Local Manus-managed JWT_SECRET for sessions signed by this app. */
  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(openId: string, options: { expiresInMs?: number; name?: string } = {}): Promise<string> {
    return this.signSession({ openId, appId: ENV.appId, name: options.name || "" }, options);
  }

  async signSession(payload: SessionPayload, options: { expiresInMs?: number } = {}): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * Verify session cookie — tries PORTAL_JWT_SECRET first (cross-subdomain SSO),
   * then falls back to local JWT_SECRET.
   */
  async verifySession(cookieValue: string | undefined | null): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    // Try portal secret first (cross-subdomain SSO)
    if (ENV.portalJwtSecret) {
      try {
        const portalKey = this.getPortalSecret();
        const { payload } = await jwtVerify(cookieValue, portalKey, { algorithms: ["HS256"] });
        const { openId, appId, name } = payload as Record<string, unknown>;
        if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
          console.warn("[Auth] Portal JWT payload missing required fields");
          return null;
        }
        return { openId, appId, name };
      } catch {
        // Portal secret didn't work — fall through to local secret
      }
    }

    // Fallback: local Manus-managed JWT_SECRET
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, { algorithms: ["HS256"] });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return { openId, appId, name };
    } catch (error) {
      console.warn("[Auth] Session verification failed:", (error as Error).message);
      return null;
    }
  }

  async getUserInfoWithJwt(jwtToken: string): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = { jwtToken, projectId: ENV.appId };
    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(GET_USER_INFO_WITH_JWT_PATH, payload);
    const loginMethod = this.deriveLoginMethod((data as any)?.platforms, (data as any)?.platform ?? data.platform ?? null);
    return { ...(data as any), platform: loginMethod, loginMethod } as GetUserInfoWithJwtResponse;
  }

  /**
   * Authenticate an incoming request.
   * 1. Verify the session cookie (portal JWT or local JWT).
   * 2. If user doesn't exist locally, create from portal API or JWT payload.
   * 3. For existing users: re-sync role from portal (and backfill enterpriseId if null).
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);
    const isNewUser = !user;

    // Auto-create user from portal API or JWT payload (cross-subdomain SSO)
    if (!user) {
      try {
        const portalUser = await getPortalUserByOpenId(sessionUserId);
        if (portalUser) {
          console.log(`[Auth] Cross-subdomain SSO: creating user from portal (${portalUser.email || sessionUserId})`);
          await db.upsertUser({
            openId: sessionUserId,
            name: portalUser.name || session.name || null,
            email: portalUser.email ?? null,
            loginMethod: "portal-sso",
            role: mapPortalRole(portalUser.role),
            lastSignedIn: signedInAt,
          });
          user = await db.getUserByOpenId(sessionUserId);

          // Set enterpriseId and portalUserId
          if (user && portalUser.companyId) {
            const dbInstance = await db.getDb();
            if (dbInstance) {
              const { users: usersTable } = await import("../../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              await dbInstance.update(usersTable).set({
                enterpriseId: portalUser.companyId,
                portalUserId: portalUser.id,
              }).where(eq(usersTable.id, user.id));
              user = await db.getUserByOpenId(sessionUserId);
            }
          }
        } else {
          // Portal API unavailable — create from JWT payload
          console.log(`[Auth] Cross-subdomain SSO: creating user from JWT payload (${sessionUserId})`);
          await db.upsertUser({
            openId: sessionUserId,
            name: session.name || null,
            loginMethod: "portal-sso",
            lastSignedIn: signedInAt,
          });
          user = await db.getUserByOpenId(sessionUserId);
        }
      } catch (error) {
        // Last resort: try Manus OAuth
        try {
          const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
          await db.upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: signedInAt,
          });
          user = await db.getUserByOpenId(userInfo.openId);
        } catch (oauthError) {
          console.error("[Auth] All user sync methods failed:", error, oauthError);
          throw ForbiddenError("Failed to sync user info");
        }
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    // Re-sync role (and backfill enterpriseId if needed) from portal for existing users
    if (!isNewUser) {
      try {
        const portalUser = await getPortalUserByOpenId(user.openId);
        if (portalUser) {
          const syncedRole = mapPortalRole(portalUser.role);
          const dbInstance = await db.getDb();
          if (dbInstance) {
            const { users: usersTable } = await import("../../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const updates: Record<string, unknown> = {};

            if (syncedRole !== user.role) {
              console.log(`[Auth] Role sync: ${user.role} → ${syncedRole} for user ${user.id}`);
              updates.role = syncedRole;
            }
            if (user.enterpriseId === null && portalUser.companyId) {
              console.log(`[Auth] Backfilling enterpriseId=${portalUser.companyId} for user ${user.id}`);
              updates.enterpriseId = portalUser.companyId;
            }
            if (!user.portalUserId && portalUser.id) {
              updates.portalUserId = portalUser.id;
            }

            if (Object.keys(updates).length > 0) {
              await dbInstance.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
              user = (await db.getUserByOpenId(user.openId)) ?? user;
            }
          }
        } else if (user.enterpriseId === null) {
          // Portal unavailable — fallback: auto-assign if only one enterprise exists
          const dbInstance = await db.getDb();
          if (dbInstance) {
            const { sql } = await import("drizzle-orm");
            const rows = await dbInstance.execute(
              sql`SELECT DISTINCT enterpriseId FROM users WHERE enterpriseId IS NOT NULL LIMIT 2`
            );
            const distinctIds = (rows as any)?.[0] ?? rows;
            if (Array.isArray(distinctIds) && distinctIds.length === 1 && distinctIds[0]?.enterpriseId) {
              const soleEnterpriseId = Number(distinctIds[0].enterpriseId);
              console.log(`[Auth] Auto-assigning sole enterprise (id=${soleEnterpriseId}) to user ${user.id}`);
              const { users: usersTable } = await import("../../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              await dbInstance.update(usersTable).set({ enterpriseId: soleEnterpriseId }).where(eq(usersTable.id, user.id));
              user = (await db.getUserByOpenId(user.openId)) ?? user;
            }
          }
        }
      } catch (syncError) {
        console.warn(`[Auth] Failed to sync user ${user.id} from portal:`, syncError);
      }
    }

    await db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt });
    return user;
  }
}

export const sdk = new SDKServer();
