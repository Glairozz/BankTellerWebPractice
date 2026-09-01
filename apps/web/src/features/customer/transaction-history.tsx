import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const typeIcon = {
  DEPOSIT: <ArrowDownLeft className="h-4 w-4 text-emerald-400" />,
  WITHDRAWAL: <ArrowUpRight className="h-4 w-4 text-red-400" />,
  TRANSFER: <ArrowLeftRight className="h-4 w-4 text-sky-400" />,
};

const statusVariant: Record<Transaction["status"], "success" | "warning" | "destructive" | "secondary"> = {
  COMPLETED: "success",
  PENDING: "warning",
  FAILED: "destructive",
  CANCELLED: "secondary",
};

export function TransactionHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get<Transaction[]>("/transactions/history"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction history</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((t) => (
              <li key={t.id} className="flex items-center gap-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                  {typeIcon[t.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.type}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(t.createdAt)}
                    {t.reference ? ` · ${t.reference}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(t.amount, t.currency)}
                  </p>
                  <Badge variant={statusVariant[t.status]} className="mt-1">
                    {t.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
