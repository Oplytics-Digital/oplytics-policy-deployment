import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { SessionUser } from "./sdk";
import { sdk } from "./sdk";
import { applyEnterpriseOverride } from "@pablo2410/shared-ui/hierarchy";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: SessionUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: SessionUser | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Apply platform_admin enterprise override from cookie
  // (set by portal.oplytics.digital/app/settings enterprise switcher)
  user = applyEnterpriseOverride(user, opts.req.headers.cookie || "");

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
