import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  CalendarDays, ArrowLeft, MapPin, Clock, Tag, Mail, Loader2
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { FetchError } from "@/components/fetch-error";

const API_BASE = "/api";

interface EventItem {
  id: number;
  titleAr: string;
  titleEn: string;
  dateAr: string;
  dateEn: string;
  timeAr: string | null;
  timeEn: string | null;
  locationAr: string | null;
  locationEn: string | null;
  categoryAr: string | null;
  categoryEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  status: "upcoming" | "past";
  createdAt: string;
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  "ورشة عمل": "bg-secondary/20 text-secondary border-secondary/30",
  "Workshop": "bg-secondary/20 text-secondary border-secondary/30",
  "مؤتمر": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Conference": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "برنامج تدريبي": "bg-green-500/10 text-green-400 border-green-500/20",
  "Training Program": "bg-green-500/10 text-green-400 border-green-500/20",
  "ندوة": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Seminar": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "إطلاق": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Launch": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLOR_MAP[category] ?? "bg-secondary/20 text-secondary border-secondary/30";
}

function EventCard({ event, index }: { event: EventItem; index: number }) {
  const { language, isArabic } = useLanguage();
  const title = language === "ar" ? event.titleAr : event.titleEn;
  const date = language === "ar" ? event.dateAr : event.dateEn;
  const time = language === "ar" ? event.timeAr : event.timeEn;
  const location = language === "ar" ? event.locationAr : event.locationEn;
  const category = language === "ar" ? event.categoryAr : event.categoryEn;
  const desc = language === "ar" ? event.descriptionAr : event.descriptionEn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`border ${event.status === "upcoming" ? "border-secondary/20 dark bg-[#0F3D2E]" : "border-secondary/15 bg-card"} p-6 md:p-8 group hover:border-secondary/40 transition-colors`}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className={`shrink-0 w-20 h-20 flex flex-col items-center justify-center border ${event.status === "upcoming" ? "border-secondary/30 bg-secondary/5" : "border-border bg-background"}`}>
          <CalendarDays className={`w-6 h-6 mb-1 ${event.status === "upcoming" ? "text-secondary" : "text-muted-foreground"}`} />
          <span className={`text-[10px] font-bold text-center leading-tight ${event.status === "upcoming" ? "text-white/60" : "text-muted-foreground"}`}>
            {date.split(" ").slice(0, 2).join(" ")}
          </span>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {category && (
              <span className={`text-xs font-bold px-3 py-1 border rounded-none ${getCategoryColor(category)}`}>
                {category}
              </span>
            )}
            {event.status === "past" && (
              <span className="text-xs text-muted-foreground border border-border px-3 py-1">
                {isArabic ? "منتهي" : "Past"}
              </span>
            )}
          </div>

          <h3 className={`font-black text-xl mb-3 ${event.status === "upcoming" ? "text-white" : "text-primary"}`}>
            {title}
          </h3>

          {desc && (
            <p className={`text-sm leading-relaxed mb-4 ${event.status === "upcoming" ? "text-white/60" : "text-muted-foreground"}`}>
              {desc}
            </p>
          )}

          <div className={`flex flex-wrap gap-4 text-xs ${event.status === "upcoming" ? "text-white/40" : "text-muted-foreground"}`}>
            {time && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-secondary" />
                <span>{time}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-secondary" />
                <span>{location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-secondary" />
              <span>{date}</span>
            </div>
          </div>
        </div>

        {event.status === "upcoming" && (
          <div className="shrink-0">
            <a
              href={`https://wa.me/201022044240?text=${isArabic ? `أرغب في التسجيل في فعالية: ${event.titleAr}` : `I'd like to register for the event: ${event.titleEn}`}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-secondary text-primary px-5 py-3 font-bold text-sm hover:bg-secondary/90 transition-colors whitespace-nowrap group/btn"
            >
              {isArabic ? "سجّل الآن" : "Register Now"}
              <ArrowLeft className="w-3.5 h-3.5 group-hover/btn:-translate-x-1 transition-transform" />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Events() {
  const { language, isArabic } = useLanguage();
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadEvents = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/events`)
      .then(r => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(data => setAllEvents(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const upcomingEvents = allEvents.filter(e => e.status === "upcoming");
  const pastEvents = allEvents.filter(e => e.status === "past");

  const T = {
    ar: {
      dir: "rtl" as const,
      breadcrumbHome: "الرئيسية",
      breadcrumbEvents: "الفعاليات",
      heroLabel: "Events & Workshops",
      heroTitle: "فعاليات دار نظم",
      heroDesc: "ورش عمل وبرامج تدريبية وندوات ومؤتمرات — نُقدّم محطات معرفية متخصصة تجمع بين العمق الشرعي والاحترافية الإدارية لتطوير الأفراد والمؤسسات.",
      upcomingLabel: "Upcoming",
      upcomingTitle: "الفعاليات القادمة",
      upcomingCount: (n: number) => `${n} فعالية قادمة`,
      pastLabel: "Past Events",
      pastTitle: "الفعاليات السابقة",
      pastCount: (n: number) => `${n} فعاليات منتهية`,
      noUpcoming: "لا توجد فعاليات قادمة حالياً",
      noPast: "لا توجد فعاليات سابقة",
      noEvents: "لا توجد فعاليات حالياً",
      stayUpdatedBadge: "لا تفوّت أي فعالية",
      stayUpdatedTitle: "ابقَ على اطلاع دائم",
      stayUpdatedDesc: "تواصل معنا عبر واتساب لتسجيل اهتمامك وتلقّي إشعارات بالفعاليات والبرامج القادمة.",
      whatsapp: "تواصل عبر واتساب",
      email: "راسلنا بالبريد",
      backHome: "العودة إلى الرئيسية",
      toAcademy: "أكاديمية دار نظم ←",
      copyright: "جميع الحقوق محفوظة",
      loading: "جارٍ التحميل...",
    },
    en: {
      dir: "ltr" as const,
      breadcrumbHome: "Home",
      breadcrumbEvents: "Events",
      heroLabel: "Events & Workshops",
      heroTitle: "DarNozom Events",
      heroDesc: "Workshops, training programs, seminars, and conferences — specialized knowledge sessions combining Islamic depth with managerial excellence to develop individuals and organizations.",
      upcomingLabel: "Upcoming",
      upcomingTitle: "Upcoming Events",
      upcomingCount: (n: number) => `${n} upcoming event${n !== 1 ? "s" : ""}`,
      pastLabel: "Past Events",
      pastTitle: "Past Events",
      pastCount: (n: number) => `${n} past event${n !== 1 ? "s" : ""}`,
      noUpcoming: "No upcoming events at the moment",
      noPast: "No past events",
      noEvents: "No events at the moment",
      stayUpdatedBadge: "Don't Miss Any Event",
      stayUpdatedTitle: "Stay Updated",
      stayUpdatedDesc: "Contact us on WhatsApp to register your interest and receive notifications about upcoming events and programs.",
      whatsapp: "Contact via WhatsApp",
      email: "Email Us",
      backHome: "Back to Home",
      toAcademy: "DarNozom Academy →",
      copyright: "All rights reserved",
      loading: "Loading...",
    },
  };

  const t = T[language];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={t.dir}>
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden bg-gradient-to-br from-[hsl(150_40%_95%)] via-[hsl(150_44%_92%)] to-[hsl(152_46%_86%)]">
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-muted-foreground text-xs mb-10 uppercase tracking-widest"
          >
            <Link href="/" className="hover:text-primary transition-colors">{t.breadcrumbHome}</Link>
            <span className="text-border">·</span>
            <span className="text-primary">{t.breadcrumbEvents}</span>
          </motion.div>

          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="h-px w-10 bg-primary/40" />
              <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">{t.heroLabel}</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-5 mb-6"
            >
              <CalendarDays className="w-14 h-14 text-primary shrink-0" />
              <h1 
                className="font-medium text-foreground leading-[1.12]"
                style={{
                  fontSize: "clamp(2.5rem, 5vw, 4.25rem)",
                  fontFamily: language === "ar"
                    ? "'IBM Plex Sans Arabic', sans-serif"
                    : "Georgia, 'Times New Roman', 'Noto Serif', serif",
                }}
              >
                {t.heroTitle}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-lg max-w-2xl leading-relaxed"
            >
              {t.heroDesc}
            </motion.p>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="py-32 dark bg-[#0F3D2E] flex items-center justify-center gap-3 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t.loading}</span>
        </section>
      ) : error ? (
        <section className="py-32 dark bg-[#0F3D2E] border-b border-secondary/10">
          <div className="container mx-auto px-6 md:px-12">
            <FetchError onRetry={loadEvents} />
          </div>
        </section>
      ) : allEvents.length === 0 ? (
        <section className="py-32 dark bg-[#0F3D2E] border-b border-secondary/10">
          <div className="container mx-auto px-6 md:px-12 text-center">
            <CalendarDays className="w-16 h-16 text-secondary/30 mx-auto mb-6" />
            <p className="text-white/40 text-xl font-bold">{t.noEvents}</p>
          </div>
        </section>
      ) : (
        <>
          {/* Upcoming Events */}
          <section className="py-24 dark bg-[#0F3D2E] border-b border-secondary/10">
            <div className="container mx-auto px-6 md:px-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-between mb-12"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px w-10 bg-secondary" />
                    <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.upcomingLabel}</span>
                  </div>
                  <h2 className="font-black text-white leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
                    {t.upcomingTitle}
                  </h2>
                </div>
                <div className="hidden md:flex items-center gap-2 text-white/30 text-sm">
                  <span>{t.upcomingCount(upcomingEvents.length)}</span>
                </div>
              </motion.div>

              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <p>{t.noUpcoming}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event, i) => (
                    <EventCard key={event.id} event={event} index={i} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <section className="py-24 bg-background islamic-pattern">
              <div className="container mx-auto px-6 md:px-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center justify-between mb-12"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px w-10 bg-secondary" />
                      <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.pastLabel}</span>
                    </div>
                    <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
                      {t.pastTitle}
                    </h2>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-muted-foreground text-sm">
                    <span>{t.pastCount(pastEvents.length)}</span>
                  </div>
                </motion.div>

                <div className="space-y-4">
                  {pastEvents.map((event, i) => (
                    <EventCard key={event.id} event={event} index={i} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Newsletter / Stay Updated */}
      <section className="py-20 dark bg-[#0F3D2E] border-t border-secondary/20">
        <div className="container mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="flex justify-center mb-5">
              <span className="text-secondary text-xs font-bold tracking-[0.25em] uppercase border border-secondary/30 px-4 py-2">
                {t.stayUpdatedBadge}
              </span>
            </div>
            <h2 className="font-black text-white text-3xl mb-4">{t.stayUpdatedTitle}</h2>
            <p className="text-white/50 mb-8 leading-relaxed">
              {t.stayUpdatedDesc}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href={`https://wa.me/201022044240?text=${isArabic ? "أرغب في متابعة فعاليات دار نظم" : "I'd like to follow DarNozom events"}`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-bold text-base hover:bg-secondary/90 transition-all"
              >
                {t.whatsapp}
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </a>
              <a
                href={`mailto:info@darnozom.com?subject=${isArabic ? "اشتراك في نشرة الفعاليات" : "Event Newsletter Subscription"}`}
                className="flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
              >
                <Mail className="w-4 h-4" />
                {t.email}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Back */}
      <section className="py-10 border-t border-border bg-[#F4ECD7]">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-primary hover:text-secondary transition-colors font-semibold group"
          >
            <ArrowLeft size={18} className="group-hover:translate-x-[-4px] transition-transform" />
            <span>{t.backHome}</span>
          </Link>
          <Link
            href="/academy"
            className="text-sm text-muted-foreground hover:text-primary transition-colors border border-border px-4 py-2 hover:border-primary"
          >
            {t.toAcademy}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
