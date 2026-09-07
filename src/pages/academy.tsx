import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, CheckCircle2, ArrowLeft, ArrowRight, Mail, Phone,
  BookOpen, Users, Award, Star, ChevronLeft, Plus, X,
  Loader2, AlertTriangle, Calendar, Clock, UserCheck,
  DollarSign, List, Megaphone, ExternalLink, Trash2, Image,
  Compass, Layers, Crown, Cpu, Sparkles, Building2, Globe2,
  Target, Lightbulb, Workflow, Network, ScrollText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SiteNav from "@/components/site-nav";
import { PROGRAMS as PROGRAMS_DATA } from "@/lib/site-content";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const API_BASE = "/api";
const ADMIN_PASSWORD = "darnozom2024";
const ADMIN_SECRET = "darnozom2024";

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Admin-Secret": ADMIN_SECRET,
  };
}

const TRACK_LABELS: Record<string, { ar: string; en: string }> = {
  islamic: { ar: "أنظمة الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance Systems" },
  management: { ar: "الإدارة المهنية", en: "Professional Management" },
  training: { ar: "التدريب", en: "Training" },
  other: { ar: "أخرى", en: "Other" },
};

const OTHER_LABEL = TRACK_LABELS.other;
function trackLabel(track: string | null | undefined, language: "ar" | "en"): string {
  if (!track) return OTHER_LABEL[language];
  return (TRACK_LABELS[track] ?? OTHER_LABEL)[language];
}

const LEVEL_LABELS: Record<string, { ar: string; en: string }> = {
  beginner: { ar: "مبتدئ", en: "Beginner" },
  intermediate: { ar: "متوسط", en: "Intermediate" },
  advanced: { ar: "متقدم", en: "Advanced" },
  all: { ar: "جميع المستويات", en: "All Levels" },
};

interface T {
  dir: "rtl" | "ltr";
  breadcrumbHome: string;
  breadcrumbAcademy: string;
  heroTitle: string;
  heroDesc: string;
  adminLogout: string;
  adminLogin: string;
  availableCoursesSection: string;
  availableCoursesTitle: string;
  addCourse: string;
  loading: string;
  noCourses: string;
  noCoursesDesc: string;
  coursesFull: string;
  seatsLeft: (n: number) => string;
  registerNow: string;
  registrants: string;
  programsTitle: string;
  whyTitle: string;
  enrollmentReady: string;
  enrollmentDesc: string;
  enrollCta: string;
  emailCta: string;
  contactTitle: string;
  contactDesc: string;
  contactWhatsapp: string;
  backHome: string;
  academyEvents: string;
  copyright: string;
  whatsappLink: string;
  announcementsSection: string;
  announcementsTitle: string;
  addAnnouncement: string;
  noAnnouncements: string;
  noAnnouncementsDesc: string;
  registerLink: string;
  deleteAnnouncement: string;
  confirmDelete: string;
  addAnnouncementModal: {
    title: string;
    titleArLabel: string;
    titleArPlaceholder: string;
    titleEnLabel: string;
    descArLabel: string;
    descArPlaceholder: string;
    descEnLabel: string;
    priceLabel: string;
    pricePlaceholder: string;
    startDateLabel: string;
    startDatePlaceholder: string;
    imageUrlLabel: string;
    imageUrlPlaceholder: string;
    registrationUrlLabel: string;
    registrationUrlPlaceholder: string;
    saving: string;
    save: string;
    cancel: string;
    failedAdd: string;
    serverError: string;
  };
  addCourseModal: {
    title: string;
    titleArLabel: string;
    titleArPlaceholder: string;
    titleEnLabel: string;
    descArLabel: string;
    descArPlaceholder: string;
    descEnLabel: string;
    trackLabel: string;
    levelLabel: string;
    durationLabel: string;
    durationPlaceholder: string;
    seatsLabel: string;
    priceLabel: string;
    pricePlaceholder: string;
    startDateLabel: string;
    startDatePlaceholder: string;
    saving: string;
    save: string;
    cancel: string;
    failedAdd: string;
    serverError: string;
  };
  registerModal: {
    title: string;
    successTitle: string;
    successDesc: (courseTitle: string) => string;
    close: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    emailLabel: string;
    phoneLabel: string;
    orgLabel: string;
    orgPlaceholder: string;
    submitting: string;
    submit: string;
    cancel: string;
    failedReg: string;
    serverError: string;
  };
  regsModal: {
    title: string;
    loading: string;
    noRegs: string;
    totalRegs: (n: number) => string;
    failedLoad: string;
    serverError: string;
  };
  adminLoginModal: {
    title: string;
    subtitle: string;
    passwordPlaceholder: string;
    wrongPassword: string;
    submit: string;
  };
}

