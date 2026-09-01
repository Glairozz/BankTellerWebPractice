import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { SearchResults } from "@/types";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TellerActions } from "./teller-actions";

export function AccountSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true);
    try {
      const res = await api.get<SearchResults>(
        `/accounts/search?q=${encodeURIComponent(q)}`,
      );
      setResults(res);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Search failed", {
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Account lookup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Account number or customer ID (e.g. SB-…, CUST-…)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button onClick={search} disabled={busy || !q.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-4 animate-fade-in">
          {results.byCustomer.map((customer) => (
            <Card key={customer.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {customer.fullName}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {customer.customerId}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.accounts.map((account) => (
                  <TellerActions key={account.id} account={account} />
                ))}
              </CardContent>
            </Card>
          ))}

          {results.byAccountNumber.length === 0 &&
            results.byCustomer.length === 0 && (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  No accounts found.
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
