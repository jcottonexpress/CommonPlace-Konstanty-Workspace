import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartProduct {
  id: number;
  name: string;
  price: number;
  wasPrice?: number | null;
  imageUrl?: string | null;
  category: string;
  isSponsored?: boolean;
  inStock?: boolean;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: CartProduct, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  savings: number;
  serviceFee: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cp_cart_v2";
const SERVICE_FEE_PCT = 0.05;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: CartProduct, quantity: number = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeItem = (productId: number) => setItems(prev => prev.filter(i => i.product.id !== productId));

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) { removeItem(productId); return; }
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const savings = items.reduce((s, i) => {
    const was = i.product.wasPrice || i.product.price;
    return s + Math.max(0, was - i.product.price) * i.quantity;
  }, 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_PCT * 100) / 100;
  const total = Math.round((subtotal + serviceFee) * 100) / 100;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, savings, serviceFee, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
