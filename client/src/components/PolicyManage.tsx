/*
 * PolicyManage — CRUD Admin UI for Policy Deployment
 * Temporarily disabled: backend CRUD procedures moved to Portal API.
 * Will be restored when Portal exposes write endpoints.
 */
import { Construction } from 'lucide-react';

export default function PolicyManage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
      <Construction className="h-12 w-12" />
      <h2 className="text-lg font-semibold text-foreground">Manage Policy</h2>
      <p className="text-sm max-w-md text-center">
        Policy data management has moved to the Portal. CRUD operations will be
        available here once the Portal exposes write endpoints.
      </p>
    </div>
  );
}