const translations: Record<"ar" | "en", T> = {
  ar: {
    dir: "rtl",
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    heroTitle: "أول أكاديمية قيادية تُكامل القيم والإدارة والتحول الرقمي",
    heroDesc: "أكاديمية دار نظم تُعِدّ المهنيين والمديرين والقيادات التنفيذية عبر منظومة برامج تجمع بين أنظمة الحوكمة والامتثال الشرعي والإدارة المهنية والتحول الرقمي، وتختتم ببرنامج رائد متكامل يدمج الأبعاد الثلاثة في تجربة قيادية واحدة.",
    adminLogout: "خروج المشرف",
    adminLogin: "دخول المشرف",
    availableCoursesSection: "Available Courses",
    availableCoursesTitle: "الدورات المتاحة",
    addCourse: "إضافة دورة جديدة",
    loading: "جارٍ التحميل...",
    noCourses: "لا توجد دورات متاحة حاليًا",
    noCoursesDesc: "تابعونا قريبًا لمعرفة الدورات القادمة",
    coursesFull: "مكتملة",
    seatsLeft: (n) => `${n} مقعد متاح`,
    registerNow: "سجّل الآن",
    registrants: "المسجلون",
    programsTitle: "مسارات الأكاديمية",
    whyTitle: "لماذا أكاديمية دار نظم؟",
    enrollmentReady: "هل أنت مستعد للانضمام؟",
    enrollmentDesc: "سجّل اهتمامك الآن وسيتواصل معك فريق الأكاديمية لإرشادك نحو البرنامج الأنسب لأهدافك المهنية.",
    enrollCta: "سجّل اهتمامك الآن",
    emailCta: "راسلنا بالبريد",
    contactTitle: "تواصل مع الأكاديمية",
    contactDesc: "للاستفسار عن البرامج وجداول التدريب والرسوم، تواصل معنا مباشرة.",
    contactWhatsapp: "تواصل عبر واتساب",
    backHome: "العودة إلى الرئيسية",
    academyEvents: "فعاليات الأكاديمية",
    copyright: "جميع الحقوق محفوظة",
    whatsappLink: "https://wa.me/201022044240?text=أرغب في الاستفسار عن برامج أكاديمية دار نظم",
    announcementsSection: "إعلانات الكورسات",
    announcementsTitle: "إعلانات الكورسات",
    addAnnouncement: "إضافة إعلان",
    noAnnouncements: "لا توجد إعلانات حاليًا",
    noAnnouncementsDesc: "تابعونا قريبًا للاطلاع على إعلانات الدورات القادمة",
    registerLink: "سجّل عبر الرابط",
    deleteAnnouncement: "حذف الإعلان",
    confirmDelete: "هل أنت متأكد من حذف هذا الإعلان؟",
    addAnnouncementModal: {
      title: "إضافة إعلان جديد",
      titleArLabel: "العنوان بالعربية *",
      titleArPlaceholder: "عنوان الإعلان بالعربية",
      titleEnLabel: "العنوان بالإنجليزية *",
      descArLabel: "الوصف بالعربية",
      descArPlaceholder: "وصف الإعلان بالعربية",
      descEnLabel: "الوصف بالإنجليزية",
      priceLabel: "السعر (اختياري)",
      pricePlaceholder: "مثل: 2000 ريال",
      startDateLabel: "تاريخ البدء",
      startDatePlaceholder: "مثل: 15 مايو 2025",
      imageUrlLabel: "رابط الصورة (اختياري)",
      imageUrlPlaceholder: "https://...",
      registrationUrlLabel: "رابط التسجيل (اختياري)",
      registrationUrlPlaceholder: "https://...",
      saving: "جارٍ الإضافة...",
      save: "نشر الإعلان",
      cancel: "إلغاء",
      failedAdd: "فشل في إضافة الإعلان",
      serverError: "خطأ في الاتصال بالخادم",
    },
    addCourseModal: {
      title: "إضافة دورة جديدة",
      titleArLabel: "العنوان بالعربية *",
      titleArPlaceholder: "عنوان الدورة بالعربية",
      titleEnLabel: "العنوان بالإنجليزية *",
      descArLabel: "الوصف بالعربية",
      descArPlaceholder: "وصف الدورة بالعربية",
      descEnLabel: "الوصف بالإنجليزية",
      trackLabel: "المسار / الفئة",
      levelLabel: "المستوى",
      durationLabel: "المدة",
      durationPlaceholder: "مثل: 5 أيام",
      seatsLabel: "عدد المقاعد",
      priceLabel: "السعر (اختياري)",
      pricePlaceholder: "مثل: 2000 ريال",
      startDateLabel: "تاريخ البدء",
      startDatePlaceholder: "مثل: 15 مايو 2025",
      saving: "جارٍ الإضافة...",
      save: "إضافة الدورة",
      cancel: "إلغاء",
      failedAdd: "فشل في إضافة الدورة",
      serverError: "خطأ في الاتصال بالخادم",
    },
    registerModal: {
      title: "التسجيل في الدورة",
      successTitle: "تم التسجيل بنجاح!",
      successDesc: (t) => `شكرًا لتسجيلك في دورة "${t}". سيتواصل معك فريقنا قريبًا.`,
      close: "إغلاق",
      fullNameLabel: "الاسم الكامل *",
      fullNamePlaceholder: "الاسم الكامل",
      emailLabel: "البريد الإلكتروني *",
      phoneLabel: "رقم الهاتف *",
      orgLabel: "المنظمة / الجهة (اختياري)",
      orgPlaceholder: "اسم المنظمة أو الجهة",
      submitting: "جارٍ التسجيل...",
      submit: "تسجيل الآن",
      cancel: "إلغاء",
      failedReg: "فشل في التسجيل",
      serverError: "خطأ في الاتصال بالخادم",
    },
    regsModal: {
      title: "المسجلون في الدورة",
      loading: "جارٍ التحميل...",
      noRegs: "لا يوجد مسجلون بعد",
      totalRegs: (n) => `إجمالي المسجلين: ${n}`,
      failedLoad: "فشل في تحميل التسجيلات",
      serverError: "خطأ في الاتصال بالخادم",
    },
    adminLoginModal: {
      title: "دخول المشرف",
      subtitle: "Academy Admin",
      passwordPlaceholder: "كلمة المرور",
      wrongPassword: "كلمة المرور غير صحيحة",
      submit: "دخول",
    },
  },
  en: {
    dir: "ltr",
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    heroTitle: "The First Leadership Academy Integrating Values, Management, and Digital Transformation",
    heroDesc: "DarNozom Academy prepares professionals, managers, and executive leaders through an ecosystem of programs combining Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation — capped by a flagship integrated diploma that fuses all three dimensions into one leadership experience.",
    adminLogout: "Admin Logout",
    adminLogin: "Admin Login",
    availableCoursesSection: "Available Courses",
    availableCoursesTitle: "Available Courses",
    addCourse: "Add New Course",
    loading: "Loading...",
    noCourses: "No courses available yet",
    noCoursesDesc: "Stay tuned for upcoming courses",
    coursesFull: "Full",
    seatsLeft: (n) => `${n} seat${n !== 1 ? "s" : ""} left`,
    registerNow: "Register Now",
    registrants: "Registrants",
    programsTitle: "Academy Tracks",
    whyTitle: "Why DarNozom Academy?",
    enrollmentReady: "Ready to Join?",
    enrollmentDesc: "Express your interest now and the Academy team will reach out to guide you toward the program best suited for your professional goals.",
    enrollCta: "Express Interest Now",
    emailCta: "Email Us",
    contactTitle: "Contact the Academy",
    contactDesc: "For inquiries about programs, training schedules, and fees, contact us directly.",
    contactWhatsapp: "Contact via WhatsApp",
    backHome: "Back to Home",
    academyEvents: "Academy Events",
    copyright: "All rights reserved",
    whatsappLink: "https://wa.me/201022044240?text=I'm interested in DarNozom Academy programs",
    announcementsSection: "Course Announcements",
    announcementsTitle: "Course Announcements",
    addAnnouncement: "Add Announcement",
    noAnnouncements: "No announcements yet",
    noAnnouncementsDesc: "Stay tuned for upcoming course announcements",
    registerLink: "Register via Link",
    deleteAnnouncement: "Delete Announcement",
    confirmDelete: "Are you sure you want to delete this announcement?",
    addAnnouncementModal: {
      title: "Add New Announcement",
      titleArLabel: "Arabic Title *",
      titleArPlaceholder: "Announcement title in Arabic",
      titleEnLabel: "English Title *",
      descArLabel: "Arabic Description",
      descArPlaceholder: "Announcement description in Arabic",
      descEnLabel: "English Description",
      priceLabel: "Price (optional)",
      pricePlaceholder: "e.g. 2000 SAR",
      startDateLabel: "Start Date",
      startDatePlaceholder: "e.g. May 15, 2025",
      imageUrlLabel: "Image URL (optional)",
      imageUrlPlaceholder: "https://...",
      registrationUrlLabel: "Registration URL (optional)",
      registrationUrlPlaceholder: "https://...",
      saving: "Publishing...",
      save: "Publish Announcement",
      cancel: "Cancel",
      failedAdd: "Failed to add announcement",
      serverError: "Server connection error",
    },
    addCourseModal: {
      title: "Add New Course",
      titleArLabel: "Arabic Title *",
      titleArPlaceholder: "Course title in Arabic",
      titleEnLabel: "English Title *",
      descArLabel: "Arabic Description",
      descArPlaceholder: "Course description in Arabic",
      descEnLabel: "English Description",
      trackLabel: "Track / Category",
      levelLabel: "Level",
      durationLabel: "Duration",
      durationPlaceholder: "e.g. 5 days",
      seatsLabel: "Number of Seats",
      priceLabel: "Price (optional)",
      pricePlaceholder: "e.g. 2000 SAR",
      startDateLabel: "Start Date",
      startDatePlaceholder: "e.g. May 15, 2025",
      saving: "Saving...",
      save: "Add Course",
      cancel: "Cancel",
      failedAdd: "Failed to add course",
      serverError: "Server connection error",
    },
    registerModal: {
      title: "Course Registration",
      successTitle: "Registration Successful!",
      successDesc: (t) => `Thank you for registering for "${t}". Our team will contact you soon.`,
      close: "Close",
      fullNameLabel: "Full Name *",
      fullNamePlaceholder: "Full Name",
      emailLabel: "Email Address *",
      phoneLabel: "Phone Number *",
      orgLabel: "Organization (optional)",
      orgPlaceholder: "Organization name",
      submitting: "Registering...",
      submit: "Register Now",
      cancel: "Cancel",
      failedReg: "Registration failed",
      serverError: "Server connection error",
    },
    regsModal: {
      title: "Course Registrants",
      loading: "Loading...",
      noRegs: "No registrants yet",
      totalRegs: (n) => `Total Registrants: ${n}`,
      failedLoad: "Failed to load registrations",
      serverError: "Server connection error",
    },
    adminLoginModal: {
      title: "Admin Login",
      subtitle: "Academy Admin",
      passwordPlaceholder: "Password",
      wrongPassword: "Incorrect password",
      submit: "Login",
    },
  },
};

