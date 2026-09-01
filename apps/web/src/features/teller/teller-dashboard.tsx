import { ShieldCheck, Search, ClipboardCheck, PlusCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSearch } from "./account-search";
import { ApprovalsPanel } from "./approvals-panel";
import { OpenAccount } from "./open-account";

export function TellerDashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Teller Workstation
        </h1>
        <p className="text-sm text-muted-foreground">
          Search accounts, handle cash operations, and review high-value
          transfers — {user?.role}.
        </p>
      </div>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Search
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Approvals
          </TabsTrigger>
          <TabsTrigger value="open" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Open account
          </TabsTrigger>
        </TabsList>
        <TabsContent value="search">
          <AccountSearch />
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalsPanel />
        </TabsContent>
        <TabsContent value="open">
          <OpenAccount />
        </TabsContent>
      </Tabs>
    </div>
  );
}
