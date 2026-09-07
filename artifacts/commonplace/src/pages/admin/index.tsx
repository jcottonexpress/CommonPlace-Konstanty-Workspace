import { Link } from "wouter";
import { TrendingUp, Package, Users, ShoppingCart, DollarSign, Calendar } from "lucide-react";
import { useGetAdminStats, getGetAdminStatsQueryKey, useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminDashboardPage() {
  const { data: currentUser } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const { data: stats, isLoading } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-3">Admin access required</h1>
        <p className="text-muted-foreground mb-6">You don't have permission to view this page.</p>
        <Link href="/" className="text-primary hover:underline">Back to shop</Link>
      </div>
    );
  }

  const kpis = [
    { icon: ShoppingCart, label: "Total Orders", value: stats?.totalOrders || 0, sub: `${stats?.ordersToday || 0} today` },
    { icon: DollarSign, label: "Total Revenue", value: `$${Number(stats?.totalRevenue || 0).toFixed(2)}`, sub: `$${Number(stats?.revenueToday || 0).toFixed(2)} today` },
    { icon: Users, label: "Users", value: stats?.totalUsers || 0, sub: "registered accounts" },
    { icon: TrendingUp, label: "Active Subs", value: stats?.activeSubscriptions || 0, sub: "auto-refill" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl">ADMIN DASHBOARD</h1>
          <p className="text-muted-foreground text-sm mt-1">CommonPlace Operations</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/orders" className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:border-primary hover:text-primary transition-colors" data-testid="link-admin-orders">
            Orders
          </Link>
          <Link href="/admin/products" className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:border-primary hover:text-primary transition-colors" data-testid="link-admin-products">
            Products
          </Link>
        </div>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="bg-card border border-card-border rounded-xl p-5" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon size={16} className="text-primary" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono-cp mb-1">{value}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid="section-recent-orders">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(stats?.recentOrders || []).length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No orders yet</td></tr>
                ) : (
                  (stats?.recentOrders || []).map((order: any) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-order-${order.id}`}>
                      <td className="px-6 py-4 font-mono-cp font-medium">#{order.id}</td>
                      <td className="px-6 py-4 text-muted-foreground">{order.guestEmail || `User #${order.userId}`}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {order.createdAt ? format(new Date(order.createdAt), "MMM d, HH:mm") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", STATUS_COLORS[order.status] || STATUS_COLORS.pending)}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold font-mono-cp">${Number(order.total).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
