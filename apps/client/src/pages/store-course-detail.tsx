import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  GraduationCap,
  ShoppingCart,
  ExternalLink,
  Star,
  Globe,
  Clock,
  Calendar,
  MapPin,
  Award,
  Layers,
  Sparkles,
  Check,
  User,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/site-nav";
import { FetchError } from "@/components/fetch-error";
import { useLanguage } from "@/lib/language-context";
import { useCart } from "@/lib/cart-context";
import type { StoreCourse } from "@/lib/store-types";
import { SiteFooter } from "@/components/site-footer";

const T = {
  ar: {
    crumbStore: "المتجر",
    crumbCourses: "الدورات",
    back: "العودة للدورات",
    notFound: "لم يتم العثور على هذه الدورة",
    by: "المدرّب",
    free: "مجاني",
    addToCart: "أضف للسلة",
    inCart: "في السلة",
    added: "تمت الإضافة",
    syllabus: "تحميل المنهج",
    new: "دورة جديدة",
    featured: "دورة مميزة",
    soon: "قريباً",
    archived: "مؤرشفة",
    available: "التسجيل مفتوح الآن",
    description: "نبذة عن الدورة",
    details: "معلومات الدورة",
    duration: "المدة",
    modules: "عدد الوحدات",
    moduleUnit: "وحدة",
    hours: "ساعة",
    language: "اللغة",
    level: "المستوى",
    delivery: "نمط التقديم",
    upcoming: "تاريخ البداية",
    location: "المكان",
    certification: "شهادة معتمدة",
    certIncluded: "تتضمّن شهادة إتمام",
    levels: {
      beginner: "مبتدئ",
      intermediate: "متوسط",
      advanced: "متقدم",
      all_levels: "جميع المستويات",
    },
    deliveries: {
      online_self: "أونلاين ذاتي",
      online_live: "أونلاين مباشر",
      onsite: "حضوري",
      hybrid: "هجين",
    },
    languages: { ar: "العربية", en: "الإنجليزية", both: "العربية والإنجليزية" },
  },
  en: {
    crumbStore: "Store",
    crumbCourses: "Courses",
    back: "Back to Courses",
    notFound: "This course was not found",
    by: "Instructor",
    free: "Free",
    addToCart: "Add to cart",
    inCart: "In cart",
    added: "Added",
    syllabus: "Download Syllabus",
    new: "New Course",
    featured: "Featured",
    soon: "Coming Soon",
    archived: "Archived",
    available: "Enrollment open",
    description: "About this course",
    details: "Course information",
    duration: "Duration",
    modules: "Modules",
    moduleUnit: "modules",
    hours: "hours",
    language: "Language",
    level: "Level",
    delivery: "Delivery",
    upcoming: "Start date",
    location: "Location",
    certification: "Accredited certificate",
    certIncluded: "Includes a completion certificate",
    levels: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
      all_levels: "All levels",
    },
    deliveries: {
      online_self: "Online self-paced",
      online_live: "Online live",
      onsite: "Onsite",
      hybrid: "Hybrid",
    },
    languages: { ar: "Arabic", en: "English", both: "Arabic & English" },
  },
};

