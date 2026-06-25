import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AdminTabHint from "@/components/admin/AdminTabHint";
import { useConfirm } from "@/contexts/ConfirmContext";

type FaqItem = { id: number; question: string; answer: string; sortOrder: number };
type FaqCategory = {
  id: string;
  title: string;
  description: string;
  items: FaqItem[];
};

export default function AdminFaqTab({ getToken }: { getToken: () => string | null }) {
  const confirm = useConfirm();
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(config.endpoints.admin.faq, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(
          (data || []).map((c: Record<string, unknown>) => ({
            id: String(c.id),
            title: String(c.title ?? ""),
            description: String(c.description ?? ""),
            items: ((c.items as FaqItem[]) || []).map((i) => ({
              id: Number(i.id),
              question: String(i.question ?? ""),
              answer: String(i.answer ?? ""),
              sortOrder: Number(i.sortOrder ?? 0),
            })),
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const saveCategory = async (cat: FaqCategory) => {
    const token = getToken();
    const res = await fetch(config.endpoints.admin.faqCategory(cat.id), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: cat.title, description: cat.description }),
    });
    if (res.ok) toast.success("Раздел обновлён");
    else toast.error("Ошибка сохранения раздела");
  };

  const saveItem = async (item: FaqItem) => {
    const token = getToken();
    const res = await fetch(config.endpoints.admin.faqItem(item.id), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ question: item.question, answer: item.answer, categoryId: "" }),
    });
    if (res.ok) toast.success("Вопрос сохранён");
    else toast.error("Ошибка");
  };

  const addItem = async (categoryId: string) => {
    const token = getToken();
    const res = await fetch(config.endpoints.admin.faqItems, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        question: "Новый вопрос",
        answer: "Ответ…",
      }),
    });
    if (res.ok) {
      toast.success("Вопрос добавлен");
      load();
    }
  };

  const deleteItem = async (id: number) => {
    const ok = await confirm({
      title: "Удалить вопрос?",
      message: "Удалить этот вопрос из FAQ? Действие нельзя отменить.",
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (!ok) return;
    const token = getToken();
    const res = await fetch(config.endpoints.admin.faqItem(id), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      toast.success("Удалено");
      load();
    }
  };

  if (loading) return <p className="text-muted-foreground text-sm py-8 text-center">Загрузка FAQ…</p>;

  return (
    <div className="space-y-8">
      <AdminTabHint title="FAQ на сайте">
        Можно менять заголовки существующих разделов и вопросы внутри них. Новые разделы добавлять нельзя — только
        редактирование четырёх блоков.
      </AdminTabHint>

      {categories.map((cat) => (
        <div key={cat.id} className="rounded-2xl border border-border bg-[var(--vibe-surface)] p-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase text-muted-foreground">Заголовок раздела</label>
              <Input
                value={cat.title}
                onChange={(e) =>
                  setCategories((prev) =>
                    prev.map((c) => (c.id === cat.id ? { ...c, title: e.target.value } : c))
                  )
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground">Подзаголовок</label>
              <Input
                value={cat.description}
                onChange={(e) =>
                  setCategories((prev) =>
                    prev.map((c) => (c.id === cat.id ? { ...c, description: e.target.value } : c))
                  )
                }
                className="mt-1"
              />
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => saveCategory(cat)}>
            Сохранить раздел
          </Button>

          <div className="space-y-4 pt-2 border-t border-border">
            {cat.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-background/50 p-4 space-y-2">
                <Input
                  value={item.question}
                  onChange={(e) =>
                    setCategories((prev) =>
                      prev.map((c) =>
                        c.id === cat.id
                          ? {
                              ...c,
                              items: c.items.map((i) =>
                                i.id === item.id ? { ...i, question: e.target.value } : i
                              ),
                            }
                          : c
                      )
                    )
                  }
                  placeholder="Вопрос"
                />
                <Textarea
                  value={item.answer}
                  rows={3}
                  onChange={(e) =>
                    setCategories((prev) =>
                      prev.map((c) =>
                        c.id === cat.id
                          ? {
                              ...c,
                              items: c.items.map((i) =>
                                i.id === item.id ? { ...i, answer: e.target.value } : i
                              ),
                            }
                          : c
                      )
                    )
                  }
                  placeholder="Ответ"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveItem(item)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Сохранить
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => addItem(cat.id)}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить вопрос
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
