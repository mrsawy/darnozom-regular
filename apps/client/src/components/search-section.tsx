import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, BookOpen, GraduationCap, CalendarDays, Briefcase, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { searchStatic, type SearchResult, type SearchCategory } from "@/lib/search-data";

const API_BASE = "/api";

interface BookItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
}

type AnyResult =
  | (SearchResult & { resultType: "static" })
  | { id: string; title: string; desc: string; category: "book"; href: string; resultType: "book" };

const CATEGORY_LABELS: Record<SearchCategory | "book", { ar: string; en: string; icon: React.ElementType; color: string }> = {
  service: { ar: "خدمة", en: "Service", icon: Briefcase, color: "bg-secondary/15 text-secondary border-secondary/30" },
  event: { ar: "فعالية", en: "Event", icon: CalendarDays, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  academy: { ar: "أكاديمية", en: "Academy", icon: GraduationCap, color: "bg-green-500/10 text-green-400 border-green-500/20" },
  book: { ar: "كتاب", en: "Book", icon: BookOpen, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

const T = {
  ar: {
    placeholder: "ابحث عن خدمة، فعالية، برنامج أكاديمي، أو كتاب...",
    sectionLabel: "ابحث في دار نظم",
    heading: "ابحث في محتوانا",
    noResults: "لا توجد نتائج مطابقة",
    noResultsSub: "جرّب كلمة مختلفة أو تصفّح الأقسام أعلاه",
    viewResult: "عرض",
  },
  en: {
    placeholder: "Search for a service, event, academy program, or book...",
    sectionLabel: "Search DarNozom",
    heading: "Search Our Content",
    noResults: "No matching results",
    noResultsSub: "Try a different keyword or browse the sections above",
    viewResult: "View",
  },
};

let booksCache: BookItem[] | null = null;

async function fetchBooks(): Promise<BookItem[]> {
  if (booksCache) return booksCache;
  try {
    const res = await fetch(`${API_BASE}/books`);
    if (!res.ok) return [];
    const data = await res.json();
    booksCache = data;
    return data;
  } catch {
    return [];
  }
}

function scoreBook(book: BookItem, query: string): number {
  const q = query.toLowerCase();
  const title = (book.title || "").toLowerCase();
  const desc = (book.description || "").toLowerCase();
  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  if (desc.includes(q)) return 30;
  return 0;
}

export default function SearchSection() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnyResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const staticResults = searchStatic(q).map(r => ({ ...r, resultType: "static" as const }));

    setResults(staticResults);
    setOpen(true);
    setLoading(booksCache === null);

    const books = await fetchBooks();
    const bookResults: AnyResult[] = books
      .map(b => ({ book: b, s: scoreBook(b, q) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map(({ book }) => ({
        id: `book-${book.id}`,
        title: book.title,
        desc: book.description || (isArabic ? "كتاب إصدار دار نظم" : "DarNozom publication"),
        category: "book" as const,
        href: "/services/store/books",
        resultType: "book" as const,
      }));

    const combined: AnyResult[] = [...staticResults, ...bookResults].slice(0, 10);
    setResults(combined);
    setOpen(combined.length > 0 || q.trim().length > 0);
    setLoading(false);
  }, [isArabic]);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const clear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const getTitle = (r: AnyResult) => {
    if (r.resultType === "static") {
      return isArabic ? r.titleAr : r.titleEn;
    }
    return r.title;
  };

  const getDesc = (r: AnyResult) => {
    if (r.resultType === "static") {
      return isArabic ? r.descAr : r.descEn;
    }
    return r.desc;
  };

  return (
    <section className="relative dark bg-[#0F3D2E] py-16 border-b border-secondary/15 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-4 justify-center">
            <div className="h-px w-8 bg-secondary/60" />
            <span className="text-secondary text-[10px] font-bold tracking-[0.25em] uppercase">{t.sectionLabel}</span>
            <div className="h-px w-8 bg-secondary/60" />
          </div>

          <h2
            className="text-center font-black text-white mb-8"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}
          >
            {t.heading}
          </h2>

          <div ref={containerRef} className="relative">
            <div className="relative flex items-center group">
              <Search
                size={18}
                className={`absolute text-secondary/60 group-focus-within:text-secondary transition-colors pointer-events-none z-10 ${isArabic ? "right-4" : "left-4"}`}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => { if (results.length > 0 || query.trim()) setOpen(true); }}
                placeholder={t.placeholder}
                dir={isArabic ? "rtl" : "ltr"}
                className={`
                  w-full bg-white/[0.06] border border-secondary/20 text-white placeholder:text-white/30
                  focus:outline-none focus:border-secondary/60 focus:bg-white/[0.09] transition-all
                  py-4 text-sm font-medium
                  ${isArabic ? "pr-12 pl-12" : "pl-12 pr-12"}
                  ${open ? "rounded-none border-b-0" : ""}
                `}
                style={{ fontFamily: "var(--font-sans)" }}
              />
              {query && (
                <button
                  onClick={clear}
                  className={`absolute text-white/30 hover:text-white/70 transition-colors z-10 ${isArabic ? "left-4" : "right-4"}`}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-full left-0 right-0 dark bg-[#0F3D2E] border border-secondary/20 border-t-0 shadow-2xl shadow-black/40 z-50 max-h-[420px] overflow-y-auto"
                >
                  {loading && (
                    <div className="flex items-center justify-center py-8 text-white/30 text-sm">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      >
                        <Search size={20} />
                      </motion.div>
                    </div>
                  )}

                  {!loading && results.length === 0 && query.trim() && (
                    <div className="py-10 text-center">
                      <p className="text-white/50 font-medium text-sm">{t.noResults}</p>
                      <p className="text-white/25 text-xs mt-1">{t.noResultsSub}</p>
                    </div>
                  )}

                  {!loading && results.length > 0 && (
                    <ul>
                      {results.map((r, i) => {
                        const meta = CATEGORY_LABELS[r.category];
                        const Icon = meta.icon;
                        const title = getTitle(r);
                        const desc = getDesc(r);

                        return (
                          <motion.li
                            key={r.id}
                            initial={{ opacity: 0, x: isArabic ? 10 : -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                          >
                            <Link
                              href={r.href}
                              onClick={() => setOpen(false)}
                              className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.05] transition-colors group/item border-b border-white/[0.05] last:border-0"
                              dir={isArabic ? "rtl" : "ltr"}
                            >
                              <div className={`shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center border ${meta.color}`}>
                                <Icon size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-white font-bold text-sm leading-snug truncate">{title}</span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 border shrink-0 ${meta.color}`}>
                                    {isArabic ? meta.ar : meta.en}
                                  </span>
                                </div>
                                <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{desc}</p>
                              </div>
                              <div className={`shrink-0 self-center text-secondary/0 group-hover/item:text-secondary/80 transition-colors`}>
                                <ArrowLeft size={14} className={isArabic ? "" : "rotate-180"} />
                              </div>
                            </Link>
                          </motion.li>
                        );
                      })}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
