import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/admin-api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Edit2, Trash2, Save, X, Loader2, Search, AlertTriangle, Truck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Toast, useToast } from "../layout";

const API_BASE = "/api";

interface ShippingRate {
  id: number;
  city: string;
  price: string;
  currency: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const EMPTY: Omit<ShippingRate, "id" | "createdAt" | "updatedAt"> = {
  city: "",
  price: "",
  currency: "SAR",
  isDefault: false,
};

export default function ShippingPage() {
  const [items, setItems] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShippingRate | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/shipping-rates`, { credentials: "include" });
      if (r.ok) setItems(await r.json());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function save(data: Omit<ShippingRate, "id" | "createdAt" | "updatedAt">) {
    setSaving(true);
    try {
      const url = editing ? `${API_BASE}/shipping-rates/${editing.id}` : `${API_BASE}/shipping-rates`;
      const r = await adminFetch(url, {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        show(err.error || "فشل الحفظ", "error");
        return;
      }
      show(editing ? "تم تحديث السعر" : "تمت إضافة السعر");
      setShowForm(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    const r = await adminFetch(`${API_BASE}/shipping-rates/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) {
      show("فشل الحذف", "error");
      return;
    }
    show("تم الحذف");
    setDeleteConfirm(null);
    await load();
  }

  const filtered = items.filter((r) => {
    if (search && !r.city.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="أسعار الشحن"
        description={`${items.length} مدينة • تستخدم للنسخ الورقية فقط`}
        actions={
          <Button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="gap-2 rounded-none font-bold"
          >
            <Plus size={16} /> إضافة سعر
          </Button>
        }
      />

      <div className="bg-background border border-border p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالمدينة..."
            className="rounded-none pr-8"
          />
        </div>
      </div>

      <AnimatePresence>
        {(showForm || editing) && (
          <RateForm
            initial={editing || undefined}
            onSave={save}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد أسعار شحن مضافة بعد</p>
          <p className="text-xs text-muted-foreground mt-2">
            عند تفعيل الكتب الورقية يجب إضافة سعر افتراضي على الأقل.
          </p>
        </div>
      ) : (
        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-right p-3 font-bold">المدينة</th>
                <th className="text-right p-3 font-bold">السعر</th>
                <th className="text-right p-3 font-bold">العملة</th>
                <th className="text-right p-3 font-bold">افتراضي</th>
                <th className="text-left p-3 font-bold w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="p-3 font-bold text-primary">{r.city}</td>
                  <td className="p-3" dir="ltr">{r.price}</td>
                  <td className="p-3 text-xs">{r.currency}</td>
                  <td className="p-3">
                    {r.isDefault ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-secondary/20 border border-secondary text-primary">
                        <Star className="w-3 h-3 fill-current" /> افتراضي
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditing(r); setShowForm(false); }}
                        title="تعديل"
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-secondary hover:bg-muted/40"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(r.id)}
                        title="حذف"
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm !== null && (
        <DeleteConfirm
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => del(deleteConfirm)}
        />
      )}
    </div>
  );
}

function DeleteConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-red-300 max-w-sm w-full p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="text-red-500 w-5 h-5" />
          <h3 className="font-bold text-primary">تأكيد الحذف</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          هل أنت متأكد من حذف سعر الشحن هذا؟
        </p>
        <div className="flex gap-2">
          <Button
            onClick={onConfirm}
            className="rounded-none bg-red-600 hover:bg-red-700 text-white flex-1 gap-2"
          >
            <Trash2 className="w-4 h-4" /> حذف
          </Button>
          <Button onClick={onCancel} variant="outline" className="rounded-none">
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}

function RateForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<ShippingRate>;
  onSave: (d: Omit<ShippingRate, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Omit<ShippingRate, "id" | "createdAt" | "updatedAt">>({
    ...EMPTY,
    ...initial,
  });
  const set = (k: keyof typeof form, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v as never }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border border-secondary/30 p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-black text-primary">
          {initial?.id ? "تعديل سعر شحن" : "إضافة سعر شحن"}
        </h2>
        <button onClick={onCancel} className="text-muted-foreground hover:text-primary">
          <X size={18} />
        </button>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSave(form); }}
        className="space-y-3"
      >
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs font-bold text-muted-foreground mb-1 block">
              المدينة *
            </label>
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              required
              placeholder="الرياض"
              className="rounded-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">
              السعر *
            </label>
            <Input
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              required
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              className="rounded-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">
              العملة
            </label>
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm rounded-none"
            >
              <option>SAR</option>
              <option>USD</option>
              <option>EGP</option>
              <option>AED</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => set("isDefault", !form.isDefault)}
          className={`flex items-center gap-2 px-3 py-1.5 border text-sm font-bold ${
            form.isDefault
              ? "bg-secondary text-primary border-secondary"
              : "border-border text-muted-foreground"
          }`}
        >
          <Star size={14} className={form.isDefault ? "fill-primary" : ""} />
          {form.isDefault ? "السعر الافتراضي" : "تحديد كسعر افتراضي"}
        </button>
        <p className="text-xs text-muted-foreground">
          السعر الافتراضي يُستخدم عندما لا تتطابق المدينة. يُسمح بسعر افتراضي واحد فقط.
        </p>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving} className="gap-2 rounded-none font-bold">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "حفظ..." : "حفظ"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-none">
            إلغاء
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
