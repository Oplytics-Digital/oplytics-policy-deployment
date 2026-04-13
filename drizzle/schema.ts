import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

// ─── Metric Push Logs ───

/**
 * Records every metric push from subdomains via the Service API.
 * Provides audit trail for integration health monitoring.
 *
 * Note: deploymentTargetId is a plain int (FK to deployment_targets was removed
 * when deployment_targets was dropped — the column is retained for historical data).
 */
export const metricPushLogs = mysqlTable("metric_push_logs", {
  id: int("id").autoincrement().primaryKey(),
  source: mysqlEnum("pushSource", ["sqdcp", "oee", "safety", "action", "manual", "api"]).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  requestBody: text("requestBody"),
  deploymentTargetId: int("deploymentTargetId"),
  metricsCreated: int("metricsCreated").default(0).notNull(),
  status: mysqlEnum("pushStatus", ["success", "partial", "failed"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MetricPushLog = typeof metricPushLogs.$inferSelect;
export type InsertMetricPushLog = typeof metricPushLogs.$inferInsert;
