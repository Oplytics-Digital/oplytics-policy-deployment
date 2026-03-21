/**
 * Portal Service API client.
 * Consumes hierarchy and user data from portal.oplytics.digital
 * instead of storing it locally. Same pattern as SQDCP and OEE Manager.
 */
import axios from "axios";
import { ENV } from "./_core/env";
import { AXIOS_TIMEOUT_MS } from "@shared/const";

// ─── Types ───

export interface PortalUser {
  id: number;
  openId: string;
  name: string;
  email: string | null;
  role: string;
  companyId: number | null;
  companyName: string | null;
}

export interface PortalEnterprise {
  id: number;
  name: string;
  slug: string;
}

export interface PortalSite {
  id: number;
  name: string;
  enterpriseId: number;
  parentId: number | null;
}

export interface HierarchyNode {
  id: number;
  name: string;
  type: "enterprise" | "business_unit" | "site";
  parentId: number | null;
  children: HierarchyNode[];
}

// ─── HTTP Client ───

function getPortalClient() {
  const baseURL = ENV.portalUrl;
  if (!baseURL) {
    console.warn("[PortalClient] PORTAL_URL is not configured");
  }
  return axios.create({
    baseURL,
    timeout: AXIOS_TIMEOUT_MS,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// ─── User Lookups ───

/**
 * Get a portal user by their openId.
 * Used during SSO authentication to enrich local user records.
 */
export async function getPortalUserByOpenId(openId: string): Promise<PortalUser | null> {
  try {
    const client = getPortalClient();
    const { data } = await client.get(`/api/service/users/by-open-id/${openId}`);
    return data as PortalUser;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    console.warn(`[PortalClient] Failed to fetch user by openId ${openId}:`, error?.message);
    return null;
  }
}

/**
 * Get all users for an enterprise.
 * Used to populate team member lists in the policy deployment UI.
 */
export async function getEnterpriseUsers(enterpriseId: number): Promise<PortalUser[]> {
  try {
    const client = getPortalClient();
    const { data } = await client.get(`/api/service/enterprises/${enterpriseId}/users`);
    return (data as PortalUser[]) || [];
  } catch (error: any) {
    console.warn(`[PortalClient] Failed to fetch users for enterprise ${enterpriseId}:`, error?.message);
    return [];
  }
}

// ─── Hierarchy ───

/**
 * Get the full organisation hierarchy for an enterprise.
 * Returns a tree of enterprise → business units → sites.
 */
export async function getEnterpriseHierarchy(enterpriseId: number): Promise<HierarchyNode[]> {
  try {
    const client = getPortalClient();
    const { data } = await client.get(`/api/service/enterprises/${enterpriseId}/hierarchy`);
    return (data as HierarchyNode[]) || [];
  } catch (error: any) {
    console.warn(`[PortalClient] Failed to fetch hierarchy for enterprise ${enterpriseId}:`, error?.message);
    return [];
  }
}

/**
 * Get all sites for an enterprise (flat list).
 */
export async function getEnterpriseSites(enterpriseId: number): Promise<PortalSite[]> {
  try {
    const client = getPortalClient();
    const { data } = await client.get(`/api/service/enterprises/${enterpriseId}/sites`);
    return (data as PortalSite[]) || [];
  } catch (error: any) {
    console.warn(`[PortalClient] Failed to fetch sites for enterprise ${enterpriseId}:`, error?.message);
    return [];
  }
}
