import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PlusCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OpenAccount() {
  const [ownerId, setOwnerId] = useState("");
  const [accountType, setAccountType] = useState<"SAVINGS" | "CHECKING">("CHECKING");
  const [currency, setCurrency] = useState("USD");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/accounts", { ownerId, accountType, currency }),
    onSuccess: () => {
      toast("Account opened successfully", { variant: "success" });
      setOwnerId("");
    },
    onError: (err: Error) => toast(err.message, { variant: "error" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4 text-primary" />
          Open a new account
        </CardTitle>
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
            <Label htmlFor="ownerId">Customer user ID</Label>
            <Input
              id="ownerId"
              placeholder="cuid of the customer"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Account type</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as "SAVINGS" | "CHECKING")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECKING">Checking</SelectItem>
                  <SelectItem value="SAVINGS">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="PHP">PHP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending || !ownerId}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Open account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
