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
- [ ] Create branch feat/policy-xmatrix-site-filtering, push, create PR
