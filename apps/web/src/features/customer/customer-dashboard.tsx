import { useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2, Wallet } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import type { Account } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferForm } from "./transfer-form";
import { TransactionHistory } from "./transaction-history";

export function CustomerDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<Account[]>("/auth/me").then((u) => (u as { accounts?: Account[] }).accounts ?? []),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = accounts?.reduce((s, a) => s + (Number(a.balance) || 0), 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.fullName?.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Here's your account overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/20 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" /> Total balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(total)}</p>
          </CardContent>
        </Card>

        {accounts?.map((account) => (
          <Card key={account.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {account.accountType} account
                </span>
                <Badge variant={account.status === "ACTIVE" ? "success" : "destructive"}>
                  {account.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{formatCurrency(account.balance, account.currency)}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{account.accountNumber}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {accounts && accounts.length > 0 && (
          <TransferForm
            accounts={accounts.map((a) => ({
              id: a.id,
              accountNumber: a.accountNumber,
              balance: Number(a.balance),
              accountType: a.accountType,
            }))}
          />
        )}
        <TransactionHistory />
      </div>
    </div>
  );
}
