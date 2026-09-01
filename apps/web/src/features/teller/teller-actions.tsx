import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Account } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function TellerActions({ account }: { account: Account }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");

  const mutation = useMutation({
    mutationFn: (action: "deposit" | "withdraw") =>
      api.post(`/transactions/${action}`, {
        accountNumber: account.accountNumber,
        amount: parseFloat(amount),
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: (_data, action) => {
      toast(
        action === "deposit"
          ? `Deposited ${formatCurrency(Number(amount))}`
          : `Withdrew ${formatCurrency(Number(amount))}`,
        { variant: "success" },
      );
      setAmount("");
      qc.invalidateQueries({ queryKey: ["accounts"] });
      window.location.reload();
    },
    onError: (err: Error) => toast(err.message, { variant: "error" }),
  });

  return (
    <Card className="border-border/50">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-semibold">{account.accountNumber}</p>
              <Badge variant={account.status === "ACTIVE" ? "success" : "destructive"}>
                {account.status}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {account.accountType} · {formatCurrency(account.balance, account.currency)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="w-32"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              size="sm"
              variant="success"
              disabled={mutation.isPending || !amount}
              onClick={() => mutation.mutate("deposit")}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              Deposit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={mutation.isPending || !amount}
              onClick={() => mutation.mutate("withdraw")}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
              Withdraw
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