export default function StoreCourseDetailPage() {
  const { isArabic } = useLanguage();
  const t = isArabic ? T.ar : T.en;
  const [, params] = useRoute("/services/store/courses/:id");
  const id = params?.id;

  const [course, setCourse] = useState<StoreCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const cart = useCart();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/store/courses/${id}`)
      .then(async (r) => {
        if (cancelled) return;
        // A 404 is a genuine "not found"; any other non-ok status is a
        // load failure that should surface a retry instead of "not found".
        if (r.status === 404) {
          setCourse(null);
          return;
        }
        if (!r.ok) {
          setError(true);
          return;
        }
        const data = await r.json();
        if (!cancelled) setCourse(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const title = course ? (isArabic ? course.titleAr : course.titleEn || course.titleAr) : "";
  const description = course
    ? isArabic
      ? course.descriptionAr
      : course.descriptionEn || course.descriptionAr
    : "";

  const numericPrice = (() => {
    if (!course?.price) return 0;
    const cleaned = String(course.price).replace(/[^\d.]/g, "");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  })();
  const inCart = course ? cart.items.some((item) => item.type === "course" && item.legacyProductId === course.id) : false;
  const canBuy = numericPrice > 0;

  function handleAddToCart() {
    if (!course || inCart) return;
    window.alert(
      isArabic
        ? "إضافة الدورات إلى السلة غير متاحة حالياً. السلة مخصصة للكتب عبر Medusa."
        : "Adding courses to the cart is not available yet. The cart is for books.",
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {loading && (
        <div className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-[420px_1fr] gap-12">
              <div className="aspect-square rounded-3xl bg-card animate-pulse" />
              <div className="space-y-5 pt-4">
                <div className="h-4 w-24 bg-card rounded animate-pulse" />
                <div className="h-12 w-3/4 bg-card rounded animate-pulse" />
                <div className="h-6 w-1/3 bg-card rounded animate-pulse" />
                <div className="h-32 bg-card rounded-2xl animate-pulse mt-8" />
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-md">
            <FetchError onRetry={() => setReloadKey((k) => k + 1)} />
          </div>
        </div>
      )}

      {!loading && !error && !course && (
        <div className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-md text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-card border border-border flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground mb-6">{t.notFound}</p>
            <Link href="/services/store/courses">
              <Button variant="outline" className="gap-2">
                <ChevronLeft className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
                {t.back}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {course && (
        <>
          {/* Decorative gradient backdrop (purple/pink for courses) */}
          <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none -z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/[0.07] via-purple-500/[0.02] to-transparent" />
            <div className="absolute -top-40 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
            <div className="absolute -top-20 right-1/4 w-80 h-80 rounded-full bg-pink-500/10 blur-3xl" />
          </div>

          <section className="relative pt-28 pb-16 px-4 bg-[#F4ECD7]">
            <div className="container mx-auto max-w-6xl">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
                <Link href="/services/store" className="hover:text-secondary transition-colors">
                  {t.crumbStore}
                </Link>
                <ChevronLeft className={`w-3.5 h-3.5 ${isArabic ? "" : "rotate-180"}`} />
                <Link href="/services/store/courses" className="hover:text-secondary transition-colors">
                  {t.crumbCourses}
                </Link>
                <ChevronLeft className={`w-3.5 h-3.5 ${isArabic ? "" : "rotate-180"}`} />
                <span className="text-foreground/70 truncate max-w-[40ch]">{title}</span>
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="grid lg:grid-cols-[380px_1fr] gap-12 lg:gap-16 items-start"
              >
                {/* Thumbnail (square) */}
                <div className="relative lg:sticky lg:top-28">
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-transparent rounded-3xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-white/5 shadow-2xl shadow-black/40 transition-transform duration-700 group-hover:scale-[1.02]">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GraduationCap className="w-24 h-24 text-purple-400/40" />
                        </div>
                      )}
                      <div className="absolute top-4 inset-x-4 flex items-start justify-between gap-2 pointer-events-none">
                        {course.isNewRelease && (
                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/30 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> {t.new}
                          </span>
                        )}
                        {course.isFeatured && (
                          <span className="bg-secondary text-secondary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-secondary/30 inline-flex items-center gap-1 ms-auto">
                            <Star className="w-3 h-3 fill-current" /> {t.featured}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 inset-x-6 h-4 bg-gradient-to-b from-black/30 to-transparent rounded-full blur-md" />
                  </div>
                </div>

                {/* Info */}
                <div className="min-w-0">
                  {/* Category pill */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-5">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">
                      {t.deliveries[course.delivery]}
                    </span>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight tracking-tight">
                    {title}
                  </h1>

                  {/* Instructor */}
                  {course.instructor && (
                    <p className="text-lg text-muted-foreground mb-6">
                      <span className="text-sm uppercase tracking-wider me-2 opacity-60">
                        {t.by}
                      </span>
                      <span className="font-medium text-foreground/90">{course.instructor}</span>
                    </p>
                  )}

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-8">
                    {course.status === "available" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        {t.available}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                          course.status === "coming_soon"
                            ? "bg-secondary/15 text-secondary/70 border border-secondary/30"
                            : "bg-muted/40 text-muted-foreground border border-border"
                        }`}
                      >
                        {course.status === "coming_soon" ? t.soon : t.archived}
                      </span>
                    )}
                  </div>

                  {/* Quick stats strip */}
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    {course.durationHours && (
                      <StatPill
                        icon={Clock}
                        label={t.duration}
                        value={`${course.durationHours} ${t.hours}`}
                      />
                    )}
                    {course.modules && (
                      <StatPill
                        icon={Layers}
                        label={t.modules}
                        value={`${course.modules} ${t.moduleUnit}`}
                      />
                    )}
                    {course.certification && (
                      <StatPill
                        icon={Award}
                        label={t.certification}
                        value={isArabic ? "نعم" : "Yes"}
                        accent
                      />
                    )}
                  </div>

                  {/* Purchase panel */}
                  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 mb-10">
                    <div className="flex flex-wrap items-end justify-between gap-6 mb-5">
                      <div>
                        {course.price ? (
                          <>
                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                              {isArabic ? "السعر" : "Price"}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-bold text-secondary">
                                {course.price}
                              </span>
                              <span className="text-base font-medium text-muted-foreground">
                                {course.currency || "SAR"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-3xl font-bold text-emerald-400">{t.free}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {course.status !== "archived" && canBuy && (
                        <Button
                          onClick={handleAddToCart}
                          size="lg"
                          data-testid="btn-add-to-cart"
                          className={`flex-1 gap-2 h-12 text-base font-semibold shadow-lg shadow-secondary/20 ${
                            justAdded
                              ? "bg-emerald-500 text-white hover:bg-emerald-500"
                              : inCart
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          }`}
                        >
                          {justAdded ? (
                            <><Check className="w-5 h-5" /> {t.added}</>
                          ) : inCart ? (
                            <><ShoppingCart className="w-5 h-5" /> {t.inCart}</>
                          ) : (
                            <><ShoppingCart className="w-5 h-5" /> {t.addToCart}</>
                          )}
                        </Button>
                      )}
                      {course.syllabusUrl && (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => window.open(course.syllabusUrl!, "_blank")}
                          className="gap-2 h-12 text-base"
                        >
                          <BookOpen className="w-4 h-4" />
                          {t.syllabus}
                        </Button>
                      )}
                    </div>

                    <div className="mt-5 pt-5 border-t border-border/50 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                      {course.certification && (
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          {t.certIncluded}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        {isArabic ? "تواصل مباشر مع الفريق" : "Direct support"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        {isArabic ? "رد خلال 24 ساعة" : "Reply within 24 hours"}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {description && (
                    <div className="mb-10">
                      <h2 className="text-xs font-semibold text-secondary mb-3 uppercase tracking-[0.15em]">
                        {t.description}
                      </h2>
                      <div className="prose prose-invert max-w-none">
                        <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-line">
                          {description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div>
                    <h2 className="text-xs font-semibold text-secondary mb-4 uppercase tracking-[0.15em]">
                      {t.details}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DetailRow icon={Layers} label={t.delivery} value={t.deliveries[course.delivery]} />
                      <DetailRow icon={Award} label={t.level} value={t.levels[course.level]} />
                      <DetailRow icon={Globe} label={t.language} value={t.languages[course.language]} />
                      {course.instructor && (
                        <DetailRow icon={User} label={t.by} value={course.instructor} />
                      )}
                      {course.upcomingDate && (
                        <DetailRow icon={Calendar} label={t.upcoming} value={course.upcomingDate} />
                      )}
                      {course.location && (
                        <DetailRow icon={MapPin} label={t.location} value={course.location} />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </>
      )}

      <SiteFooter />
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-start gap-1 p-3 rounded-xl border backdrop-blur-sm ${
        accent
          ? "bg-secondary/10 border-secondary/30"
          : "bg-card/60 border-border"
      }`}
    >
      <Icon className={`w-4 h-4 ${accent ? "text-secondary" : "text-muted-foreground"}`} />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground truncate w-full">{value}</div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="group flex items-center gap-4 p-4 bg-card/60 backdrop-blur-sm border border-border rounded-xl hover:border-secondary/40 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20 transition-colors">
        <Icon className="w-4 h-4 text-secondary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </div>
        <div className="text-sm text-foreground font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}
