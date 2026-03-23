"use server"

import { requireTenantAccess } from "@/lib/auth-guard";
import { forceSyncTenant } from "@/app/[tenant]/dashboard/actions";

/**
 * Server action to trigger a sync from Meta API for a specific tenant.
 * Delegates to the shared forceSyncTenant action with tenant access verification.
 */
export async function syncCampaignsAction(tenantId: string, slug: string) {
  await requireTenantAccess(tenantId);
  return forceSyncTenant(tenantId, slug);
}
