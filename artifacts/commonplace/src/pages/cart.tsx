import { Link, useLocation } from "wouter";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, savings, serviceFee, total } = useCart();
  const [, setLocation] = useLocation();

  const { data: currentUser } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false }
  });

  function handleCheckout() {
    setLocation("/checkout");
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag size={64} className="mx-auto mb-6 text-muted-foreground/30" />
        <h1 className="font-display text-4xl mb-3">YOUR CART IS EMPTY</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added any essentials yet.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors" data-testid="button-continue-shopping">
          Start Shopping <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="font-display text-4xl mb-8" data-testid="heading-cart">YOUR CART</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex gap-4 bg-card border border-card-border rounded-xl p-4" data-testid={`cart-item-${product.id}`}>
              <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted-foreground/10 flex items-center justify-center">
                    <ShoppingBag size={24} className="text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground capitalize mb-0.5">{product.category}</div>
                <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-2" data-testid={`text-cart-item-name-${product.id}`}>{product.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono-cp" data-testid={`text-cart-item-price-${product.id}`}>${product.price.toFixed(2)}</span>
                  {product.wasPrice && product.wasPrice > product.price && (
                    <span className="text-xs text-muted-foreground line-through">${product.wasPrice.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <button onClick={() => removeItem(product.id)} className="text-muted-foreground hover:text-destructive transition-colors" data-testid={`button-remove-${product.id}`}>
                  <Trash2 size={16} />
                </button>
                <div className="flex items-center gap-2 border border-border rounded-lg overflow-hidden">
                  <button onClick={() => updateQuantity(product.id, quantity - 1)} className="px-2 h-8 hover:bg-muted transition-colors" data-testid={`button-decrease-${product.id}`}><Minus size={14} /></button>
                  <span className="px-2 text-sm font-semibold font-mono-cp" data-testid={`text-quantity-${product.id}`}>{quantity}</span>
                  <button onClick={() => updateQuantity(product.id, quantity + 1)} className="px-2 h-8 hover:bg-muted transition-colors" data-testid={`button-increase-${product.id}`}><Plus size={14} /></button>
                </div>
                <span className="text-sm font-bold" data-testid={`text-item-total-${product.id}`}>${(product.price * quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-card-border rounded-xl p-6 sticky top-24" data-testid="cart-summary">
            <h2 className="font-semibold text-lg mb-5">Order Summary</h2>

            <div className="space-y-3 text-sm mb-5">
              <div className="flex justify-between" data-testid="text-subtotal">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono-cp">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between" data-testid="text-service-fee">
                <div>
                  <span className="text-muted-foreground">Service Fee </span>
                  <span className="text-xs text-muted-foreground/60">(5%)</span>
                </div>
                <span className="font-mono-cp">${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="font-medium text-emerald-600">Calculated at checkout</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between savings-badge px-3 py-2 rounded-lg" data-testid="text-savings">
                  <div className="flex items-center gap-1">
                    <Tag size={13} />
                    <span className="font-semibold">You're saving</span>
                  </div>
                  <span className="font-bold font-mono-cp">${savings.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-bold text-base" data-testid="text-total">
                <span>Total</span>
                <span className="font-mono-cp">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              data-testid="button-checkout"
            >
              Proceed to Checkout <ArrowRight size={16} />
            </button>

            {!currentUser && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                <Link href="/auth/login" className="text-primary hover:underline">Sign in</Link> to track your order and earn rewards, or check out as a guest.
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground mt-3">
              Secure checkout. No hidden fees beyond the 5% service fee.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
