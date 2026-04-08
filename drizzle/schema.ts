import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

// ─── Policy Plans ───

/**
 * Top-level Hoshin Kanri plan — one per enterprise per year.
 * enterpriseId is stored as a plain int (no FK to a local enterprises table;
 * enterprise data is consumed via the Portal Service API).
 */
export const policyPlans = mysqlTable("policy_plans", {
  id: int("id").autoincrement().primaryKey(),
  enterpriseId: int("enterpriseId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  year: int("year").notNull(),
  level: mysqlEnum("level", ["enterprise", "business_unit", "site"]).default("enterprise").notNull(),
  ownerId: int("ownerId"),
  ownerName: varchar("ownerName", { length: 255 }),
  status: mysqlEnum("planStatus", ["draft", "active", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PolicyPlan = typeof policyPlans.$inferSelect;
export type InsertPolicyPlan = typeof policyPlans.$inferInsert;

// ─── Breakthrough Objectives ───

/**
 * 3-5 year strategic goals. Category-based reference codes (S1, C1, D1, Q1, M1).
 */
export const breakthroughObjectives = mysqlTable("breakthrough_objectives", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull().references(() => policyPlans.id),
  code: varchar("code", { length: 20 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("boCategory", ["safety", "cost", "delivery", "quality", "people"]).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BreakthroughObjective = typeof breakthroughObjectives.$inferSelect;
export type InsertBreakthroughObjective = typeof breakthroughObjectives.$inferInsert;

// ─── Annual Objectives ───

/**
 * Yearly tactics that support breakthroughs. Reference codes: T1, T2, etc.
 */
export const annualObjectives = mysqlTable("annual_objectives", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull().references(() => policyPlans.id),
  code: varchar("code", { length: 20 }).notNull(),
  description: text("description").notNull(),
  ownerId: int("ownerId"),
  ownerName: varchar("ownerName", { length: 255 }),
  status: mysqlEnum("aoStatus", ["on-track", "at-risk", "off-track", "not-started", "completed"]).default("not-started").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnnualObjective = typeof annualObjectives.$inferSelect;
export type InsertAnnualObjective = typeof annualObjectives.$inferInsert;

// ─── Improvement Projects ───

/**
 * Specific projects that execute annual objectives. Reference codes: P1.1, P1.2, etc.
 */
export const improvementProjects = mysqlTable("improvement_projects", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull().references(() => policyPlans.id),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  ownerId: int("ownerId"),
  ownerName: varchar("ownerName", { length: 255 }),
  status: mysqlEnum("projStatus", ["on-track", "at-risk", "off-track", "not-started", "completed"]).default("not-started").notNull(),
  progress: int("progress").default(0).notNull(),
  startDate: varchar("startDate", { length: 20 }),
  endDate: varchar("endDate", { length: 20 }),
  category: mysqlEnum("projCategory", ["safety", "quality", "delivery", "cost", "people"]).default("cost").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ImprovementProject = typeof improvementProjects.$inferSelect;
export type InsertImprovementProject = typeof improvementProjects.$inferInsert;

// ─── Policy KPIs ───

/**
 * Key Performance Indicators measured in bowling charts. Reference codes: IP1.1, IP1.2, etc.
 */
export const policyKpis = mysqlTable("policy_kpis", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull().references(() => policyPlans.id),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  target: decimal("target", { precision: 12, scale: 2 }),
  current: decimal("current", { precision: 12, scale: 2 }),
  direction: mysqlEnum("kpiDirection", ["up", "down"]).default("up").notNull(),
  ownerId: int("ownerId"),
  ownerName: varchar("ownerName", { length: 255 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PolicyKpi = typeof policyKpis.$inferSelect;
export type InsertPolicyKpi = typeof policyKpis.$inferInsert;

// ─── Policy Correlations ───

/**
 * X-Matrix correlation dots linking the four quadrants.
 * sourceId/targetId are polymorphic (depend on sourceType/targetType), so no FK constraint.
 */
export const policyCorrelations = mysqlTable("policy_correlations", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull().references(() => policyPlans.id),
  sourceId: int("sourceId").notNull(),
  targetId: int("targetId").notNull(),
  sourceType: mysqlEnum("sourceType", ["bo", "ao", "project", "kpi"]).notNull(),
  targetType: mysqlEnum("targetType", ["bo", "ao", "project", "kpi"]).notNull(),
  strength: mysqlEnum("corrStrength", ["strong", "weak"]).default("strong").notNull(),
  quadrant: mysqlEnum("corrQuadrant", ["bo-ao", "ao-proj", "proj-kpi", "kpi-bo"]).notNull(),
});

export type PolicyCorrelation = typeof policyCorrelations.$inferSelect;
export type InsertPolicyCorrelation = typeof policyCorrelations.$inferInsert;

// ─── Bowling Entries ───

/**
 * Monthly plan vs actual for each KPI.
 */
export const bowlingEntries = mysqlTable("bowling_entries", {
  id: int("id").autoincrement().primaryKey(),
  kpiId: int("kpiId").notNull().references(() => policyKpis.id),
  month: int("month").notNull(),
  year: int("year").notNull(),
  planValue: decimal("planValue", { precision: 12, scale: 2 }),
  actualValue: decimal("actualValue", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BowlingEntry = typeof bowlingEntries.$inferSelect;
export type InsertBowlingEntry = typeof bowlingEntries.$inferInsert;

// ─── Deployment Targets ───

/**
 * Links an objective to a specific site and SQDCP category.
 * siteId is stored as a plain int (no FK — site data comes from Portal Service API).
 */
export const deploymentTargets = mysqlTable("deployment_targets", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull().references(() => policyPlans.id),
  objectiveId: int("objectiveId").notNull(),
  objectiveType: mysqlEnum("objType", ["bo", "ao"]).notNull(),
  objectiveCode: varchar("objectiveCode", { length: 20 }),
  siteId: int("siteId").notNull(),
  siteName: varchar("siteName", { length: 255 }),
  sqdcpCategory: mysqlEnum("sqdcpCategory", ["safety", "quality", "delivery", "cost", "people"]).notNull(),
  deploymentTitle: varchar("deploymentTitle", { length: 500 }).notNull(),
  deploymentDescription: text("deploymentDescription"),
  targetMetric: varchar("targetMetric", { length: 255 }),
  targetValue: decimal("targetValue", { precision: 12, scale: 2 }),
  currentValue: decimal("currentValue", { precision: 12, scale: 2 }),
  unit: varchar("unit", { length: 50 }),
  status: mysqlEnum("deployStatus", ["not-deployed", "deployed", "active", "completed"]).default("not-deployed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DeploymentTarget = typeof deploymentTargets.$inferSelect;
export type InsertDeploymentTarget = typeof deploymentTargets.$inferInsert;

// ─── Deployment Audits ───

/**
 * Audit trail for each deployment target.
 * Rated strong/weak for both deployment effectiveness and progress.
 */
export const deploymentAudits = mysqlTable("deployment_audits", {
  id: int("id").autoincrement().primaryKey(),
  deploymentTargetId: int("deploymentTargetId").notNull().references(() => deploymentTargets.id),
  auditedById: int("auditedById"),
  auditedByName: varchar("auditedByName", { length: 255 }),
  auditDate: timestamp("auditDate").notNull(),
  deploymentRating: mysqlEnum("deploymentRating", ["strong", "weak", "not-started"]).default("not-started").notNull(),
  progressRating: mysqlEnum("progressRating", ["strong", "weak", "not-started"]).default("not-started").notNull(),
  notes: text("notes"),
  aiSuggestion: text("aiSuggestion"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeploymentAudit = typeof deploymentAudits.$inferSelect;
export type InsertDeploymentAudit = typeof deploymentAudits.$inferInsert;

// ─── Deployment Metrics ───

/**
 * Periodic metric readings linked to deployment targets.
 * Tracks both "actual" (real-time/system) and "audited" (verified) values.
 */
export const deploymentMetrics = mysqlTable("deployment_metrics", {
  id: int("id").autoincrement().primaryKey(),
  deploymentTargetId: int("deploymentTargetId").notNull().references(() => deploymentTargets.id),
  period: varchar("period", { length: 20 }).notNull(),
  periodType: mysqlEnum("periodType", ["daily", "weekly", "monthly"]).default("monthly").notNull(),
  actualValue: decimal("actualValue", { precision: 12, scale: 4 }),
  auditedValue: decimal("auditedValue", { precision: 12, scale: 4 }),
  auditedById: int("auditedById"),
  auditedByName: varchar("auditedByName", { length: 255 }),
  auditedAt: timestamp("auditedAt"),
  source: mysqlEnum("metricSource", ["manual", "sqdcp", "oee", "safety", "action"]).default("manual").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DeploymentMetric = typeof deploymentMetrics.$inferSelect;
export type InsertDeploymentMetric = typeof deploymentMetrics.$inferInsert;

// ─── Metric Push Logs ───

/**
 * Records every metric push from subdomains via the Service API.
 * Provides audit trail for integration health monitoring.
 */
export const metricPushLogs = mysqlTable("metric_push_logs", {
  id: int("id").autoincrement().primaryKey(),
  source: mysqlEnum("pushSource", ["sqdcp", "oee", "safety", "action", "manual", "api"]).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  requestBody: text("requestBody"),
  deploymentTargetId: int("deploymentTargetId").references(() => deploymentTargets.id),
  metricsCreated: int("metricsCreated").default(0).notNull(),
  status: mysqlEnum("pushStatus", ["success", "partial", "failed"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MetricPushLog = typeof metricPushLogs.$inferSelect;
export type InsertMetricPushLog = typeof metricPushLogs.$inferInsert;
