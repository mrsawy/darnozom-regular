import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const T = {
  ar: {
    eyebrow: "متجر دار نظم",
    title: "المتجر",
    subtitle: "اختر ما تبحث عنه: كتب دار نظم وإصداراتها، أو دوراتها المسجلة.",
    cats: {
      books: {
        title: "الكتب",
        kicker: "مراجع منشورة",
        desc: "إصدارات نوعية في الإدارة، الحوكمة، الفقه التطبيقي، والتطوير المؤسسي — بصيغة ورقية وإلكترونية.",
        cta: "تصفّح الكتب",
      },
      courses: {
        title: "الدورات المسجلة",
        kicker: "تعلّم في وقتك",
        desc: "دورات مسجّلة من دار نظم تتابعها في الوقت الذي يناسبك.",
        cta: "تصفّح الدورات",
      },
    },
  },
  en: {
    eyebrow: "DarNozom Store",
    title: "Store",
    subtitle: "Choose what you're looking for: DarNozom books and publications, or recorded courses.",
    cats: {
      books: {
        title: "Books",
        kicker: "Published references",
        desc: "Curated publications on management, governance, applied jurisprudence, and organizational development — in print and digital.",
        cta: "Browse books",
      },
      courses: {
        title: "Recorded Courses",
        kicker: "Learn at your pace",
        desc: "DarNozom recorded courses you can follow whenever it suits you.",
        cta: "Browse courses",
      },
    },
  },
};

const CATS = [
  { key: "books", icon: BookOpen, href: "/services/store/books" },
  { key: "courses", icon: GraduationCap, href: "/services/store/courses" },
] as const;

export default function StorePage() {
  const { isArabic } = useLanguage();
  const t = isArabic ? T.ar : T.en;

  return (
    <div className="min-h-screen bg-[hsl(43_33%_97%)]">
      <SiteNav />

      <section className="relative pt-28 pb-12 px-4 overflow-hidden border-b border-border/60 bg-[hsl(43_33%_97%)]">
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(24,54,80,0.10),_transparent_60%)]"
          aria-hidden
        />
        <div className="container mx-auto max-w-6xl relative">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-primary mb-5 font-medium">
              <span className="w-8 h-px bg-primary/50" />
              {t.eyebrow}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-[1.15] mb-5">{t.title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">{t.subtitle}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-5">
            {CATS.map((cat, i) => {
              const Icon = cat.icon;
              const meta = t.cats[cat.key];
              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link
                    href={cat.href}
                    className="group relative flex flex-col bg-card border border-border hover:border-primary/40 rounded-2xl p-8 h-full transition-all overflow-hidden"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/0 group-hover:via-primary/40 to-transparent transition-all" />
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-6">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-[11px] tracking-[0.2em] uppercase text-primary/70 font-medium mb-2">
                      {meta.kicker}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">{meta.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">{meta.desc}</p>
                    <span className="inline-flex items-center gap-1.5 pt-4 border-t border-border text-primary font-medium text-sm group-hover:gap-2.5 transition-all">
                      {meta.cta}
                      <ArrowUpRight className={`w-4 h-4 ${isArabic ? "rotate-[270deg]" : ""}`} />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
