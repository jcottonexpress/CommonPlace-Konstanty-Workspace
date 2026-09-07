import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { CheckCircle, Package, ArrowRight, XCircle, Loader2, Clock } from "lucide-react";
import { useCart } from "@/lib/cart-context";

type VerifyState = "loading" | "paid" | "pending" | "invalid";

export default function CheckoutSuccessPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const orderId = params.get("order");
  const { clearCart } = useCart();

  const [state, setState] = useState<VerifyState>(orderId ? "loading" : "invalid");

  useEffect(() => {
    if (!orderId) { setState("invalid"); return; }
    const id = parseInt(orderId, 10);
    if (isNaN(id) || id <= 0) { setState("invalid"); return; }

    fetch(`/api/orders/${id}`)
      .then(r => {
        if (!r.ok) { setState("invalid"); return; }
        return r.json();
      })
      .then(order => {
        if (!order) return;
        if (order.status === "paid") {
          clearCart();
          setState("paid");
        } else {
          setState("pending");
        }
      })
      .catch(() => setState("invalid"));
  }, [orderId]);

  if (state === "loading") {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <Loader2 className="animate-spin mx-auto mb-4 text-muted-foreground" size={40} />
        <p className="text-muted-foreground">Verifying your order…</p>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="text-red-600" size={40} />
        </div>
        <h1 className="font-display text-3xl mb-3 text-foreground">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't verify this order. Please check your account for your order history.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            Shop <ArrowRight size={16} />
          </Link>
          <Link href="/account" className="px-6 py-3 border border-border rounded-xl font-semibold hover:border-primary hover:text-primary transition-colors">
            View Orders
          </Link>
        </div>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="text-amber-600" size={40} />
        </div>
        <h1 className="font-display text-4xl mb-3 text-foreground" data-testid="heading-pending">ORDER RECEIVED</h1>
        <p className="text-muted-foreground mb-2 text-lg">Your order is awaiting payment confirmation.</p>
        {orderId && (
          <p className="text-sm text-muted-foreground mb-8" data-testid="text-order-id">
            Order #{orderId}
          </p>
        )}
        <div className="bg-card border border-card-border rounded-2xl p-6 mb-8 text-left">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-amber-500" size={20} />
            <h2 className="font-semibold">Payment pending</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Your order has been created but payment has not yet been confirmed. It will not be processed or shipped until payment is successfully verified. Once payment is confirmed, your order will appear in your account order history.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2" data-testid="button-continue-shopping">
            Keep Shopping <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="text-emerald-600" size={40} />
      </div>
      <h1 className="font-display text-4xl mb-3 text-foreground" data-testid="heading-success">ORDER PLACED!</h1>
      <p className="text-muted-foreground mb-2 text-lg">Thank you for shopping with CommonPlace.</p>
      {orderId && (
        <p className="text-sm text-muted-foreground mb-8" data-testid="text-order-id">
          Order #{orderId}
        </p>
      )}

      <div className="bg-card border border-card-border rounded-2xl p-6 mb-8 text-left">
        <div className="flex items-center gap-3 mb-4">
          <Package className="text-primary" size={20} />
          <h2 className="font-semibold">What happens next?</h2>
        </div>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-bold text-primary font-mono-cp">01</span>
            <span>You'll receive a confirmation email with your order details</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary font-mono-cp">02</span>
            <span>We'll process your group-buy order and find the best pricing</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary font-mono-cp">03</span>
            <span>Your essentials ship directly to your door</span>
          </li>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2" data-testid="button-continue-shopping">
          Keep Shopping <ArrowRight size={16} />
        </Link>
        <Link href="/account" className="px-6 py-3 border border-border rounded-xl font-semibold hover:border-primary hover:text-primary transition-colors" data-testid="button-view-orders">
          View Orders
        </Link>
      </div>
    </div>
  );
}
