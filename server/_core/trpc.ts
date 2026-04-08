import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, NO_ENTERPRISE_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Enterprise Isolation: requires authenticated user with an assigned enterprise
const requireEnterprise = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const enterpriseId = ctx.user.enterpriseId;
  if (!enterpriseId) {
    throw new TRPCError({ code: "FORBIDDEN", message: NO_ENTERPRISE_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      enterpriseId,
    },
  });
});

export const enterpriseProcedure = t.procedure.use(requireEnterprise);

// Enterprise admin: requires enterprise context + admin role
export const enterpriseAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['platform_admin', 'enterprise_admin', 'superuser'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    const enterpriseId = ctx.user.enterpriseId;
    if (!enterpriseId) {
      throw new TRPCError({ code: "FORBIDDEN", message: NO_ENTERPRISE_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        enterpriseId,
      },
    });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['platform_admin', 'enterprise_admin', 'superuser'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
