import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/60 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="font-display text-2xl text-primary mb-2">COMMONPLACE</div>
            <p className="text-sm text-background/50 leading-relaxed">
              Everyday essentials at prices that make sense. Built for families and small businesses who count every dollar.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-background/40 mb-3">Shop</div>
            <ul className="space-y-2 text-sm">
              {["cleaning", "kitchen", "bathroom", "laundry", "pantry"].map(cat => (
                <li key={cat}><Link href={`/?category=${cat}`} className="hover:text-primary capitalize transition-colors">{cat}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-background/40 mb-3">Account</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/auth/login" className="hover:text-primary transition-colors">Sign In</Link></li>
              <li><Link href="/auth/register" className="hover:text-primary transition-colors">Create Account</Link></li>
              <li><Link href="/account" className="hover:text-primary transition-colors">Order History</Link></li>
              <li><Link href="/account" className="hover:text-primary transition-colors">Auto-Refill</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-background/40 mb-3">About</div>
            <ul className="space-y-2 text-sm">
              <li><span className="text-background/40">Our Mission</span></li>
              <li><span className="text-background/40">How It Works</span></li>
              <li><span className="text-background/40">For Businesses</span></li>
              <li><span className="text-background/40">Contact</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-background/30">
          <span>&copy; {new Date().getFullYear()} CommonPlace. All rights reserved.</span>
          <div className="flex gap-4">
            <span>5% service fee on all orders</span>
            <span>·</span>
            <span>Group-buy pricing</span>
            <span>·</span>
            <span>No hidden costs</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
