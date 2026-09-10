import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Search, MapPin, Briefcase, Clock, ArrowLeft, ChevronDown, X, Filter,
  Upload, Loader2, CheckCircle2,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { AdminFab } from "@/components/store/admin-fab";

type Job = {
  id: number; titleAr: string; titleEn: string; deptAr: string; deptEn: string;
  locationAr: string; locationEn: string; type: string; typeAr: string; typeEn: string;
  posted: string; remote: boolean; descAr: string; descEn: string; skillsAr: string[]; skillsEn: string[]; category: string;
};

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  consulting: { ar: "الاستشارات", en: "Consulting" },
  digital: { ar: "التحول الرقمي", en: "Digital" },
  academy: { ar: "الأكاديمية", en: "Academy" },
  research: { ar: "البحث والنشر", en: "Research" },
  management: { ar: "الإدارة", en: "Management" },
};
const CATEGORY_ORDER = ["consulting", "digital", "academy", "research", "management"];

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  "full-time": { ar: "دوام كامل", en: "Full-time" },
  "part-time": { ar: "دوام جزئي", en: "Part-time" },
  contract: { ar: "عقد", en: "Contract" },
  internship: { ar: "تدريب", en: "Internship" },
};
const TYPE_ORDER = ["full-time", "part-time", "contract", "internship"];

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function Careers() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingJobs(true);
    fetch("/api/jobs", { credentials: "include" })
      .then(r => (r.ok ? r.json() : []))
      .then((data: Job[]) => {
        if (!cancelled) {
          setJobs(Array.isArray(data) ? data : []);
          setLoadingJobs(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJobs([]);
          setLoadingJobs(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const categoryOptions = useMemo(() => {
    const present = new Set(jobs.map((j) => j.category).filter(Boolean));
    const known = CATEGORY_ORDER.filter((c) => present.has(c));
    const extras = [...present].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    const all = [...known, ...extras];
    return [
      { id: "all", labelAr: "جميع الوظائف", labelEn: "All Positions" },
      ...all.map((id) => ({
        id,
        labelAr: CATEGORY_LABELS[id]?.ar ?? id,
        labelEn: CATEGORY_LABELS[id]?.en ?? id,
      })),
    ];
  }, [jobs]);

  const locationOptions = useMemo(() => {
    const map = new Map<string, { labelAr: string; labelEn: string }>();
    for (const j of jobs) {
      const key = (j.locationEn || j.locationAr || "").trim();
      if (key && !map.has(key)) {
        map.set(key, { labelAr: j.locationAr || key, labelEn: j.locationEn || key });
      }
    }
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const opts = [
      { id: "all", labelAr: "كل المواقع", labelEn: "All Locations" },
      ...sorted.map(([id, lbl]) => ({ id, labelAr: lbl.labelAr, labelEn: lbl.labelEn })),
    ];
    if (jobs.some((j) => j.remote)) {
      opts.push({ id: "__remote__", labelAr: "عن بُعد", labelEn: "Remote" });
    }
    return opts;
  }, [jobs]);

  const typeOptions = useMemo(() => {
    const present = new Set(jobs.map((j) => j.type).filter(Boolean));
    const known = TYPE_ORDER.filter((t) => present.has(t));
    const extras = [...present].filter((t) => !TYPE_ORDER.includes(t)).sort();
    const all = [...known, ...extras];
    return [
      { id: "all", labelAr: "كل الأنواع", labelEn: "All Types" },
      ...all.map((id) => ({
        id,
        labelAr: TYPE_LABELS[id]?.ar ?? id,
        labelEn: TYPE_LABELS[id]?.en ?? id,
      })),
    ];
  }, [jobs]);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const title = isAr ? j.titleAr : j.titleEn;
      const dept = isAr ? j.deptAr : j.deptEn;
      const matchSearch =
        !search ||
        title.toLowerCase().includes(search.toLowerCase()) ||
        dept.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "all" || j.category === category;
      const matchLoc =
        location === "all" ||
        (location === "__remote__" && j.remote) ||
        j.locationEn === location ||
        j.locationAr === location;
      const matchType = typeFilter === "all" || j.type === typeFilter;
      return matchSearch && matchCat && matchLoc && matchType;
    });
  }, [jobs, search, category, location, typeFilter, isAr]);

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setLocation("all");
    setTypeFilter("all");
  };

  const hasFilters = search || category !== "all" || location !== "all" || typeFilter !== "all";

  const [applyJob, setApplyJob] = useState<Job | null>(null);

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-br from-[hsl(150_40%_95%)] via-[hsl(150_44%_92%)] to-[hsl(152_46%_86%)]">
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="text-xs font-bold tracking-[0.25em] uppercase text-muted-foreground mb-4 flex items-center gap-2">
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
              {isAr ? "الرئيسية" : "Home"}
            </Link>
            <span className="text-border">/</span>
            <span className="text-primary">{isAr ? "الوظائف" : "Careers"}</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-medium text-foreground leading-[1.12] mb-6"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontFamily: isAr
                ? "'IBM Plex Sans Arabic', sans-serif"
                : "Georgia, 'Times New Roman', 'Noto Serif', serif",
            }}
          >
            {isAr ? "انضم إلى فريقنا" : "Join Our Team"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-2xl mb-10 leading-relaxed"
          >
            {isAr
              ? "كن جزءاً من مؤسسة رائدة تجمع بين المرجعية الشرعية والاحتراف الإداري — وشارك في بناء منظومة المستقبل."
              : "Be part of a leading institution that combines Sharia authority with managerial excellence — and participate in building the future."}
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex gap-2 max-w-2xl"
          >
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 start-4 text-muted-foreground" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? "ابحث عن وظيفة، قسم، مهارة..." : "Search by title, department, skill..."}
                className="w-full bg-white border border-border text-foreground placeholder:text-muted-foreground ps-12 pe-4 py-4 text-sm focus:outline-none focus:border-primary transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute top-1/2 -translate-y-1/2 end-4 text-muted-foreground hover:text-primary transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
            <button className="px-8 py-4 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors whitespace-nowrap">
              {isAr ? "بحث" : "Search"}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Filters + Results */}
      <section className="py-12 bg-background islamic-pattern">
        <div className="container mx-auto px-6 md:px-12">

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="flex items-center gap-2 text-sm text-foreground/50 font-medium">
              <Filter size={16} />
              {isAr ? "تصفية:" : "Filter:"}
            </div>

            {/* Category */}
            <div className="relative group/cat">
              <button className="flex items-center gap-1.5 px-4 py-2 border border-border text-sm font-medium hover:border-secondary hover:text-secondary transition-colors bg-background">
                {(categoryOptions.find(c => c.id === category) ?? categoryOptions[0])?.[isAr ? "labelAr" : "labelEn"]}
                <ChevronDown size={14} />
              </button>
              <div className="absolute top-full start-0 mt-1 w-44 bg-background border border-border shadow-xl opacity-0 invisible group-hover/cat:opacity-100 group-hover/cat:visible transition-all duration-150 z-20">
                {categoryOptions.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`block w-full text-start px-4 py-2.5 text-sm hover:bg-secondary/10 hover:text-secondary transition-colors ${category === c.id ? "text-secondary font-bold bg-secondary/5" : "text-foreground/70"}`}
                  >
                    {isAr ? c.labelAr : c.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="relative group/loc">
              <button className="flex items-center gap-1.5 px-4 py-2 border border-border text-sm font-medium hover:border-secondary hover:text-secondary transition-colors bg-background">
                <MapPin size={14} />
                {(locationOptions.find(l => l.id === location) ?? locationOptions[0])?.[isAr ? "labelAr" : "labelEn"]}
                <ChevronDown size={14} />
              </button>
              <div className="absolute top-full start-0 mt-1 w-56 bg-background border border-border shadow-xl opacity-0 invisible group-hover/loc:opacity-100 group-hover/loc:visible transition-all duration-150 z-20 max-h-72 overflow-y-auto">
                {locationOptions.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setLocation(l.id)}
                    className={`block w-full text-start px-4 py-2.5 text-sm hover:bg-secondary/10 hover:text-secondary transition-colors ${location === l.id ? "text-secondary font-bold bg-secondary/5" : "text-foreground/70"}`}
                  >
                    {isAr ? l.labelAr : l.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="relative group/type">
              <button className="flex items-center gap-1.5 px-4 py-2 border border-border text-sm font-medium hover:border-secondary hover:text-secondary transition-colors bg-background">
                <Clock size={14} />
                {(typeOptions.find(t => t.id === typeFilter) ?? typeOptions[0])?.[isAr ? "labelAr" : "labelEn"]}
                <ChevronDown size={14} />
              </button>
              <div className="absolute top-full start-0 mt-1 w-44 bg-background border border-border shadow-xl opacity-0 invisible group-hover/type:opacity-100 group-hover/type:visible transition-all duration-150 z-20">
                {typeOptions.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTypeFilter(t.id)}
                    className={`block w-full text-start px-4 py-2.5 text-sm hover:bg-secondary/10 hover:text-secondary transition-colors ${typeFilter === t.id ? "text-secondary font-bold bg-secondary/5" : "text-foreground/70"}`}
                  >
                    {isAr ? t.labelAr : t.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-foreground/40 hover:text-secondary transition-colors"
              >
                <X size={14} />
                {isAr ? "مسح الكل" : "Clear all"}
              </button>
            )}

            <span className="ms-auto text-sm text-foreground/40">
              {filtered.length} {isAr ? "وظيفة" : "positions"}
            </span>
          </div>

          {/* Job grid */}
          {loadingJobs ? (
            <div className="text-center py-20 text-foreground/40">
              <Loader2 size={32} className="mx-auto mb-3 animate-spin text-secondary" />
              <p className="text-sm">{isAr ? "جارٍ تحميل الوظائف..." : "Loading positions..."}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-foreground/30">
              <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">
                {jobs.length === 0
                  ? (isAr ? "لا توجد وظائف متاحة حالياً" : "No open positions at the moment")
                  : (isAr ? "لا توجد نتائج" : "No results found")}
              </p>
              {jobs.length > 0 && (
                <button onClick={clearFilters} className="mt-4 text-secondary text-sm hover:underline">
                  {isAr ? "مسح الفلاتر" : "Clear filters"}
                </button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group border border-border bg-card p-6 hover:border-secondary/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold text-secondary/70 uppercase tracking-widest">
                        {isAr ? job.deptAr : job.deptEn}
                      </span>
                      <h3 className="text-lg font-black text-foreground mt-1 group-hover:text-secondary transition-colors">
                        {isAr ? job.titleAr : job.titleEn}
                      </h3>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 shrink-0 ms-4 ${
                      job.type === "full-time"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-secondary/10 text-secondary border border-secondary/20"
                    }`}>
                      {isAr ? job.typeAr : job.typeEn}
                    </span>
                  </div>

                  <p className="text-sm text-foreground/60 mb-4 leading-relaxed line-clamp-2">
                    {isAr ? job.descAr : job.descEn}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {(isAr ? job.skillsAr : job.skillsEn).map(s => (
                      <span key={s} className="text-xs px-2 py-1 bg-muted text-foreground/60 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-4 text-xs text-foreground/40">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {isAr ? job.locationAr : job.locationEn}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {daysSince(job.posted) === 0
                          ? (isAr ? "اليوم" : "Today")
                          : `${daysSince(job.posted)} ${isAr ? "يوم" : "days ago"}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApplyJob(job)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold hover:bg-secondary hover:text-primary transition-colors"
                    >
                      {isAr ? "تقدّم الآن" : "Apply Now"}
                      <ArrowLeft size={12} className={isAr ? "rotate-180" : ""} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#F4ECD7] py-16 mt-8">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-primary mb-4">
            {isAr ? "لم تجد ما تبحث عنه؟" : "Didn't find what you're looking for?"}
          </h2>
          <p className="text-primary/60 mb-8 max-w-xl mx-auto">
            {isAr
              ? "أرسل لنا سيرتك الذاتية وسنتواصل معك عند توفر الفرصة المناسبة."
              : "Send us your CV and we'll reach out when the right opportunity arises."}
          </p>
          <a
            href="mailto:careers@darnozom.com"
            className="inline-flex items-center gap-2 px-8 py-4 bg-secondary text-primary font-bold text-sm hover:bg-secondary/90 transition-colors"
          >
            {isAr ? "أرسل سيرتك الذاتية" : "Send Your CV"}
            <ArrowLeft size={16} className={isAr ? "rotate-180" : ""} />
          </a>
        </div>
      </section>

      {applyJob && (
        <ApplyDialog job={applyJob} isAr={isAr} onClose={() => setApplyJob(null)} />
      )}

      <AdminFab href="/admin/jobs" label={{ ar: "إضافة وظيفة", en: "Add Job" }} />
    </div>
  );
}

function ApplyDialog({ job, isAr, onClose }: { job: Job; isAr: boolean; onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [years, setYears] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const ALLOWED_EXT = ["pdf", "doc", "docx"];
  const MAX_SIZE = 10 * 1024 * 1024;

  function pickFile(f: File | null) {
    setError("");
    if (!f) { setResume(null); return; }
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXT.includes(ext)) {
      setError(isAr ? "الصيغ المسموحة: PDF / DOC / DOCX" : "Allowed formats: PDF / DOC / DOCX");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError(isAr ? "حجم الملف يتجاوز 10 ميجابايت" : "File exceeds 10 MB");
      return;
    }
    setResume(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!resume) {
      setError(isAr ? "يُرجى رفع السيرة الذاتية" : "Please upload your resume");
      return;
    }
    setStatus("submitting");
    try {
      const fd = new FormData();
      fd.append("jobId", String(job.id));
      fd.append("jobTitleAr", job.titleAr);
      fd.append("jobTitleEn", job.titleEn);
      fd.append("fullName", fullName);
      fd.append("email", email);
      fd.append("phone", phone);
      if (years) fd.append("yearsExperience", years);
      if (coverLetter) fd.append("coverLetter", coverLetter);
      fd.append("resume", resume);
      const res = await fetch("/api/job-applications", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Failed");
      }
      setStatus("success");
    } catch (err) {
      setError((err as Error).message || (isAr ? "فشل إرسال الطلب" : "Failed to submit"));
      setStatus("idle");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="bg-background w-full max-w-xl my-8 border border-border shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 end-3 text-foreground/40 hover:text-secondary p-1"
          aria-label={isAr ? "إغلاق" : "Close"}
        >
          <X size={18} />
        </button>

        {status === "success" ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-xl font-black text-primary mb-2">
              {isAr ? "تم استلام طلبك" : "Application Received"}
            </h3>
            <p className="text-sm text-foreground/60 mb-6">
              {isAr
                ? "شكراً لتقديمك. سيقوم فريقنا بمراجعة طلبك والتواصل معك قريباً."
                : "Thank you for applying. Our team will review your application and contact you soon."}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary hover:text-primary transition-colors"
            >
              {isAr ? "إغلاق" : "Close"}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 md:p-8">
            <div className="mb-5 pb-4 border-b border-border">
              <div className="text-xs font-bold text-secondary/80 uppercase tracking-widest mb-1">
                {isAr ? "التقدّم لوظيفة" : "Apply for"}
              </div>
              <h3 className="text-lg font-black text-primary">{isAr ? job.titleAr : job.titleEn}</h3>
              <p className="text-xs text-foreground/50 mt-1">
                {isAr ? job.deptAr : job.deptEn} · {isAr ? job.locationAr : job.locationEn}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground/60 mb-1.5">
                  {isAr ? "الاسم الكامل" : "Full Name"} *
                </label>
                <input
                  required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-secondary"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/60 mb-1.5">
                    {isAr ? "البريد الإلكتروني" : "Email"} *
                  </label>
                  <input
                    required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/60 mb-1.5">
                    {isAr ? "رقم الجوال" : "Phone"} *
                  </label>
                  <input
                    required dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground/60 mb-1.5">
                  {isAr ? "سنوات الخبرة" : "Years of Experience"}
                </label>
                <input
                  type="number" min={0} max={80} dir="ltr" value={years}
                  onChange={(e) => setYears(e.target.value)}
                  className="w-full border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground/60 mb-1.5">
                  {isAr ? "نبذة تعريفية / رسالة تغطية" : "Cover Letter / Brief"}
                </label>
                <textarea
                  rows={4} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-secondary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground/60 mb-1.5">
                  {isAr ? "السيرة الذاتية (PDF / DOC / DOCX، حتى 10 ميجا)" : "Resume (PDF / DOC / DOCX, up to 10 MB)"} *
                </label>
                <label className="flex items-center justify-between gap-3 border border-dashed border-border bg-muted/30 px-4 py-3 text-sm cursor-pointer hover:border-secondary">
                  <span className="flex items-center gap-2 text-foreground/70 truncate">
                    <Upload size={14} />
                    {resume ? resume.name : (isAr ? "اختر ملفاً..." : "Choose file...")}
                  </span>
                  <span className="text-xs font-bold text-secondary shrink-0">
                    {isAr ? "تصفح" : "Browse"}
                  </span>
                  <input
                    type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button" onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-foreground/60 hover:text-foreground"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit" disabled={status === "submitting"}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary hover:text-primary transition-colors disabled:opacity-60"
              >
                {status === "submitting" && <Loader2 size={14} className="animate-spin" />}
                {status === "submitting"
                  ? (isAr ? "جارٍ الإرسال..." : "Submitting...")
                  : (isAr ? "إرسال الطلب" : "Submit Application")}
              </button>
            </div>
          </form>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
