import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { PendingApproval } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ApprovalsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => api.get<PendingApproval[]>("/transactions/approvals/pending"),
  });

  const decide = useMutation({
    mutationFn: ({
      approvalId,
      action,
    }: {
      approvalId: string;
      action: "APPROVE" | "REJECT";
    }) => api.post(`/transactions/approvals/${approvalId}/decide`, { action }),
    onSuccess: () => {
      toast("Request reviewed", { variant: "success" });
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (err: Error) => toast(err.message, { variant: "error" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>High-value transfer approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing pending.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">
                      {formatCurrency(a.requestedAmount)}
                    </p>
                    <Badge variant="warning">{a.transaction.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.transaction.sourceAccount?.accountNumber} →{" "}
                    {a.transaction.destinationAccount?.accountNumber}
                    {a.transaction.initiatedBy
                      ? ` · by ${a.transaction.initiatedBy.fullName ?? "customer"}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({ approvalId: a.id, action: "APPROVE" })
                    }
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({ approvalId: a.id, action: "REJECT" })
                    }
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
