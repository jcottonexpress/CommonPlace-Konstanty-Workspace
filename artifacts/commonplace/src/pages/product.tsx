import { useState } from "react";
import { useRoute, Link } from "wouter";
import { ShoppingCart, Check, RefreshCw, ArrowLeft, Star, Shield, Truck, ChevronRight } from "lucide-react";
import { useGetProduct, useGetSimilarProducts, useCreateSubscription, getGetProductQueryKey, getGetSimilarProductsQueryKey, CreateSubscriptionBodyInterval } from "@workspace/api-client-react";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import ProductCard from "@/components/ProductCard";
import { cn } from "@/lib/utils";

const INTERVALS = [
  { value: "2weeks", label: "Every 2 Weeks" },
  { value: "1month", label: "Monthly" },
  { value: "2months", label: "Every 2 Months" },
  { value: "3months", label: "Every 3 Months" },
];

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showRefill, setShowRefill] = useState(false);
  const [refillInterval, setRefillInterval] = useState("1month");
  const [refillMode, setRefillMode] = useState<"auto" | "confirm">("confirm");
  const [refillSuccess, setRefillSuccess] = useState(false);

  const { addItem } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id) }
  });
  const { data: similar } = useGetSimilarProducts(id, {
    query: { enabled: !!id, queryKey: getGetSimilarProductsQueryKey(id) }
  });
  const { data: currentUser } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false }
  });

  const createSubscription = useCreateSubscription();

  function handleAddToCart() {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      wasPrice: product.wasPrice,
      imageUrl: product.imageUrl,
      category: product.category,
      inStock: product.inStock,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    toast({ title: "Added to cart", description: `${qty}x ${product.name}` });
  }

  function handleSetupRefill() {
    if (!currentUser) {
      toast({ title: "Sign in required", description: "Please sign in to set up auto-refill", variant: "destructive" });
      return;
    }
    createSubscription.mutate({ data: { productId: id, quantity: qty, interval: refillInterval as CreateSubscriptionBodyInterval, mode: refillMode } }, {
      onSuccess: () => {
        setRefillSuccess(true);
        toast({ title: "Auto-refill set up!", description: `${product?.name} will be delivered on your schedule.` });
      },
      onError: () => {
        toast({ title: "Error", description: "Could not set up auto-refill. Try again.", variant: "destructive" });
      },
    });
  }

  const discount = product?.wasPrice && product.wasPrice > product.price
    ? Math.round((1 - product.price / product.wasPrice) * 100)
    : null;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-muted rounded-2xl animate-pulse" />
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-6 bg-muted rounded-lg animate-pulse" style={{ width: `${[80,60,40,90,50,70][i]}%` }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-xl text-muted-foreground">Product not found.</p>
        <Link href="/" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"><ArrowLeft size={16} /> Back to shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary">Shop</Link>
        <ChevronRight size={14} />
        <Link href={`/?category=${product.category}`} className="hover:text-primary capitalize">{product.category}</Link>
        <ChevronRight size={14} />
        <span className="text-foreground line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 mb-16">
        {/* Image */}
        <div className="relative">
          <div className="aspect-square bg-muted rounded-2xl overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                <ShoppingCart size={64} />
              </div>
            )}
          </div>
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.badge && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary text-white">{product.badge}</span>
            )}
            {discount && !product.badge && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-600 text-white">-{discount}% OFF</span>
            )}
          </div>
          {product.isSponsored && (
            <span className="absolute top-3 right-3 text-xs text-muted-foreground bg-background/90 px-2 py-1 rounded">Sponsored</span>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1 capitalize">{product.category}</div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-snug" data-testid="text-product-name">{product.name}</h1>

          {product.description && (
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">{product.description}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-2" data-testid="section-pricing">
            <span className="text-4xl font-bold font-mono-cp" data-testid="text-price">${product.price.toFixed(2)}</span>
            {product.wasPrice && product.wasPrice > product.price && (
              <span className="text-lg text-muted-foreground line-through" data-testid="text-was-price">${product.wasPrice.toFixed(2)}</span>
            )}
          </div>

          {product.savings && (
            <div className="inline-flex items-center gap-2 savings-badge px-3 py-1 rounded-full text-sm font-semibold mb-4" data-testid="text-savings">
              <Star size={14} />
              {product.savings}
            </div>
          )}

          {product.bulkPrice && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 bg-muted/60 rounded-lg p-3">
              <RefreshCw size={14} className="text-primary" />
              <span>Auto-refill price: <span className="font-bold text-foreground">${product.bulkPrice.toFixed(2)}</span> (save more!)</span>
            </div>
          )}

          {/* Quantity + add to cart */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 h-11 text-lg hover:bg-muted transition-colors" data-testid="button-qty-decrease">-</button>
              <span className="px-4 font-semibold text-sm font-mono-cp" data-testid="text-quantity">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="px-3 h-11 text-lg hover:bg-muted transition-colors" data-testid="button-qty-increase">+</button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.inStock === false}
              className={cn(
                "flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                added ? "bg-emerald-600 text-white" : "bg-primary text-white hover:bg-primary/90",
                product.inStock === false && "opacity-50 cursor-not-allowed"
              )}
              data-testid="button-add-to-cart"
            >
              {added ? <><Check size={16} /> Added!</> : <><ShoppingCart size={16} /> Add to Cart</>}
            </button>
          </div>

          {/* Auto-refill section */}
          {!refillSuccess ? (
            <div className="border border-border rounded-xl overflow-hidden mb-5">
              <button
                onClick={() => setShowRefill(r => !r)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-semibold"
                data-testid="button-toggle-refill"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw size={15} className="text-primary" />
                  Set up Auto-Refill
                  {product.bulkPrice && <span className="text-xs font-normal text-muted-foreground ml-1">Save more with subscription pricing</span>}
                </div>
                <ChevronRight size={16} className={cn("transition-transform", showRefill && "rotate-90")} />
              </button>

              {showRefill && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Delivery Frequency</label>
                    <div className="grid grid-cols-2 gap-2">
                      {INTERVALS.map(i => (
                        <button
                          key={i.value}
                          onClick={() => setRefillInterval(i.value)}
                          className={cn(
                            "text-sm py-2 px-3 rounded-lg border text-left transition-all",
                            refillInterval === i.value ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:border-primary/50"
                          )}
                          data-testid={`button-interval-${i.value}`}
                        >
                          {i.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Delivery Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "auto", label: "Auto-Ship", desc: "Ships automatically" },
                        { value: "confirm", label: "Confirm First", desc: "You approve each order" },
                      ].map(m => (
                        <button
                          key={m.value}
                          onClick={() => setRefillMode(m.value as "auto" | "confirm")}
                          className={cn(
                            "text-sm py-2 px-3 rounded-lg border text-left transition-all",
                            refillMode === m.value ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:border-primary/50"
                          )}
                          data-testid={`button-mode-${m.value}`}
                        >
                          <div className="font-medium">{m.label}</div>
                          <div className="text-xs text-muted-foreground font-normal">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSetupRefill}
                    disabled={createSubscription.isPending}
                    className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
                    data-testid="button-confirm-refill"
                  >
                    {createSubscription.isPending ? "Setting up..." : "Confirm Auto-Refill"}
                  </button>

                  {!currentUser && (
                    <p className="text-xs text-center text-muted-foreground">
                      <Link href="/auth/login" className="text-primary hover:underline">Sign in</Link> to save auto-refill preferences
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-5">
              <Check className="text-emerald-600 shrink-0" size={20} />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Auto-Refill Confirmed</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-500">Manage in your <Link href="/account" className="underline">account</Link></p>
              </div>
            </div>
          )}

          {/* Trust signals */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1"><Shield size={18} className="text-primary" /><span>Secure checkout</span></div>
            <div className="flex flex-col items-center gap-1"><Truck size={18} className="text-primary" /><span>Fast shipping</span></div>
            <div className="flex flex-col items-center gap-1"><RefreshCw size={18} className="text-primary" /><span>Easy returns</span></div>
          </div>
        </div>
      </div>

      {/* Similar alternatives */}
      {similar && similar.length > 0 && (
        <section data-testid="section-similar">
          <h2 className="font-display text-2xl mb-4">SIMILAR ALTERNATIVES</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similar.slice(0, 4).map((alt, i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-4 text-center hover:border-primary transition-colors">
                {alt.imageUrl && <img src={alt.imageUrl} alt={alt.name} className="w-16 h-16 object-cover mx-auto rounded-lg mb-2" />}
                <p className="text-xs font-semibold text-muted-foreground mb-1">{alt.brand}</p>
                <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">{alt.name}</p>
                <p className="font-bold font-mono-cp">${alt.price.toFixed(2)}</p>
                {alt.savings && <p className="text-xs text-emerald-600 mt-1">{alt.savings}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
