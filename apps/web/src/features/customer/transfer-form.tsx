import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TransferForm({
  accounts,
}: {
  accounts: { id: string; accountNumber: string; balance: number; accountType: string }[];
}) {
  const qc = useQueryClient();
  const [source, setSource] = useState(accounts[0]?.accountNumber ?? "");
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/transactions/transfer", {
        sourceAccountNumber: source,
        destinationAccountNumber: dest,
        amount: parseFloat(amount),
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: (data: unknown) => {
      const r = data as { highValue?: boolean };
      toast(
        r.highValue
          ? "Transfer submitted for approval"
          : "Transfer completed",
        { variant: r.highValue ? "info" : "success" },
      );
      setDest("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err: Error) =>
      toast(err.message || "Transfer failed", { variant: "error" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary" />
          Transfer money
        </CardTitle>
        <CardDescription>
          Instant peer-to-peer transfer between accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>From account</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.accountNumber}>
                  {a.accountNumber} · {a.accountType}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dest">Destination account number</Label>
            <Input
              id="dest"
              placeholder="SB-XXXX-XXXX-XXXX"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send transfer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
