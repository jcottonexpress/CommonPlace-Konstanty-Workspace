import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Package, RefreshCw, User, ChevronRight, SkipForward, X, Edit, Calendar } from "lucide-react";
import {
  useGetCurrentUser, getGetCurrentUserQueryKey,
  useListOrders, getListOrdersQueryKey,
  useListSubscriptions, getListSubscriptionsQueryKey,
  useUpdateSubscription, useCancelSubscription,
  useLogoutUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { removeAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fulfilling: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const INTERVAL_LABELS: Record<string, string> = {
  "2weeks": "Every 2 Weeks",
  "1month": "Monthly",
  "2months": "Every 2 Months",
  "3months": "Every 3 Months",
};

type TabType = "orders" | "subscriptions";

export default function AccountPage() {
  const [tab, setTab] = useState<TabType>("orders");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: userLoading } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false }
  });
  const { data: ordersData, isLoading: ordersLoading } = useListOrders(
    { page: 1, limit: 20 },
    { query: { queryKey: getListOrdersQueryKey({ page: 1, limit: 20 }) } }
  );
  const { data: subscriptions, isLoading: subsLoading } = useListSubscriptions({
    query: { queryKey: getListSubscriptionsQueryKey() }
  });

  const updateSub = useUpdateSubscription();
  const cancelSub = useCancelSubscription();
  const logoutUser = useLogoutUser();

  if (userLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  }

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <User size={48} className="mx-auto mb-4 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold mb-2">Sign in to your account</h1>
        <p className="text-muted-foreground mb-6">View your orders and manage auto-refill subscriptions</p>
        <Link href="/auth/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          Sign In <ChevronRight size={16} />
        </Link>
      </div>
    );
  }

  function handleLogout() {
    logoutUser.mutate(undefined, {
      onSettled: () => {
        removeAuthToken();
        queryClient.clear();
        setLocation("/");
      },
    });
  }

  function handleSkipDelivery(id: number) {
    const sub = (subscriptions as any[])?.find((s: any) => s.id === id);
    if (!sub) return;
    updateSub.mutate({ id, data: { status: "paused" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
        toast({ title: "Delivery paused", description: "Re-activate to resume deliveries" });
      },
    });
  }

  function handleCancelSub(id: number) {
    cancelSub.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
        toast({ title: "Subscription cancelled" });
      },
    });
  }

  const orders = ordersData?.orders || [];
  const subs = (subscriptions as any[]) || [];
  const activeSubs = subs.filter((s: any) => s.status === "active");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{currentUser.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-user-name">{currentUser.name}</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-user-email">{currentUser.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-destructive transition-colors" data-testid="button-logout">
          Sign Out
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Orders", value: ordersData?.total || 0 },
          { label: "Active Refills", value: activeSubs.length },
          { label: "Total Saved", value: `$${orders.reduce((s: number, o: any) => s + (o.savings || 0), 0).toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-card-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold font-mono-cp text-primary mb-1" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 max-w-xs">
        {[
          { id: "orders" as const, label: "Orders", icon: Package },
          { id: "subscriptions" as const, label: "Auto-Refill", icon: RefreshCw },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            data-testid={`tab-${id}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === "orders" && (
        <div data-testid="section-orders">
          {ordersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No orders yet</p>
              <Link href="/" className="mt-4 inline-block text-primary hover:underline text-sm">Start shopping</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => (
                <div key={order.id} className="bg-card border border-card-border rounded-xl p-5" data-testid={`order-${order.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">Order #{order.id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", STATUS_COLORS[order.status] || STATUS_COLORS.pending)}>
                        {order.status}
                      </span>
                      <span className="font-bold font-mono-cp">${Number(order.total).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(order.items as any[]).slice(0, 3).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-xs">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">×{item.quantity}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="bg-muted/50 rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
                        +{order.items.length - 3} more
                      </div>
                    )}
                  </div>
                  {order.savings > 0 && (
                    <p className="text-xs text-emerald-600 mt-2">Saved ${Number(order.savings).toFixed(2)} vs retail</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscriptions tab */}
      {tab === "subscriptions" && (
        <div data-testid="section-subscriptions">
          {subsLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : subs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <RefreshCw size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No auto-refill subscriptions yet</p>
              <p className="text-sm mt-1">Set up auto-refill on any product page to save more and never run out</p>
              <Link href="/" className="mt-4 inline-block text-primary hover:underline text-sm">Browse products</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {subs.map((sub: any) => (
                <div key={sub.id} className="bg-card border border-card-border rounded-xl p-5" data-testid={`subscription-${sub.id}`}>
                  <div className="flex items-start gap-4">
                    {sub.productImageUrl && (
                      <img src={sub.productImageUrl} alt={sub.productName} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-1">{sub.productName}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {INTERVAL_LABELS[sub.interval] || sub.interval} · Qty {sub.quantity} · {sub.mode === "auto" ? "Auto-ship" : "Confirm first"}
                          </p>
                        </div>
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0", STATUS_COLORS[sub.status] || STATUS_COLORS.active)}>
                          {sub.status}
                        </span>
                      </div>

                      {sub.nextDeliveryDate && sub.status === "active" && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                          <Calendar size={12} />
                          Next delivery: {format(new Date(sub.nextDeliveryDate), "MMM d, yyyy")}
                        </div>
                      )}

                      {sub.status === "active" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSkipDelivery(sub.id)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
                            data-testid={`button-skip-${sub.id}`}
                          >
                            <SkipForward size={12} /> Skip Next
                          </button>
                          <button
                            onClick={() => handleCancelSub(sub.id)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg hover:border-destructive hover:text-destructive transition-colors"
                            data-testid={`button-cancel-sub-${sub.id}`}
                          >
                            <X size={12} /> Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