interface Course {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  track: string | null;
  level: string | null;
  duration: string | null;
  seats: number;
  price: string | null;
  startDate: string | null;
  createdAt: string;
  registrationCount: number;
}

interface Registration {
  id: number;
  courseId: number;
  fullName: string;
  email: string;
  phone: string;
  organization: string | null;
  registeredAt: string;
}

interface Announcement {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  price: string | null;
  startDate: string | null;
  imageUrl: string | null;
  registrationUrl: string | null;
  createdAt: string;
}

function useAdminAuth() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("academy_admin_authed") === "1");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  function login() {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("academy_admin_authed", "1");
      setAuthed(true);
      setError(false);
      setShowLogin(false);
    } else {
      setError(true);
    }
  }

  function logout() {
    sessionStorage.removeItem("academy_admin_authed");
    setAuthed(false);
  }

  return { authed, password, setPassword, login, logout, error, showLogin, setShowLogin };
}

const EMPTY_ANNOUNCEMENT = {
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  price: "",
  startDate: "",
  imageUrl: "",
  registrationUrl: "",
};

interface AddAnnouncementModalProps {
  onClose: () => void;
  onSaved: () => void;
  t: T;
  language: "ar" | "en";
}

function AddAnnouncementModal({ onClose, onSaved, t, language }: AddAnnouncementModalProps) {
  const [form, setForm] = useState(EMPTY_ANNOUNCEMENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/academy/announcements`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          titleAr: form.titleAr,
          titleEn: form.titleEn,
          descriptionAr: form.descriptionAr || null,
          descriptionEn: form.descriptionEn || null,
          price: form.price || null,
          startDate: form.startDate || null,
          imageUrl: form.imageUrl || null,
          registrationUrl: form.registrationUrl || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setError(err.error || t.addAnnouncementModal.failedAdd);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError(t.addAnnouncementModal.serverError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir={t.dir}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-secondary/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="h-1 bg-secondary" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-secondary" />
              <h2 className="text-xl font-black text-primary">{t.addAnnouncementModal.title}</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-primary">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addAnnouncementModal.titleArLabel}</label>
                <Input value={form.titleAr} onChange={e => set("titleAr", e.target.value)} required placeholder={t.addAnnouncementModal.titleArPlaceholder} className="rounded-none" dir="rtl" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addAnnouncementModal.titleEnLabel}</label>
                <Input value={form.titleEn} onChange={e => set("titleEn", e.target.value)} required placeholder="Announcement title in English" className="rounded-none" dir="ltr" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addAnnouncementModal.descArLabel}</label>
              <Textarea value={form.descriptionAr} onChange={e => set("descriptionAr", e.target.value)} placeholder={t.addAnnouncementModal.descArPlaceholder} rows={3} className="rounded-none" dir="rtl" />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addAnnouncementModal.descEnLabel}</label>
              <Textarea value={form.descriptionEn} onChange={e => set("descriptionEn", e.target.value)} placeholder="Announcement description in English" rows={2} className="rounded-none" dir="ltr" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addAnnouncementModal.priceLabel}</label>
                <Input value={form.price} onChange={e => set("price", e.target.value)} placeholder={t.addAnnouncementModal.pricePlaceholder} className="rounded-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addAnnouncementModal.startDateLabel}</label>
                <Input value={form.startDate} onChange={e => set("startDate", e.target.value)} placeholder={t.addAnnouncementModal.startDatePlaceholder} className="rounded-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addAnnouncementModal.imageUrlLabel}</label>
              <Input value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} placeholder={t.addAnnouncementModal.imageUrlPlaceholder} className="rounded-none" dir="ltr" />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addAnnouncementModal.registrationUrlLabel}</label>
              <Input value={form.registrationUrl} onChange={e => set("registrationUrl", e.target.value)} placeholder={t.addAnnouncementModal.registrationUrlPlaceholder} className="rounded-none" dir="ltr" />
            </div>

            {error && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertTriangle size={14} /> {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} className="gap-2 rounded-none font-bold">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                {saving ? t.addAnnouncementModal.saving : t.addAnnouncementModal.save}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="rounded-none">{t.addAnnouncementModal.cancel}</Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

const EMPTY_COURSE = {
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  track: "islamic",
  level: "intermediate",
  duration: "",
  seats: 20,
  price: "",
  startDate: "",
};

interface AddCourseModalProps {
  onClose: () => void;
  onSaved: () => void;
  t: T;
  language: "ar" | "en";
}

function AddCourseModal({ onClose, onSaved, t, language }: AddCourseModalProps) {
  const [form, setForm] = useState(EMPTY_COURSE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/academy/courses`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ ...form, seats: Number(form.seats) }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setError(err.error || t.addCourseModal.failedAdd);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError(t.addCourseModal.serverError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir={t.dir}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-secondary/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="h-1 bg-secondary" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-primary">{t.addCourseModal.title}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-primary">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.titleArLabel}</label>
                <Input value={form.titleAr} onChange={e => set("titleAr", e.target.value)} required placeholder={t.addCourseModal.titleArPlaceholder} className="rounded-none" dir="rtl" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.titleEnLabel}</label>
                <Input value={form.titleEn} onChange={e => set("titleEn", e.target.value)} required placeholder="Course Title in English" className="rounded-none" dir="ltr" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.descArLabel}</label>
              <Textarea value={form.descriptionAr} onChange={e => set("descriptionAr", e.target.value)} placeholder={t.addCourseModal.descArPlaceholder} rows={3} className="rounded-none" dir="rtl" />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.descEnLabel}</label>
              <Textarea value={form.descriptionEn} onChange={e => set("descriptionEn", e.target.value)} placeholder="Course description in English" rows={2} className="rounded-none" dir="ltr" />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.trackLabel}</label>
                <select
                  value={form.track}
                  onChange={e => set("track", e.target.value)}
                  className="w-full border border-input bg-background px-3 py-2 text-sm rounded-none"
                >
                  {Object.entries(TRACK_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label[language]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.levelLabel}</label>
                <select
                  value={form.level}
                  onChange={e => set("level", e.target.value)}
                  className="w-full border border-input bg-background px-3 py-2 text-sm rounded-none"
                >
                  {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label[language]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.durationLabel}</label>
                <Input value={form.duration} onChange={e => set("duration", e.target.value)} placeholder={t.addCourseModal.durationPlaceholder} className="rounded-none" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.seatsLabel}</label>
                <Input type="number" min={0} value={form.seats} onChange={e => set("seats", e.target.value)} className="rounded-none" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.priceLabel}</label>
                <Input value={form.price} onChange={e => set("price", e.target.value)} placeholder={t.addCourseModal.pricePlaceholder} className="rounded-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.addCourseModal.startDateLabel}</label>
                <Input value={form.startDate} onChange={e => set("startDate", e.target.value)} placeholder={t.addCourseModal.startDatePlaceholder} className="rounded-none" />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertTriangle size={14} /> {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} className="gap-2 rounded-none font-bold">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? t.addCourseModal.saving : t.addCourseModal.save}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="rounded-none">{t.addCourseModal.cancel}</Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

