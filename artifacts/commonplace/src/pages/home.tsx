import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Search, ChevronRight, Star, Zap, Package, Users } from "lucide-react";
import { useListProducts, useGetFeaturedProducts, useListCategories, getListProductsQueryKey, getGetFeaturedProductsQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import ProductCard from "@/components/ProductCard";
import { cn } from "@/lib/utils";

const TICKER_ITEMS = [
  "Free group-buy pricing on bulk orders",
  "5% service fee — that's it",
  "Auto-refill subscriptions available",
  "Supporting families across the country",
  "Save up to 40% vs retail",
  "Everyday essentials, unbeatable prices",
];

const CATEGORY_ICONS: Record<string, string> = {
  cleaning: "✨", kitchen: "🍳", bathroom: "🚿", laundry: "👕",
  pantry: "📦", baby: "🍼", pet: "🐾", health: "💊",
  batteries: "⚡", lighting: "💡", office: "📁",
};

export default function HomePage() {
  const queryString = useSearch();
  const params = new URLSearchParams(queryString);
  const searchQ = params.get("search") || "";
  const categoryQ = params.get("category") || "";

  const [search, setSearch] = useState(searchQ);
  const [activeCategory, setActiveCategory] = useState(categoryQ);
  const [, setLocation] = useLocation();

  useEffect(() => { setSearch(searchQ); setActiveCategory(categoryQ); }, [searchQ, categoryQ]);

  const { data: featured, isLoading: featuredLoading } = useGetFeaturedProducts({
    query: { queryKey: getGetFeaturedProductsQueryKey() }
  });

  const { data: categories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });

  const { data: productsData, isLoading: productsLoading } = useListProducts(
    { search: search || undefined, category: activeCategory || undefined, limit: 48 },
    { query: { queryKey: getListProductsQueryKey({ search: search || undefined, category: activeCategory || undefined, limit: 48 }) } }
  );

  const products = productsData?.products || [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (activeCategory) qs.set("category", activeCategory);
    setLocation(`/?${qs}`);
  }

  function selectCategory(slug: string) {
    const next = activeCategory === slug ? "" : slug;
    setActiveCategory(next);
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (next) qs.set("category", next);
    setLocation(`/?${qs}`);
  }

  const isFiltered = !!search || !!activeCategory;

  return (
    <div className="min-h-screen">
      {/* Ticker */}
      <div className="bg-primary text-white text-xs py-2 overflow-hidden whitespace-nowrap">
        <div className="ticker-animate inline-block">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="mx-10 font-medium">{item}</span>
          ))}
        </div>
      </div>

      {/* Hero */}
      {!isFiltered && (
        <section className="bg-foreground text-background py-14 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <Zap size={12} />
              Group-buy pricing — everyone saves more
            </div>
            <h1 className="font-display text-5xl md:text-7xl text-background mb-4 leading-none">
              ESSENTIALS<br /><span className="text-primary">AT COST.</span>
            </h1>
            <p className="text-background/60 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Everyday consumables for families and small businesses. We undercut Amazon — and keep it that way.
            </p>

            <form onSubmit={handleSearch} className="flex max-w-lg mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-background/40" size={18} />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Paper towels, trash bags, dish soap..."
                  className="w-full h-12 pl-11 pr-4 bg-foreground/30 border border-background/20 text-background placeholder:text-background/40 rounded-l-xl focus:outline-none focus:border-primary text-sm"
                  data-testid="input-hero-search"
                />
              </div>
              <button type="submit" className="h-12 px-6 bg-primary text-white font-semibold rounded-r-xl hover:bg-primary/90 transition-colors text-sm" data-testid="button-hero-search">
                Search
              </button>
            </form>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm mx-auto">
              {[
                { icon: Package, label: "Products", value: "500+" },
                { icon: Users, label: "Families", value: "10k+" },
                { icon: Star, label: "Avg Savings", value: "32%" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center">
                  <Icon className="mx-auto mb-1 text-primary" size={20} />
                  <div className="font-display text-2xl text-background">{value}</div>
                  <div className="text-xs text-background/40">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Featured / Deals & Spotlights */}
        {!isFiltered && (
          <section className="mb-10" data-testid="section-featured">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-3xl">DEALS &amp; SPOTLIGHTS</h2>
              <Link href="/?sponsored=true" className="text-sm text-primary flex items-center gap-1 hover:underline">View all <ChevronRight size={14} /></Link>
            </div>
            {featuredLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="aspect-[4/5] bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(featured || []).slice(0, 8).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Categories */}
        {!isFiltered && (
          <section className="mb-10" data-testid="section-categories">
            <h2 className="font-display text-3xl mb-4">SHOP BY CATEGORY</h2>
            <div className="flex gap-3 flex-wrap">
              {(categories || []).map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => selectCategory(cat.slug)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all",
                    activeCategory === cat.slug
                      ? "bg-primary text-white border-primary"
                      : "bg-card border-border text-foreground hover:border-primary hover:text-primary"
                  )}
                  data-testid={`button-category-${cat.slug}`}
                >
                  <span>{CATEGORY_ICONS[cat.slug] || "📦"}</span>
                  <span className="capitalize">{cat.name}</span>
                  <span className="text-xs opacity-60">({cat.count})</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* All Products */}
        <section data-testid="section-products">
          {isFiltered && (
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-3xl">
                  {activeCategory ? activeCategory.toUpperCase() : "SEARCH RESULTS"}
                </h2>
                {products.length > 0 && <p className="text-sm text-muted-foreground mt-1">{productsData?.total} products found</p>}
              </div>
              <div className="flex items-center gap-3">
                {/* Filter categories inline */}
                {categories && (
                  <select
                    value={activeCategory}
                    onChange={e => selectCategory(e.target.value)}
                    className="text-sm border border-border rounded-lg px-3 py-2 bg-card"
                    data-testid="select-category-filter"
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                )}
                <button
                  onClick={() => { setSearch(""); setActiveCategory(""); setLocation("/"); }}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                  data-testid="button-clear-filters"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {!isFiltered && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-3xl">ALL ESSENTIALS</h2>
              <div className="flex items-center gap-3">
                {categories && (
                  <select
                    value={activeCategory}
                    onChange={e => selectCategory(e.target.value)}
                    className="text-sm border border-border rounded-lg px-3 py-2 bg-card"
                    data-testid="select-category-filter-main"
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}

          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => <div key={i} className="aspect-[4/5] bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Package size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
