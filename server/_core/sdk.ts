import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
} from "./types/manusTypes";

export type SessionUserRole =
  | "platform_admin"
  | "enterprise_admin"
  | "superuser"
  | "bu_user"
  | "site_user"
  | "area_user"
  | "asset_user";

/**
 * Authenticated user derived purely from JWT claims.
 * Portal PR #13 embeds role and enterpriseId in the session token, eliminating
 * the need for any local database lookup on authenticated requests.
 */
export type SessionUser = {
  openId: string;
  name: string;
  role: SessionUserRole;
  enterpriseId: number | null;
};

/** Pass the portal role through unchanged */
function mapPortalRole(portalRole: string): SessionUserRole {
  return portalRole as SessionUserRole;
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
   *
   * Returns all available claims from the token payload, including role and
   * enterpriseId embedded by portal PR #13.
   */
  async verifySession(cookieValue: string | undefined | null): Promise<Record<string, unknown> | null> {
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
        return payload as Record<string, unknown>;
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
      return payload as Record<string, unknown>;
    } catch (error) {
      console.warn("[Auth] Session verification failed:", (error as Error).message);
      return null;
    }
  }

  /**
   * Authenticate an incoming request.
   *
   * Stateless — reads openId, name, role, and enterpriseId directly from the
   * verified JWT claims. Portal PR #13 embeds role and enterpriseId in the
   * session token, so no database lookup is required.
   */
  async authenticateRequest(req: Request): Promise<SessionUser> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const payload = await this.verifySession(sessionCookie);

    if (!payload) {
      throw ForbiddenError("Invalid session cookie");
    }

    const { openId, name, role, enterpriseId } = payload as Record<string, unknown>;

    if (!isNonEmptyString(openId)) {
      throw ForbiddenError("Invalid session: missing openId");
    }

    return {
      openId,
      name: isNonEmptyString(name) ? name : "",
      role: mapPortalRole(isNonEmptyString(role) ? role : "bu_user"),
      enterpriseId: typeof enterpriseId === "number" ? enterpriseId : null,
    };
  }
}

export const sdk = new SDKServer();
