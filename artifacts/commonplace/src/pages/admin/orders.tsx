import { useState } from "react";
import { Link } from "wouter";
import { useListAdminOrders, getListAdminOrdersQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_OPTIONS = ["", "pending", "paid", "fulfilling", "shipped", "delivered", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  fulfilling: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useListAdminOrders(
    { status: status || undefined, page, limit },
    { query: { queryKey: getListAdminOrdersQueryKey({ status: status || undefined, page, limit }) } }
  );

  const orders = data?.orders || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-muted-foreground hover:text-foreground" data-testid="link-back-admin">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-display text-3xl">ORDERS</h1>
        <span className="text-muted-foreground text-sm">({total} total)</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s || "all"}
            onClick={() => { setStatus(s); setPage(1); }}
            className={cn("px-4 py-2 rounded-full border text-sm font-medium transition-all capitalize",
              status === s ? "bg-primary text-white border-primary" : "border-border hover:border-primary hover:text-primary")}
            data-testid={`filter-status-${s || "all"}`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid="table-orders">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">ID</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Items</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No orders found</td></tr>
                  ) : orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors" data-testid={`order-row-${o.id}`}>
                      <td className="px-5 py-4 font-mono-cp font-medium">#{o.id}</td>
                      <td className="px-5 py-4 text-muted-foreground">{o.guestEmail || `User #${o.userId}`}</td>
                      <td className="px-5 py-4 text-muted-foreground">{o.items?.length || 0} item(s)</td>
                      <td className="px-5 py-4 text-muted-foreground">{o.createdAt ? format(new Date(o.createdAt), "MMM d, yyyy") : "—"}</td>
                      <td className="px-5 py-4">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", STATUS_COLORS[o.status] || "bg-gray-100 text-gray-600")}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold font-mono-cp">${Number(o.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 border border-border rounded-lg text-sm disabled:opacity-40 hover:border-primary hover:text-primary transition-colors" data-testid="button-prev-page">
                    <ChevronLeft size={16} />
                  </button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border border-border rounded-lg text-sm disabled:opacity-40 hover:border-primary hover:text-primary transition-colors" data-testid="button-next-page">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