interface RegisterModalProps {
  course: Course;
  onClose: () => void;
  onSuccess: () => void;
  t: T;
  language: "ar" | "en";
}

function RegisterModal({ course, onClose, onSuccess, t, language }: RegisterModalProps) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", organization: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/academy/courses/${course.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setError(err.error || t.registerModal.failedReg);
        return;
      }
      setSuccess(true);
      onSuccess();
    } catch {
      setError(t.registerModal.serverError);
    } finally {
      setSubmitting(false);
    }
  }

  const courseTitle = language === "ar" ? course.titleAr : (course.titleEn || course.titleAr);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir={t.dir}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-secondary/30 w-full max-w-md"
      >
        <div className="h-1 bg-secondary" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-primary">{t.registerModal.title}</h2>
              <p className="text-muted-foreground text-sm">{courseTitle}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-primary">
              <X size={20} />
            </button>
          </div>

          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-black text-primary mb-2">{t.registerModal.successTitle}</h3>
              <p className="text-muted-foreground text-sm mb-6">
                {t.registerModal.successDesc(courseTitle)}
              </p>
              <Button onClick={onClose} className="rounded-none font-bold">{t.registerModal.close}</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.registerModal.fullNameLabel}</label>
                <Input value={form.fullName} onChange={e => set("fullName", e.target.value)} required placeholder={t.registerModal.fullNamePlaceholder} className="rounded-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.registerModal.emailLabel}</label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} required placeholder="example@email.com" className="rounded-none" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.registerModal.phoneLabel}</label>
                <Input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} required placeholder="+966 5x xxx xxxx" className="rounded-none" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">{t.registerModal.orgLabel}</label>
                <Input value={form.organization} onChange={e => set("organization", e.target.value)} placeholder={t.registerModal.orgPlaceholder} className="rounded-none" />
              </div>

              {error && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertTriangle size={14} /> {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="gap-2 rounded-none font-bold flex-1">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                  {submitting ? t.registerModal.submitting : t.registerModal.submit}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="rounded-none">{t.registerModal.cancel}</Button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface RegistrationsModalProps {
  course: Course;
  onClose: () => void;
  t: T;
  language: "ar" | "en";
}

function RegistrationsModal({ course, onClose, t, language }: RegistrationsModalProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchRegs() {
      try {
        const r = await fetch(`${API_BASE}/academy/courses/${course.id}/registrations`, {
          headers: adminHeaders(),
        });
        if (!r.ok) {
          setError(t.regsModal.failedLoad);
          return;
        }
        const data = await r.json();
        setRegistrations(data);
      } catch {
        setError(t.regsModal.serverError);
      } finally {
        setLoading(false);
      }
    }
    fetchRegs();
  }, [course.id]);

  const courseTitle = language === "ar" ? course.titleAr : (course.titleEn || course.titleAr);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir={t.dir}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-secondary/30 w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="h-1 bg-secondary" />
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">{t.regsModal.title}</h2>
              <p className="text-muted-foreground text-sm">{courseTitle}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-primary">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" /> {t.regsModal.loading}
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : registrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t.regsModal.noRegs}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-bold text-muted-foreground mb-4">
                {t.regsModal.totalRegs(registrations.length)}
              </div>
              {registrations.map((reg, i) => (
                <div key={reg.id} className="border border-border p-4 bg-muted/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-primary">{reg.fullName}</div>
                      <div className="text-sm text-muted-foreground mt-1 space-y-1">
                        <div dir="ltr">{reg.email}</div>
                        <div dir="ltr">{reg.phone}</div>
                        {reg.organization && <div>{reg.organization}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-left shrink-0">
                      #{i + 1}
                      <div className="mt-1">{new Date(reg.registeredAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface CourseCardProps {
  course: Course;
  isAdmin: boolean;
  onRegister: (course: Course) => void;
  onViewRegistrations: (course: Course) => void;
  t: T;
  language: "ar" | "en";
}

function CourseCard({ course, isAdmin, onRegister, onViewRegistrations, t, language }: CourseCardProps) {
  const seatsLeft = course.seats > 0 ? course.seats - course.registrationCount : null;
  const isFull = seatsLeft !== null && seatsLeft <= 0;
  const courseTitle = language === "ar" ? course.titleAr : (course.titleEn || course.titleAr);
  const courseSubtitle = language === "ar" ? course.titleEn : course.titleAr;
  const courseDesc = language === "ar"
    ? course.descriptionAr
    : (course.descriptionEn || course.descriptionAr);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-background border border-border hover:border-secondary/50 transition-all flex flex-col"
    >
      <div className="p-6 flex-1">
        {course.track && (
          <div className="inline-flex items-center gap-1 bg-secondary/10 text-primary text-[10px] font-bold tracking-widest uppercase px-2 py-1 mb-4">
            {trackLabel(course.track, language)}
          </div>
        )}
        <h3 className="font-black text-primary text-lg mb-1 leading-snug">{courseTitle}</h3>
        {courseSubtitle && <p className="text-muted-foreground text-xs mb-4 font-medium">{courseSubtitle}</p>}
        {courseDesc && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{courseDesc}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {course.level && (
            <div className="flex items-center gap-1">
              <Award size={12} className="text-secondary shrink-0" />
              <span>{(LEVEL_LABELS[course.level] ?? { ar: course.level, en: course.level })[language]}</span>
            </div>
          )}
          {course.duration && (
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-secondary shrink-0" />
              <span>{course.duration}</span>
            </div>
          )}
          {course.startDate && (
            <div className="flex items-center gap-1">
              <Calendar size={12} className="text-secondary shrink-0" />
              <span>{course.startDate}</span>
            </div>
          )}
          {course.seats > 0 && (
            <div className={`flex items-center gap-1 ${isFull ? "text-red-500" : ""}`}>
              <Users size={12} className={`shrink-0 ${isFull ? "text-red-500" : "text-secondary"}`} />
              <span>{isFull ? t.coursesFull : t.seatsLeft(seatsLeft!)}</span>
            </div>
          )}
          {course.price && (
            <div className="flex items-center gap-1">
              <DollarSign size={12} className="text-secondary shrink-0" />
              <span>{course.price}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border flex items-center gap-2">
        <Button
          onClick={() => onRegister(course)}
          disabled={isFull}
          className="rounded-none font-bold text-sm flex-1"
          size="sm"
        >
          {isFull ? t.coursesFull : t.registerNow}
        </Button>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewRegistrations(course)}
            className="rounded-none gap-1 text-xs"
          >
            <List size={12} />
            {t.registrants} ({course.registrationCount})
          </Button>
        )}
      </div>
    </motion.div>
  );
}

interface AdminLoginOverlayProps {
  onClose: () => void;
  password: string;
  setPassword: (p: string) => void;
  login: () => void;
  error: boolean;
  t: T;
}

function AdminLoginOverlay({ onClose, password, setPassword, login, error, t }: AdminLoginOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir={t.dir}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-secondary/30 p-8 w-full max-w-sm"
      >
        <div className="h-1 bg-secondary mb-6" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-black text-primary">{t.adminLoginModal.title}</div>
            <div className="text-muted-foreground text-xs">{t.adminLoginModal.subtitle}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-primary"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder={t.adminLoginModal.passwordPlaceholder}
            className="rounded-none"
          />
          {error && <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={12} />{t.adminLoginModal.wrongPassword}</p>}
          <Button onClick={login} className="w-full rounded-none font-bold">{t.adminLoginModal.submit}</Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Academy() {
  const { language, isArabic } = useLanguage();
  const t = translations[language];
  const { authed, password, setPassword, login, logout, error: loginError, showLogin, setShowLogin } = useAdminAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [registerCourse, setRegisterCourse] = useState<Course | null>(null);
  const [viewRegsCourse, setViewRegsCourse] = useState<Course | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [activeTrack, setActiveTrack] = useState<string>("all");

  async function fetchCourses() {
    setCoursesLoading(true);
    try {
      const r = await fetch(`${API_BASE}/academy/courses`);
      const data = await r.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  }

  async function fetchAnnouncements() {
    setAnnouncementsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/academy/announcements`);
      const data = await r.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  }

  async function deleteAnnouncement(id: number) {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await fetch(`${API_BASE}/academy/announcements/${id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      fetchAnnouncements();
    } catch {
    }
  }

  useEffect(() => {
    fetchCourses();
    fetchAnnouncements();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={t.dir}>
      <SiteNav mode="page" />

      <AnimatePresence>
        {showLogin && !authed && (
          <AdminLoginOverlay
            onClose={() => setShowLogin(false)}
            password={password}
            setPassword={setPassword}
            login={login}
            error={loginError}
            t={t}
          />
        )}
        {showAddCourse && (
          <AddCourseModal
            onClose={() => setShowAddCourse(false)}
            onSaved={fetchCourses}
            t={t}
            language={language}
          />
        )}
        {showAddAnnouncement && (
          <AddAnnouncementModal
            onClose={() => setShowAddAnnouncement(false)}
            onSaved={fetchAnnouncements}
            t={t}
            language={language}
          />
        )}
        {registerCourse && (
          <RegisterModal
            course={registerCourse}
            onClose={() => setRegisterCourse(null)}
            onSuccess={fetchCourses}
            t={t}
            language={language}
          />
        )}
        {viewRegsCourse && (
          <RegistrationsModal
            course={viewRegsCourse}
            onClose={() => setViewRegsCourse(null)}
            t={t}
            language={language}
          />
        )}
      </AnimatePresence>

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
            <span className="text-primary">{t.breadcrumbAcademy}</span>
          </motion.div>

          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="h-px w-10 bg-primary/40" />
              <span className="text-primary text-xs font-bold tracking-[0.2em] uppercase">{language === "ar" ? "أكاديمية دار نظم" : "DarNozom Academy"}</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-5 mb-6"
            >
              <GraduationCap className="w-14 h-14 text-primary shrink-0" />
              <h1 
                className="font-medium text-foreground leading-[1.12]"
                style={{
                  fontSize: "clamp(2.5rem, 5vw, 4rem)",
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <a
                href="#programs"
                className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-4 font-bold text-base hover:bg-primary/90 transition-all"
                data-testid="link-explore-programs"
              >
                {language === "ar" ? "تصفّح البرامج" : "Explore Programs"}
                <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
              </a>
              <Link
                href="/academy/apply"
                className="inline-flex items-center gap-3 border border-primary/30 text-primary px-7 py-4 font-bold text-base hover:border-primary transition-colors"
                data-testid="link-hero-apply"
              >
                {language === "ar" ? "قدّم الآن" : "Apply Now"}
                <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex items-center gap-3"
            >
              {authed ? (
                <button
                  onClick={logout}
                  className="text-muted-foreground text-xs hover:text-primary transition-colors border border-border px-3 py-1"
                >
                  {t.adminLogout}
                </button>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-muted-foreground/60 text-xs hover:text-primary transition-colors"
                >
                  {t.adminLogin}
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-20 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12 max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{language === "ar" ? "نبذة عن الأكاديمية" : "About the Academy"}</span>
          </div>
          <h2 className="font-black text-primary leading-tight mb-6" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            {language === "ar" ? "قيم إسلامية · قيادة · إدارة · تحول رقمي" : "Islamic Values · Leadership · Management · Digital Transformation"}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mb-4">
            {language === "ar"
              ? "أكاديمية دار نظم هي الذراع التعليمية لمجموعة دار نظم. نُعِدّ المهنيين والمديرين والقيادات التنفيذية عبر منظومة برامج تجمع بين القيم الإسلامية وأنظمة الحوكمة والامتثال الشرعي والإدارة المهنية والتحول الرقمي، وتختتم ببرنامج رائد متكامل يدمج هذه الأبعاد في تجربة قيادية واحدة."
              : "DarNozom Academy is the educational arm of the DarNozom Group. We prepare professionals, managers, and executive leaders through an ecosystem of programs combining Islamic Values, Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation — capped by a flagship integrated diploma that fuses these dimensions into one leadership experience."}
          </p>
          <p className="text-muted-foreground text-base leading-relaxed max-w-3xl">
            {language === "ar"
              ? "تستهدف الأكاديمية الشركات، المنظمات غير الربحية، والقطاع الحكومي، عبر منهج موحّد قابل للتطبيق في القطاعات الثلاثة."
              : "The Academy serves corporates, non-profits, and the public sector through one unified curriculum applicable across all three domains."}
          </p>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-24 bg-background islamic-pattern border-b border-border" id="programs">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{language === "ar" ? "البرامج" : "Programs"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {language === "ar" ? "برامج الأكاديمية" : "Academy Programs"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {language === "ar" ? "أربعة برامج رئيسية · ١٩+ دبلومًا متخصصًا · ٤٤+ كورسًا تدريبيًا — ثلاثة مسارات متخصصة ودبلوم متكامل رائد." : "Four core programs · 19+ specialized diplomas · 44+ training courses — three specialized tracks and one flagship integrated diploma."}
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/academy/diplomas"
                data-testid="browse-all-diplomas"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase hover:bg-primary/90 transition-colors"
              >
                {language === "ar" ? "كل الدبلومات" : "All Diplomas"}
                <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
              </Link>
              <Link
                href="/academy/courses"
                data-testid="browse-all-courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-xs font-bold tracking-widest uppercase hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {language === "ar" ? "كل الكورسات" : "All Courses"}
                <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROGRAMS_DATA.map((p, i) => {
              const Icon = p.id === "islamic" ? Star : p.id === "management" ? Award : p.id === "digital" ? Cpu : Crown;
              const flagshipStyle = p.flagship
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-primary border-border";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className={`border ${flagshipStyle} hover:border-secondary transition-all p-6 flex flex-col`}
                  data-testid={`program-card-${p.id}`}
                >
                  {p.flagship && (
                    <div className="inline-flex items-center gap-1 bg-secondary text-primary px-2 py-1 text-[9px] font-black tracking-[0.2em] uppercase self-start mb-3">
                      <Sparkles size={10} />
                      {language === "ar" ? "البرنامج الرائد" : "Flagship"}
                    </div>
                  )}
                  <Icon className="w-8 h-8 text-secondary mb-4" strokeWidth={1.5} />
                  <div className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-60 ${p.flagship ? "text-primary-foreground" : "text-primary"}`}>
                    {p.subtitle[language]}
                  </div>
                  <h3 className={`font-black text-lg mb-2 leading-snug ${p.flagship ? "text-white" : "text-primary"}`}>
                    {p.title[language]}
                  </h3>
                  {p.tagline && (
                    <div className="text-xs font-bold mb-3 text-secondary">{p.tagline[language]}</div>
                  )}
                  <p className={`text-sm leading-relaxed flex-1 mb-5 ${p.flagship ? "text-white/70" : "text-muted-foreground"}`}>
                    {p.desc[language]}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={p.href}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors ${
                        p.flagship
                          ? "bg-secondary text-primary hover:bg-secondary/90"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {language === "ar" ? "تصفّح البرنامج" : "Explore Program"}
                      <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
                    </Link>
                    <Link
                      href={`/academy/register?program=${p.id}`}
                      data-testid={`apply-program-${p.id}`}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold tracking-widest uppercase border transition-colors ${
                        p.flagship
                          ? "border-white/30 text-white hover:border-secondary hover:text-secondary"
                          : "border-border text-primary hover:border-secondary hover:text-secondary"
                      }`}
                    >
                      {language === "ar" ? "قدّم الآن" : "Apply Now"}
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Career Paths Summary */}
      <section className="py-24 bg-background islamic-pattern border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{language === "ar" ? "المسارات المهنية" : "Career Paths"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {language === "ar" ? "ثلاثة مسارات لتطوير المهنيين والقادة" : "Three Paths to Develop Professionals & Leaders"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {language === "ar"
                ? "اختر المسار الأنسب لمرحلتك المهنية: من التأسيس المهني إلى القيادة الإدارية، ثم القيادة التنفيذية للمؤسسة."
                : "Choose the path that fits your career stage: from professional foundation to managerial leadership and executive institutional command."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              {
                code: "01",
                icon: Compass,
                ar: "مسار بداية المسيرة المهنية",
                en: "Early Career Path",
                whoAr: "للخريجين الجدد والمهنيين في بداية مسيرتهم.",
                whoEn: "For graduates and early-career professionals.",
              },
              {
                code: "02",
                icon: Layers,
                ar: "المسار الإداري",
                en: "Managerial Path",
                whoAr: "لقادة الفرق والمديرين الوظيفيين.",
                whoEn: "For team leaders and functional managers.",
              },
              {
                code: "03",
                icon: Crown,
                ar: "المسار التنفيذي",
                en: "Executive Path",
                whoAr: "للقيادات التنفيذية والرؤساء التنفيذيين ورواد الأعمال.",
                whoEn: "For senior leaders, CEOs, and entrepreneurs.",
              },
            ].map((p, i) => (
              <motion.div
                key={p.code}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-background border border-border hover:border-secondary/60 transition-all p-7 flex flex-col"
              >
                <div className="flex items-center justify-between mb-5">
                  <p.icon className="w-9 h-9 text-secondary" strokeWidth={1.5} />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">{p.code}</span>
                </div>
                <h3 className="font-black text-primary text-xl mb-3 leading-snug">{language === "ar" ? p.ar : p.en}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{language === "ar" ? p.whoAr : p.whoEn}</p>
              </motion.div>
            ))}
          </div>

          <Link
            href="/academy/career-paths"
            className="inline-flex items-center gap-2 text-sm font-bold tracking-wider uppercase text-primary hover:text-secondary transition-colors group"
            data-testid="link-explore-career-paths"
          >
            <span>{language === "ar" ? "استكشف المسارات الثلاثة بالتفصيل" : "Explore all three paths in detail"}</span>
            <ArrowRight className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${isArabic ? "rotate-180 group-hover:-translate-x-1 group-hover:translate-x-0" : ""}`} />
          </Link>
        </div>
      </section>

      {/* Learning Journey */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{language === "ar" ? "رحلة التعلم" : "Learning Journey"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {language === "ar" ? "تأسيس · إدارة · قيادة تنفيذية" : "Foundation · Management · Executive"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {language === "ar"
                ? "كل برنامج في الأكاديمية يتدرّج عبر ثلاثة مستويات موحّدة، ليأخذك من التأسيس إلى القيادة التنفيذية."
                : "Every Academy program follows the same three-level ladder, taking you from foundation to executive leadership."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { code: "01", icon: Compass, ar: "التأسيس", en: "Foundation", descAr: "بناء الأساس المعرفي والمهني وتنمية قيادة الذات.", descEn: "Build core knowledge, professional skills, and self-leadership." },
              { code: "02", icon: Layers, ar: "الإدارة", en: "Management", descAr: "تشغيل الفرق والإدارات والوظائف عبر مجالات الأعمال.", descEn: "Operate teams, departments, and functions across business domains." },
              { code: "03", icon: Crown, ar: "القيادة التنفيذية", en: "Executive", descAr: "صياغة الاستراتيجية، التصميم المؤسسي، وقيادة التحول.", descEn: "Shape strategy, design the organization, and lead transformation." },
            ].map((step, i) => (
              <motion.div
                key={step.code}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-background border border-border hover:border-secondary/50 transition-all p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-5">
                  <step.icon className="w-9 h-9 text-secondary" strokeWidth={1.5} />
                  <span className="text-primary font-black text-3xl leading-none opacity-15">{step.code}</span>
                </div>
                <div className="text-secondary text-[10px] font-bold tracking-[0.2em] uppercase mb-2">{language === "ar" ? `المستوى ${step.code}` : `Level ${step.code}`}</div>
                <h3 className="font-black text-primary text-xl mb-3 leading-snug">{language === "ar" ? step.ar : step.en}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{language === "ar" ? step.descAr : step.descEn}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-24 bg-background islamic-pattern border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{language === "ar" ? "المخرجات" : "Outcomes"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {language === "ar" ? "خرّيج أكاديمية دار نظم" : "The DarNozom Academy Graduate"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {language === "ar"
                ? "كفاءات قادرة على القيادة المؤسسية بمنطق متكامل: قِيَم شرعية، إدارة احترافية، وأدوات رقمية."
                : "Talent able to lead institutions with an integrated mindset: Sharia values, professional management, and digital tools."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { ar: "قائد تنفيذي يفكر بمنطق متكامل: قيمة + إدارة + تقنية.", en: "An executive leader who thinks integrally: values + management + technology." },
              { ar: "مدير قادر على قيادة الفرق وتشغيل العمليات والمشاريع باحتراف.", en: "A manager able to lead teams and run operations and projects professionally." },
              { ar: "متخصص شرعي يبني وحدات الحوكمة والامتثال والتمويل الإسلامي.", en: "A Sharia specialist who builds governance, compliance, and Islamic finance units." },
              { ar: "كفاءة رقمية تقود التحول وتوظّف البيانات والذكاء الاصطناعي.", en: "A digital professional who leads transformation and applies data and AI." },
              { ar: "خرّيج قادر على العمل عبر القطاعات: شركات · غير ربحي · حكومي.", en: "A graduate effective across all three sectors: corporate, non-profit, government." },
              { ar: "شبكة قيادية فاعلة من خرّيجي الأكاديمية.", en: "An active leadership network of Academy alumni." },
            ].map((o, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 bg-background border border-border p-5"
              >
                <CheckCircle2 size={20} className="text-secondary shrink-0 mt-0.5" />
                <div className="text-primary leading-relaxed font-semibold">{language === "ar" ? o.ar : o.en}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Model */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{language === "ar" ? "نموذج التقديم" : "Delivery Model"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {language === "ar" ? "كيف تُقدَّم البرامج" : "How Programs Are Delivered"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {language === "ar"
                ? "كل مستوى له صيغة وبنية ومدة ولغة محددة، تناسب الأفراد والمؤسسات."
                : "Each level has a defined format, structure, language, and duration — suitable for both individuals and institutions."}
            </p>
          </div>

          {/* Per-level Format / Structure / Language / Duration */}
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {[
              {
                code: "L1",
                titleAr: "المستوى الأول — التأسيس",
                titleEn: "Level 1 — Foundation",
                formatAr: "حضوري · عن بُعد · مدمج",
                formatEn: "In-person · Online · Blended",
                structureAr: "وحدات تأسيسية + ورش تطبيقية + تقييم نهائي",
                structureEn: "Foundation modules + applied workshops + final assessment",
                languageAr: "العربية (ومواد مرجعية بالإنجليزية)",
                languageEn: "Arabic (with English reference materials)",
                durationAr: "٨–١٢ أسبوعًا",
                durationEn: "8–12 weeks",
              },
              {
                code: "L2",
                titleAr: "المستوى الثاني — الإدارة",
                titleEn: "Level 2 — Management",
                formatAr: "حضوري · عن بُعد · مدمج",
                formatEn: "In-person · Online · Blended",
                structureAr: "محاور متقدمة + دراسات حالة + مشاريع تطبيقية",
                structureEn: "Advanced tracks + case studies + applied projects",
                languageAr: "العربية / الإنجليزية حسب الفوج",
                languageEn: "Arabic / English per cohort",
                durationAr: "١٢–١٦ أسبوعًا",
                durationEn: "12–16 weeks",
              },
              {
                code: "L3",
                titleAr: "المستوى الثالث — القيادة التنفيذية",
                titleEn: "Level 3 — Executive",
                formatAr: "حضوري مكثّف · مدمج · تدريب مؤسسي",
                formatEn: "Intensive in-person · Blended · Institutional",
                structureAr: "ورش قيادية + إرشاد تنفيذي + مشروع تكامل",
                structureEn: "Leadership labs + executive mentoring + integration project",
                languageAr: "العربية / الإنجليزية",
                languageEn: "Arabic / English",
                durationAr: "١٦–٢٤ أسبوعًا",
                durationEn: "16–24 weeks",
              },
            ].map((lvl, i) => (
              <motion.div
                key={lvl.code}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-card border border-secondary/15 p-6 flex flex-col"
                data-testid={`delivery-level-${lvl.code}`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="text-secondary text-[10px] font-bold tracking-[0.2em] uppercase">
                    {language === "ar" ? `المستوى ${lvl.code.replace("L", "")}` : `Level ${lvl.code.replace("L", "")}`}
                  </div>
                  <div className="text-primary font-black text-3xl leading-none opacity-20">{lvl.code}</div>
                </div>
                <h3 className="font-black text-primary text-lg mb-5 leading-snug">{language === "ar" ? lvl.titleAr : lvl.titleEn}</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-1">{language === "ar" ? "الصيغة" : "Format"}</dt>
                    <dd className="text-foreground/85 leading-relaxed">{language === "ar" ? lvl.formatAr : lvl.formatEn}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-1">{language === "ar" ? "البنية" : "Structure"}</dt>
                    <dd className="text-foreground/85 leading-relaxed">{language === "ar" ? lvl.structureAr : lvl.structureEn}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-1">{language === "ar" ? "اللغة" : "Language"}</dt>
                    <dd className="text-foreground/85 leading-relaxed">{language === "ar" ? lvl.languageAr : lvl.languageEn}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-1">{language === "ar" ? "المدة" : "Duration"}</dt>
                    <dd className="text-foreground/85 leading-relaxed">{language === "ar" ? lvl.durationAr : lvl.durationEn}</dd>
                  </div>
                </dl>
              </motion.div>
            ))}
          </div>

          {/* Modality summary */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, ar: "حضوري", en: "In-Person", descAr: "ورش وفصول حضورية في مقار الأكاديمية أو لدى المؤسسات.", descEn: "Workshops and classrooms at Academy venues or hosted at the institution." },
              { icon: Globe2, ar: "عن بُعد", en: "Online", descAr: "جلسات تفاعلية مباشرة عبر الإنترنت لجميع المستويات.", descEn: "Live interactive online sessions across all levels." },
              { icon: Workflow, ar: "مدمج", en: "Blended", descAr: "تجربة تجمع بين الحضوري والرقمي لتحقيق أعلى أثر.", descEn: "An experience combining in-person and digital for maximum impact." },
              { icon: Building2, ar: "تدريب مؤسسي", en: "Institutional", descAr: "برامج مفصّلة لفريق المؤسسة بمحتوى وخدمات قابلة للتخصيص.", descEn: "Tailored programs for an institution's team with customizable content and services." },
            ].map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-background border border-border p-5 flex flex-col"
              >
                <d.icon className="w-7 h-7 text-secondary mb-3" strokeWidth={1.5} />
                <h4 className="font-black text-primary text-sm mb-1 leading-snug">{language === "ar" ? d.ar : d.en}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{language === "ar" ? d.descAr : d.descEn}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certification Path */}
      <section id="integrated-diploma" className="py-24 bg-background islamic-pattern border-b border-border scroll-mt-24">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{language === "ar" ? "الشهادات" : "Certification"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {language === "ar" ? "مسار الشهادات" : "Certification Path"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {language === "ar" ? "ترقية الشهادات تتدرّج مع تقدّم المشارك في المستويات حتى الدبلوم الرائد." : "Certifications progress as participants advance through the levels — culminating in the flagship diploma."}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { code: "L1", icon: ScrollText, ar: "شهادة المستوى الأول", en: "Level 1 Certificate", descAr: "شهادة إتمام التأسيس في المسار المختار.", descEn: "Foundation certificate of completion in the chosen track." },
              { code: "L2", icon: ScrollText, ar: "شهادة المستوى الثاني", en: "Level 2 Certificate", descAr: "شهادة إدارة احترافية متقدمة.", descEn: "Advanced professional management certificate." },
              { code: "L3", icon: Award, ar: "شهادة القيادة التنفيذية", en: "Executive Certificate", descAr: "شهادة القيادة التنفيذية في المسار.", descEn: "Executive leadership certificate in the track." },
              { code: "DIP", icon: Crown, ar: "دبلوم القيادة المتكاملة", en: "Integrated Diploma", descAr: "الشهادة الرائدة للأكاديمية بعد إتمام مشروع التكامل التنفيذي.", descEn: "The Academy's flagship credential, awarded after the executive integration capstone." },
            ].map((c, i) => (
              <motion.div
                key={c.code}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`border p-6 flex flex-col ${
                  c.code === "DIP" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-primary border-border hover:border-secondary/50"
                } transition-all`}
              >
                <div className="flex items-center justify-between mb-4">
                  <c.icon className="w-8 h-8 text-secondary" strokeWidth={1.5} />
                  <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${c.code === "DIP" ? "text-secondary" : "text-secondary"}`}>{c.code}</span>
                </div>
                <h3 className={`font-black text-lg mb-2 leading-snug ${c.code === "DIP" ? "text-white" : "text-primary"}`}>{language === "ar" ? c.ar : c.en}</h3>
                <p className={`text-sm leading-relaxed ${c.code === "DIP" ? "text-white/70" : "text-muted-foreground"}`}>{language === "ar" ? c.descAr : c.descEn}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{language === "ar" ? "منهجنا" : "Our Approach"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {language === "ar" ? "ما الذي يميّز أكاديمية دار نظم" : "What Sets DarNozom Academy Apart"}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Network, ar: "نموذج متكامل", en: "An Integrated Model", descAr: "نجمع بين أنظمة الحوكمة والامتثال الشرعي، الإدارة المهنية، والتحول الرقمي في منظومة واحدة لا في برامج منفصلة.", descEn: "We integrate Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation into one ecosystem — not separate programs." },
              { icon: Target, ar: "تطبيقي مؤسسي", en: "Applied & Institutional", descAr: "كل مستوى مرتبط بمخرَج عملي قابل للتطبيق على بيئة العمل الفعلية للمشارك.", descEn: "Every level ties to a practical outcome applicable to the participant's real workplace." },
              { icon: Lightbulb, ar: "منهج موحّد عبر القطاعات", en: "Unified Across Sectors", descAr: "منهج واحد قابل للتطبيق في الشركات والمنظمات غير الربحية والقطاع الحكومي.", descEn: "One curriculum applicable to corporates, non-profits, and the public sector." },
            ].map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-secondary/15 p-8 hover:border-secondary/50 transition-colors"
              >
                <v.icon className="w-9 h-9 text-secondary mb-5" strokeWidth={1.5} />
                <h3 className="font-black text-primary text-lg mb-3 leading-snug">{language === "ar" ? v.ar : v.en}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{language === "ar" ? v.descAr : v.descEn}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute -bottom-10 -left-10 text-[14rem] font-black text-secondary/5 leading-none select-none pointer-events-none">A</div>
        <div className="container mx-auto px-6 md:px-12 max-w-5xl relative z-10">
          <div className="text-center mb-10">
            <GraduationCap className="w-12 h-12 text-secondary mx-auto mb-5" strokeWidth={1.5} />
            <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">{language === "ar" ? "ابدأ رحلتك" : "Begin Your Journey"}</div>
            <h2 className="font-black text-white leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)" }}>
              {language === "ar" ? "هل أنت مستعد للانضمام إلى الأكاديمية؟" : "Ready to Join the Academy?"}
            </h2>
            <p className="text-white/70 leading-relaxed max-w-2xl mx-auto">
              {language === "ar"
                ? "اختر طريقك للتقديم — حسب البرنامج، حسب المستوى، أو طلب تدريب مؤسسي — أو احجز جلسة استشارية مع فريق الأكاديمية لمساعدتك على اختيار المسار الأنسب."
                : "Pick your application path — by program, by level, or institutional training — or book a consultation with the Academy team to help you choose."}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/academy/apply"
              className="inline-flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-bold text-base hover:bg-secondary/90 transition-all"
              data-testid="link-apply-now"
            >
              {language === "ar" ? "قدّم الآن" : "Apply Now"}
              <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
            >
              <Mail className="w-4 h-4" />
              {language === "ar" ? "احجز جلسة استشارية" : "Book a Consultation"}
            </Link>
            <a
              href={t.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
            >
              <Phone className="w-4 h-4" />
              {language === "ar" ? "تواصل عبر واتساب" : "WhatsApp"}
            </a>
          </div>
        </div>
      </section>

      {/* Course Announcements */}
      {(announcementsLoading || announcements.length > 0 || authed) && (
        <section className="py-20 bg-background border-b border-border">
          <div className="container mx-auto px-6 md:px-12">
            <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px w-10 bg-secondary" />
                  <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.announcementsSection}</span>
                </div>
                <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
                  {t.announcementsTitle}
                </h2>
              </div>
              {authed && (
                <Button
                  onClick={() => setShowAddAnnouncement(true)}
                  className="gap-2 rounded-none font-bold"
                >
                  <Plus size={16} />
                  {t.addAnnouncement}
                </Button>
              )}
            </div>

            {announcementsLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
                <span>{t.loading}</span>
              </div>
            ) : announcements.length === 0 ? (
              authed ? (
                <div className="text-center py-16 text-muted-foreground border border-dashed border-border">
                  <Megaphone className="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold mb-2">{t.noAnnouncements}</p>
                  <p className="text-sm">{t.noAnnouncementsDesc}</p>
                </div>
              ) : null
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {announcements.map((ann, i) => {
                  const title = language === "ar" ? ann.titleAr : (ann.titleEn || ann.titleAr);
                  const subtitle = language === "ar" ? ann.titleEn : ann.titleAr;
                  const desc = language === "ar" ? ann.descriptionAr : (ann.descriptionEn || ann.descriptionAr);
                  return (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07 }}
                      className="bg-background border border-border hover:border-secondary/50 transition-all flex flex-col overflow-hidden"
                    >
                      {ann.imageUrl ? (
                        <div className="aspect-video w-full overflow-hidden bg-muted">
                          <img
                            src={ann.imageUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      ) : (
                        <div className="aspect-video w-full dark bg-[#0F3D2E] flex items-center justify-center">
                          <Megaphone className="w-14 h-14 text-secondary/40" />
                        </div>
                      )}
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="inline-flex items-center gap-1 bg-secondary/10 text-primary text-[10px] font-bold tracking-widest uppercase px-2 py-1 mb-4 self-start">
                          <Megaphone size={10} />
                          {language === "ar" ? "إعلان" : "Announcement"}
                        </div>
                        <h3 className="font-black text-primary text-lg mb-1 leading-snug">{title}</h3>
                        {subtitle && subtitle !== title && (
                          <p className="text-muted-foreground text-xs mb-3 font-medium">{subtitle}</p>
                        )}
                        {desc && (
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3 flex-1">{desc}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-auto">
                          {ann.startDate && (
                            <div className="flex items-center gap-1">
                              <Calendar size={12} className="text-secondary shrink-0" />
                              <span>{ann.startDate}</span>
                            </div>
                          )}
                          {ann.price && (
                            <div className="flex items-center gap-1">
                              <DollarSign size={12} className="text-secondary shrink-0" />
                              <span>{ann.price}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4 border-t border-border flex items-center gap-2">
                        {ann.registrationUrl ? (
                          <a
                            href={ann.registrationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:bg-primary/90 transition-colors rounded-none"
                          >
                            <ExternalLink size={13} />
                            {t.registerLink}
                          </a>
                        ) : (
                          <div className="flex-1" />
                        )}
                        {authed && (
                          <button
                            onClick={() => deleteAnnouncement(ann.id)}
                            className="p-2 text-muted-foreground hover:text-red-500 transition-colors border border-border hover:border-red-500 rounded-none"
                            title={t.deleteAnnouncement}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Live Courses */}
      <section className="py-24 bg-background islamic-pattern border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-10 bg-secondary" />
                <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.availableCoursesSection}</span>
              </div>
              <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
                {t.availableCoursesTitle}
              </h2>
            </div>
            {authed && (
              <Button
                onClick={() => setShowAddCourse(true)}
                className="gap-2 rounded-none font-bold"
              >
                <Plus size={16} />
                {t.addCourse}
              </Button>
            )}
          </div>

          {/* Track filter tabs */}
          {!coursesLoading && courses.length > 0 && (() => {
            const normalizedTracks = Array.from(
              new Set(
                courses.map(c =>
                  c.track && TRACK_LABELS[c.track] ? c.track : "other"
                )
              )
            );
            return (
              <div className="flex flex-wrap gap-2 mb-8">
                <button
                  onClick={() => setActiveTrack("all")}
                  className={`px-4 py-2 text-sm font-bold border transition-colors rounded-none ${
                    activeTrack === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-secondary hover:text-primary"
                  }`}
                >
                  {language === "ar" ? "الكل" : "All"}
                </button>
                {normalizedTracks.map(track => (
                  <button
                    key={track}
                    onClick={() => setActiveTrack(track)}
                    className={`px-4 py-2 text-sm font-bold border transition-colors rounded-none ${
                      activeTrack === track
                        ? "bg-secondary text-primary border-secondary"
                        : "bg-background text-muted-foreground border-border hover:border-secondary hover:text-primary"
                    }`}
                  >
                    {trackLabel(track, language)}
                  </button>
                ))}
              </div>
            );
          })()}

          {coursesLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
              <span>{t.loading}</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-2">{t.noCourses}</p>
              <p className="text-sm">{t.noCoursesDesc}</p>
            </div>
          ) : (() => {
            const filtered = activeTrack === "all"
              ? courses
              : courses.filter(c => {
                  const norm = c.track && TRACK_LABELS[c.track] ? c.track : "other";
                  return norm === activeTrack;
                });
            return filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold mb-2">{t.noCourses}</p>
                <p className="text-sm">{t.noCoursesDesc}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isAdmin={authed}
                    onRegister={setRegisterCourse}
                    onViewRegistrations={setViewRegsCourse}
                    t={t}
                    language={language}
                  />
                ))}
              </div>
            );
          })()}
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
            href="/events"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm border border-border px-4 py-2 hover:border-primary"
          >
            <span>{t.academyEvents}</span>
            <BookOpen size={14} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
