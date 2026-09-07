import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Lock, CreditCard, Truck, ShoppingBag, Tag, ShieldCheck } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useCreateOrder, useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export default function CheckoutPage() {
  const { items, subtotal, savings, serviceFee, total, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: currentUser } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false }
  });
  const createOrder = useCreateOrder();

  const [fullName, setFullName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag size={64} className="mx-auto mb-6 text-muted-foreground/30" />
        <h1 className="font-display text-4xl mb-3">YOUR CART IS EMPTY</h1>
        <p className="text-muted-foreground mb-8">Add some essentials before checking out.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors" data-testid="button-continue-shopping">
          Start Shopping <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Required";
    if (!currentUser && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Valid email required";
    if (!line1.trim()) e.line1 = "Required";
    if (!city.trim()) e.city = "Required";
    if (!state) e.state = "Required";
    if (!/^\d{5}(-\d{4})?$/.test(zip)) e.zip = "Valid ZIP required";
    if (!/^[\d\s]{13,19}$/.test(cardNumber.replace(/\s/g, ""))) e.cardNumber = "Valid card number required";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) e.cardExpiry = "MM/YY";
    if (!/^\d{3,4}$/.test(cardCvc)) e.cardCvc = "3–4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      toast({ title: "Please fix the errors below", variant: "destructive" });
      return;
    }
    createOrder.mutate({
      data: {
        items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        guestEmail: currentUser ? undefined : email,
        shippingAddress: {
          fullName: fullName.trim(),
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state,
          zip: zip.trim(),
          phone: phone.trim() || undefined,
        },
      }
    }, {
      onSuccess: (data) => {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          setLocation(`/checkout/success?order=${data.orderId}`);
        }
      },
      onError: () => {
        toast({ title: "Checkout failed", description: "Please try again.", variant: "destructive" });
      },
    });
  }

  function formatCardNumber(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  }
  function formatExpiry(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }

  const inputCls = "w-full h-11 px-3 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-card";
  const errCls = "text-xs text-destructive mt-1";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4" data-testid="link-back-to-cart">
        <ArrowLeft size={14} /> Back to cart
      </Link>
      <h1 className="font-display text-4xl mb-8" data-testid="heading-checkout">CHECKOUT</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8" data-testid="form-checkout">
        {/* Left: forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <section className="bg-card border border-card-border rounded-xl p-6" data-testid="section-contact">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
              Contact Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} placeholder="Jane Smith" data-testid="input-fullname" />
                {errors.fullName && <p className={errCls}>{errors.fullName}</p>}
              </div>
              {!currentUser && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" data-testid="input-email" />
                  {errors.email && <p className={errCls}>{errors.email}</p>}
                </div>
              )}
              <div className={currentUser ? "" : "sm:col-span-2"}>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Phone <span className="text-muted-foreground/50 normal-case">(optional)</span></label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="(555) 123-4567" data-testid="input-phone" />
              </div>
            </div>
            {!currentUser && (
              <p className="text-xs text-muted-foreground mt-3">
                Want to track orders and earn rewards?{" "}
                <Link href="/auth/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            )}
          </section>

          {/* Shipping */}
          <section className="bg-card border border-card-border rounded-xl p-6" data-testid="section-shipping">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
              <Truck size={18} className="text-primary" /> Shipping Address
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Address Line 1</label>
                <input value={line1} onChange={e => setLine1(e.target.value)} className={inputCls} placeholder="123 Main St" data-testid="input-line1" />
                {errors.line1 && <p className={errCls}>{errors.line1}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Address Line 2 <span className="text-muted-foreground/50 normal-case">(optional)</span></label>
                <input value={line2} onChange={e => setLine2(e.target.value)} className={inputCls} placeholder="Apt, suite, etc" data-testid="input-line2" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">City</label>
                  <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="Brooklyn" data-testid="input-city" />
                  {errors.city && <p className={errCls}>{errors.city}</p>}
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">State</label>
                  <select value={state} onChange={e => setState(e.target.value)} className={inputCls} data-testid="select-state">
                    <option value="">—</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <p className={errCls}>{errors.state}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">ZIP</label>
                  <input value={zip} onChange={e => setZip(e.target.value)} className={inputCls} placeholder="11201" maxLength={10} data-testid="input-zip" />
                  {errors.zip && <p className={errCls}>{errors.zip}</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="bg-card border border-card-border rounded-xl p-6" data-testid="section-payment">
            <h2 className="font-semibold text-lg mb-1 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
              <CreditCard size={18} className="text-primary" /> Payment
            </h2>
            <p className="text-xs text-muted-foreground mb-4 ml-8 flex items-center gap-1">
              <Lock size={11} /> Test mode — no real charges. Use any 16-digit number.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Card Number</label>
                <input
                  value={cardNumber}
                  onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                  className={inputCls + " font-mono-cp"}
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  data-testid="input-card-number"
                />
                {errors.cardNumber && <p className={errCls}>{errors.cardNumber}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Expiry (MM/YY)</label>
                  <input
                    value={cardExpiry}
                    onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                    className={inputCls + " font-mono-cp"}
                    placeholder="12/28"
                    inputMode="numeric"
                    data-testid="input-card-expiry"
                  />
                  {errors.cardExpiry && <p className={errCls}>{errors.cardExpiry}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">CVC</label>
                  <input
                    value={cardCvc}
                    onChange={e => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={inputCls + " font-mono-cp"}
                    placeholder="123"
                    inputMode="numeric"
                    data-testid="input-card-cvc"
                  />
                  {errors.cardCvc && <p className={errCls}>{errors.cardCvc}</p>}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-card-border rounded-xl p-6 sticky top-24" data-testid="checkout-summary">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

            <div className="space-y-3 mb-5 max-h-72 overflow-y-auto pr-1">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3 items-start" data-testid={`summary-item-${product.id}`}>
                  <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden shrink-0 relative">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted-foreground/10" />
                    )}
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug line-clamp-2">{product.name}</p>
                    <p className="text-xs font-bold mt-0.5 font-mono-cp">${(product.price * quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm border-t border-border pt-4 mb-5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono-cp" data-testid="text-summary-subtotal">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Fee (5%)</span>
                <span className="font-mono-cp" data-testid="text-summary-fee">${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-emerald-600">Free</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between savings-badge px-3 py-2 rounded-lg" data-testid="text-summary-savings">
                  <div className="flex items-center gap-1">
                    <Tag size={13} />
                    <span className="font-semibold">You're saving</span>
                  </div>
                  <span className="font-bold font-mono-cp">${savings.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="font-mono-cp" data-testid="text-summary-total">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={createOrder.isPending}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              data-testid="button-place-order"
            >
              {createOrder.isPending ? "Placing Order..." : <>Place Order — ${total.toFixed(2)} <ArrowRight size={16} /></>}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <ShieldCheck size={12} /> Secure checkout
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
