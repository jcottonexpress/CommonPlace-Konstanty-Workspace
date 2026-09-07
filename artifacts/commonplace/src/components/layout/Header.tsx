import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Search, User, Menu, X, ChevronDown } from "lucide-react";
import { useGetCurrentUser, useLogoutUser } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { removeAuthToken } from "@/lib/auth";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  "cleaning", "kitchen", "bathroom", "laundry", "pantry", "baby", "pet", "health", "batteries", "lighting", "office"
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { totalItems } = useCart();
  const queryClient = useQueryClient();
  const { data: currentUser } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false }
  });
  const logoutUser = useLogoutUser();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      setLocation(`/?search=${encodeURIComponent(search.trim())}`);
      setMenuOpen(false);
    }
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

  return (
    <header className="sticky top-0 z-50 bg-foreground text-background shadow-lg">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="font-display text-2xl tracking-wider text-primary shrink-0" data-testid="link-logo">
          COMMONPLACE
        </Link>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="flex-1 hidden md:flex max-w-xl mx-4">
          <div className="relative w-full">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search everyday essentials..."
              className="w-full h-10 pl-4 pr-10 rounded-lg bg-foreground/20 border border-background/20 text-background placeholder:text-background/50 text-sm focus:outline-none focus:border-primary"
              data-testid="input-search"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-background/60 hover:text-primary" data-testid="button-search">
              <Search size={18} />
            </button>
          </div>
        </form>

        {/* Nav — desktop */}
        <nav className="hidden md:flex items-center gap-1 ml-auto">
          <div className="relative" onMouseLeave={() => setCatOpen(false)}>
            <button
              onMouseEnter={() => setCatOpen(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-background/80 hover:text-primary transition-colors"
              data-testid="button-categories"
            >
              Categories <ChevronDown size={14} />
            </button>
            {catOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                {CATEGORIES.map(cat => (
                  <Link
                    key={cat}
                    href={`/?category=${cat}`}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary capitalize"
                    data-testid={`link-category-${cat}`}
                    onClick={() => setCatOpen(false)}
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/cart" className="relative px-3 py-2 text-background/80 hover:text-primary transition-colors" data-testid="link-cart">
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" data-testid="badge-cart-count">
                {totalItems}
              </span>
            )}
          </Link>

          {currentUser ? (
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-background/80 hover:text-primary transition-colors" data-testid="button-user-menu">
                <User size={20} />
                <span className="hidden lg:block">{currentUser.name?.split(" ")[0]}</span>
              </button>
              <div className="absolute top-full right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-lg py-1 z-50 hidden group-hover:block">
                <Link href="/account" className="block px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary" data-testid="link-account">My Account</Link>
                {currentUser.role === "admin" && (
                  <Link href="/admin" className="block px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary" data-testid="link-admin">Admin</Link>
                )}
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-destructive/10 hover:text-destructive" data-testid="button-logout">
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link href="/auth/login" className="ml-1 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors" data-testid="link-login">
              Sign In
            </Link>
          )}
        </nav>

        {/* Mobile: cart + burger */}
        <div className="md:hidden flex items-center gap-3 ml-auto">
          <Link href="/cart" className="relative text-background/80" data-testid="link-cart-mobile">
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                {totalItems}
              </span>
            )}
          </Link>
          <button onClick={() => setMenuOpen(m => !m)} className="text-background/80" data-testid="button-mobile-menu">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search essentials..."
            className="w-full h-10 pl-4 pr-10 rounded-lg bg-foreground/20 border border-background/20 text-background placeholder:text-background/50 text-sm focus:outline-none focus:border-primary"
            data-testid="input-search-mobile"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-background/60">
            <Search size={18} />
          </button>
        </form>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-background/10 bg-foreground px-4 py-4 space-y-1">
          {CATEGORIES.slice(0, 6).map(cat => (
            <Link key={cat} href={`/?category=${cat}`} className="block py-2 text-sm text-background/70 hover:text-primary capitalize" onClick={() => setMenuOpen(false)} data-testid={`mobile-link-category-${cat}`}>
              {cat}
            </Link>
          ))}
          <div className="pt-2 border-t border-background/10">
            {currentUser ? (
              <>
                <Link href="/account" className="block py-2 text-sm text-background/70 hover:text-primary" onClick={() => setMenuOpen(false)}>My Account</Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="w-full text-left py-2 text-sm text-background/70 hover:text-destructive">Sign Out</button>
              </>
            ) : (
              <Link href="/auth/login" className="block py-2 text-sm text-primary font-semibold" onClick={() => setMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
