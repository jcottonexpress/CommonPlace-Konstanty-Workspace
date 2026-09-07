import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, Check, RefreshCw } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  price: number;
  wasPrice?: number | null;
  bulkPrice?: number | null;
  badge?: string | null;
  badgeColor?: string | null;
  savings?: string | null;
  imageUrl?: string | null;
  category: string;
  isSponsored?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
}

interface ProductCardProps {
  product: Product;
  index?: number;
}

const BADGE_COLORS: Record<string, string> = {
  orange: "bg-primary text-white",
  green: "bg-emerald-600 text-white",
  blue: "bg-blue-600 text-white",
  red: "bg-red-600 text-white",
  purple: "bg-purple-600 text-white",
};

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const discount = product.wasPrice && product.wasPrice > product.price
    ? Math.round((1 - product.price / product.wasPrice) * 100)
    : null;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      wasPrice: product.wasPrice,
      imageUrl: product.imageUrl,
      category: product.category,
      isSponsored: product.isSponsored,
      inStock: product.inStock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className={cn(
        "product-card block bg-card border border-card-border rounded-xl overflow-hidden group cursor-pointer",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: "both" }}
      data-testid={`card-product-${product.id}`}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <ShoppingCart size={40} />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.badge && (
            <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", BADGE_COLORS[product.badgeColor || "orange"] || BADGE_COLORS.orange)} data-testid={`badge-product-${product.id}`}>
              {product.badge}
            </span>
          )}
          {discount && !product.badge && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
              -{discount}%
            </span>
          )}
        </div>
        {product.isSponsored && (
          <span className="absolute top-2 right-2 text-[10px] text-muted-foreground/60 bg-background/80 px-1.5 py-0.5 rounded" data-testid={`label-sponsored-${product.id}`}>
            Sponsored
          </span>
        )}
        {/* Quick add */}
        {product.inStock !== false && (
          <button
            onClick={handleAddToCart}
            className={cn(
              "absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
              added
                ? "bg-emerald-600 text-white scale-110"
                : "bg-primary text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
            )}
            data-testid={`button-add-cart-${product.id}`}
          >
            {added ? <Check size={16} /> : <ShoppingCart size={15} />}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">{product.category}</div>
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-2" data-testid={`text-product-name-${product.id}`}>
          {product.name}
        </h3>

        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-foreground font-mono-cp" data-testid={`text-price-${product.id}`}>
              ${product.price.toFixed(2)}
            </span>
            {product.wasPrice && product.wasPrice > product.price && (
              <span className="ml-1.5 text-xs text-muted-foreground line-through" data-testid={`text-was-price-${product.id}`}>
                ${product.wasPrice.toFixed(2)}
              </span>
            )}
          </div>
          {product.savings && (
            <span className="text-[11px] font-semibold savings-badge px-2 py-0.5 rounded-full shrink-0" data-testid={`text-savings-${product.id}`}>
              {product.savings}
            </span>
          )}
        </div>

        {product.bulkPrice && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <RefreshCw size={10} />
            <span>Auto-refill: <span className="font-semibold text-foreground">${product.bulkPrice.toFixed(2)}</span></span>
          </div>
        )}
      </div>
    </Link>
  );
}
