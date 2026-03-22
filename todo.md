# Oplytics Policy Deployment — Standalone App TODO

## Infrastructure
- [x] DB schema — policy tables only (policyPlans, breakthroughObjectives, annualObjectives, improvementProjects, policyKpis, policyCorrelations, bowlingEntries, deploymentTargets, deploymentAudits, deploymentMetrics, metricPushLogs) + users table
- [x] SSO auth — COOKIE_DOMAIN, PORTAL_JWT_SECRET, same pattern as SQDCP
- [x] Portal Service API integration — portalClient for hierarchy and user data
- [x] Environment secrets — COOKIE_DOMAIN, PORTAL_JWT_SECRET, PORTAL_URL, VITE_PORTAL_LOGIN_URL

## Server
- [x] policyDb.ts — all CRUD operations extracted from platform
- [x] tRPC policy router — all procedures extracted from platform
- [x] Express server entry with SSO auth middleware

## Client
- [x] Install @pablo2410/shared-ui@0.3.5 and @pablo2410/core-server@0.1.1
- [x] PolicyDeploymentLayout — sidebar navigation shell
- [x] Dashboard component
- [x] XMatrix component
- [x] BowlingChart component
- [x] PolicyManage component (admin)
- [x] Deployments component
- [x] IntegrationDashboard component (admin)
- [x] Catchball component
- [x] ActionPlans component
- [x] PolicyContext — data provider
- [x] SharedPageHeader component
- [x] ReportingToolbar component
- [x] HierarchyContext — hierarchy provider
- [x] Page wrappers (PolicyDashboard, PolicyXMatrix, PolicyBowling, etc.)
- [x] Routing in App.tsx

## Verification
- [x] Zero TypeScript errors
- [x] Build successful
- [x] Dashboard visible in browser

## Fixes
- [x] Add PORTAL_API_KEY secret for Portal Service API authentication
- [x] Update portalClient.ts to send X-Service-Key header on every request
- [x] Port seedPolicy.mjs into standalone project for independent re-seeding
## X-Matrix Site Filtering (feat/policy-xmatrix-site-filtering)
- [x] Implement correlation tracing filter in PolicyContext — filter by site/BU from hierarchy breadcrumb
- [x] Wire Deployments component to breadcrumb siteId via listDeploymentTargetsBySite
- [x] Write vitest tests for correlation tracing filter logic
- [x] Create branch feat/policy-xmatrix-site-filtering, push, create PR

## Playwright E2E Regression Suite
- [x] Research Playwright setup for Vite + Express app
- [x] Propose implementation plan (analysis only, no code)
- [ ] Implement E2E tests: login via portal SSO, dashboard landing
- [ ] Implement E2E tests: select Vita Middleton in breadcrumb, verify X-Matrix filters
- [ ] Implement E2E tests: select F&B BU, verify broader filter
- [ ] Implement E2E tests: navigate to Bowling Chart, verify data loads

## Login Redirect Fix (fix/policy-portal-login-redirect)
- [x] Update getLoginUrl() in const.ts to use VITE_PORTAL_LOGIN_URL instead of Manus OAuth
- [x] Set VITE_PORTAL_LOGIN_URL=https://portal.oplytics.digital in sandbox secrets
- [ ] Zero TS errors, CI green, PR created
