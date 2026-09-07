import { useState } from "react";
import { Link } from "wouter";
import { useListProducts, getListProductsQueryKey, useCreateProduct, useUpdateProduct } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Plus, Edit, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductForm {
  name: string;
  category: string;
  price: string;
  wasPrice: string;
  description: string;
  imageUrl: string;
  badge: string;
  isSponsored: boolean;
  isFeatured: boolean;
  inStock: boolean;
}

const emptyForm: ProductForm = {
  name: "", category: "cleaning", price: "", wasPrice: "",
  description: "", imageUrl: "", badge: "",
  isSponsored: false, isFeatured: false, inStock: true,
};

const CATEGORIES = ["cleaning", "kitchen", "bathroom", "laundry", "pantry", "baby", "pet", "health", "batteries", "lighting", "office"];

export default function AdminProductsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [page, setPage] = useState(1);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const { data, isLoading } = useListProducts(
    { page, limit: 20 },
    { query: { queryKey: getListProductsQueryKey({ page, limit: 20 }) } }
  );

  const products = data?.products || [];

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: any) {
    setEditId(p.id);
    setForm({
      name: p.name || "",
      category: p.category || "cleaning",
      price: String(p.price || ""),
      wasPrice: String(p.wasPrice || ""),
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      badge: p.badge || "",
      isSponsored: p.isSponsored || false,
      isFeatured: p.isFeatured || false,
      inStock: p.inStock !== false,
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      category: form.category,
      price: parseFloat(form.price),
      wasPrice: form.wasPrice ? parseFloat(form.wasPrice) : undefined,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      badge: form.badge || undefined,
      isSponsored: form.isSponsored,
      isFeatured: form.isFeatured,
      inStock: form.inStock,
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey({}) });
      setShowForm(false);
      toast({ title: editId ? "Product updated" : "Product created" });
    };
    const onError = () => toast({ title: "Error", description: "Please check all fields.", variant: "destructive" });

    if (editId) {
      updateProduct.mutate({ id: editId, data: payload }, { onSuccess, onError });
    } else {
      createProduct.mutate({ data: payload }, { onSuccess, onError });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground"><ChevronLeft size={20} /></Link>
          <h1 className="font-display text-3xl">PRODUCTS</h1>
          <span className="text-muted-foreground text-sm">({data?.total || 0} total)</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors" data-testid="button-create-product">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="modal-product-form">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{editId ? "Edit Product" : "New Product"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-product">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Product Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Bounty Paper Towels 12-pack"
                    className="w-full h-10 px-3 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" data-testid="input-product-name" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full h-10 px-3 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-card" data-testid="select-category">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Badge</label>
                  <input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="e.g. Best Seller"
                    className="w-full h-10 px-3 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" data-testid="input-badge" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Price ($)</label>
                  <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required type="number" step="0.01" min="0" placeholder="9.99"
                    className="w-full h-10 px-3 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" data-testid="input-price" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Was Price ($)</label>
                  <input value={form.wasPrice} onChange={e => setForm(f => ({ ...f, wasPrice: e.target.value }))} type="number" step="0.01" min="0" placeholder="14.99"
                    className="w-full h-10 px-3 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" data-testid="input-was-price" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Image URL</label>
                  <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} type="url" placeholder="https://..."
                    className="w-full h-10 px-3 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" data-testid="input-image-url" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Product description..."
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none" data-testid="input-description" />
                </div>
                <div className="col-span-2 flex flex-wrap gap-4">
                  {[
                    { key: "isSponsored" as const, label: "Sponsored" },
                    { key: "isFeatured" as const, label: "Featured" },
                    { key: "inStock" as const, label: "In Stock" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                      <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                        className="w-4 h-4 accent-orange-500" data-testid={`checkbox-${key}`} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:border-destructive hover:text-destructive transition-colors">Cancel</button>
                <button type="submit" disabled={createProduct.isPending || updateProduct.isPending}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2" data-testid="button-save-product">
                  <Check size={15} /> {editId ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Category</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Price</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-6 bg-muted rounded animate-pulse" /></td></tr>)
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No products yet</td></tr>
              ) : (
                products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors" data-testid={`product-row-${p.id}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />}
                        <div>
                          <p className="font-medium line-clamp-1">{p.name}</p>
                          {(p.isSponsored || p.isFeatured) && (
                            <div className="flex gap-1 mt-0.5">
                              {p.isSponsored && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Sponsored</span>}
                              {p.isFeatured && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Featured</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground capitalize">{p.category}</td>
                    <td className="px-5 py-4">
                      <span className="font-bold font-mono-cp">${Number(p.price).toFixed(2)}</span>
                      {p.wasPrice && <span className="ml-2 text-xs text-muted-foreground line-through">${Number(p.wasPrice).toFixed(2)}</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", p.inStock ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>
                        {p.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg border border-border hover:border-primary hover:text-primary transition-colors" data-testid={`button-edit-${p.id}`}>
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
