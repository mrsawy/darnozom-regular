import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, useInView, AnimatePresence, useScroll, useTransform, useSpring, type HTMLMotionProps } from "framer-motion";
import {
  BookOpen, Briefcase, Landmark, Laptop, Lightbulb,
  Scale, GraduationCap, FileText, Languages, ShoppingCart,
  Users, Building2, Mail, Phone, MapPin, MessageSquare,
  ArrowLeft, ArrowRight, Globe, TrendingUp, Award, ScrollText,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/language-context";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import CaseStudyCard from "@/components/case-study-card";
import FeaturedBooksSection from "@/components/featured-books-section";
import { SERVICES as SERVICES_DATA } from "@/lib/site-content";
import { getFeaturedCaseStudies } from "@/lib/case-studies";
import statServicesBg from "@/assets/stat-services-bg.png";
import statExperienceBg from "@/assets/stat-experience-bg.png";
import statSectorsBg from "@/assets/stat-sectors-bg.png";
import statAcademyBg from "@/assets/stat-academy-bg.png";

/* ─────────────────────────────────────────────────────────────────
   Reduced Motion Hook
───────────────────────────────────────────────────────────────── */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ─────────────────────────────────────────────────────────────────
   Scroll Progress Bar
───────────────────────────────────────────────────────────────── */
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-secondary origin-left z-[100]"
      style={{ scaleX }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
   Clip-Path Heading Reveal
───────────────────────────────────────────────────────────────── */
function RevealHeading({ children, className = "", style = {} }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { clipPath: "inset(100% 0% 0% 0%)", opacity: 0 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Magnetic Button
───────────────────────────────────────────────────────────────── */
function MagneticButton({ children, className = "", onClick, ...props }: HTMLMotionProps<"button"> & { children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setPos({ x: (e.clientX - cx) * 0.3, y: (e.clientY - cy) * 0.3 });
  };

  const handleMouseLeave = () => setPos({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Animated Counter — smooth easing curve
───────────────────────────────────────────────────────────────── */
function Counter({ to, suffix = "", duration = 2 }: { to: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduced) { setCount(to); return; }
    let startTime: number | null = null;
    const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / (duration * 1000);
      const progress = Math.min(elapsed, 1);
      setCount(Math.floor(easeOutExpo(progress) * to));
      if (progress < 1) requestAnimationFrame(animate);
      else setCount(to);
    };
    requestAnimationFrame(animate);
  }, [inView, to, duration, reduced]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─────────────────────────────────────────────────────────────────
   Section label component
───────────────────────────────────────────────────────────────── */
function SectionLabel({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${light ? "text-secondary" : "text-secondary"}`}>
      <div className={`h-px w-10 ${light ? "bg-secondary" : "bg-secondary"}`} />
      <span className="text-xs font-bold tracking-[0.2em] uppercase">{children}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Hero — Convergence graphic + orbiting pillar nodes
───────────────────────────────────────────────────────────────── */
const FOCAL = { x: 70, y: 350 };

function beamPath(angleDeg: number, len: number, bow: number) {
  const a = (angleDeg * Math.PI) / 180;
  const ex = FOCAL.x + Math.cos(a) * len;
  const ey = FOCAL.y + Math.sin(a) * len;
  const mx = FOCAL.x + Math.cos(a) * len * 0.5;
  const my = FOCAL.y + Math.sin(a) * len * 0.5;
  const px = -Math.sin(a);
  const py = Math.cos(a);
  const c1x = mx + px * bow;
  const c1y = my + py * bow;
  return `M ${FOCAL.x} ${FOCAL.y} Q ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

const BEAMS = [
  { angle: -52, len: 660, bow: 70, w: 26, o: 0.10 },
  { angle: -34, len: 700, bow: 50, w: 34, o: 0.16 },
  { angle: -16, len: 720, bow: 28, w: 30, o: 0.20 },
  { angle: 0, len: 740, bow: 10, w: 22, o: 0.24 },
  { angle: 16, len: 720, bow: -28, w: 30, o: 0.20 },
  { angle: 34, len: 700, bow: -50, w: 34, o: 0.16 },
  { angle: 52, len: 660, bow: -70, w: 26, o: 0.10 },
];

function ConvergenceGraphic({ reduced }: { reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 740 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="focalGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(150 60% 96%)" stopOpacity="1" />
          <stop offset="35%" stopColor="hsl(150 55% 80%)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(150 50% 80%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(150 55% 78%)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(150 45% 86%)" stopOpacity="0" />
        </linearGradient>
        <filter id="beamBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* Soft ambient wash behind the burst */}
      <circle cx="420" cy="350" r="380" fill="url(#focalGlow)" opacity="0.5" />

      {/* Radiating beams */}
      <g filter="url(#beamBlur)">
        {BEAMS.map((b, i) => (
          <motion.path
            key={i}
            d={beamPath(b.angle, b.len, b.bow)}
            stroke="url(#beamGrad)"
            strokeWidth={b.w}
            strokeLinecap="round"
            fill="none"
            opacity={b.o}
            initial={reduced ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: b.o }}
            transition={{ duration: 1.4, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </g>

      {/* Bright focal point */}
      <motion.circle
        cx={FOCAL.x}
        cy={FOCAL.y}
        r="130"
        fill="url(#focalGlow)"
        initial={reduced ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <motion.circle
        cx={FOCAL.x}
        cy={FOCAL.y}
        r="9"
        fill="hsl(150 55% 96%)"
        initial={reduced ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
    </svg>
  );
}

function NodeBurst({
  className,
  strokeWidth = 1.5,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  const cx = 12;
  const cy = 12;
  const r = 7.4;
  const angles = [-90, -30, 30, 90, 150, 210];
  const pts = angles.map((a) => {
    const rad = (a * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  });
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Faint hexagon lattice connecting the outer nodes */}
      <polygon
        points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
        opacity="0.3"
        strokeWidth={strokeWidth * 0.7}
      />
      {/* Radiating spokes from the core */}
      {pts.map((p, i) => (
        <line key={`l${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} opacity="0.85" />
      ))}
      {/* Outer nodes — alternating sizes for rhythm */}
      {pts.map((p, i) => (
        <circle
          key={`d${i}`}
          cx={p.x}
          cy={p.y}
          r={i % 2 === 0 ? 1.5 : 1.05}
          fill="currentColor"
          stroke="none"
        />
      ))}
      {/* Central hub — ring + solid core */}
      <circle cx={cx} cy={cy} r="2.6" fill="none" strokeWidth={strokeWidth} opacity="0.5" />
      <circle cx={cx} cy={cy} r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PillarNode({
  icon: Icon,
  label,
  topPct,
  insetPct,
  mirror,
  reduced,
  delay,
  index,
}: {
  icon: React.ElementType;
  label: string;
  topPct: number;
  insetPct: number;
  mirror: boolean;
  reduced: boolean;
  delay: number;
  index: number;
}) {
  // Per-pillar idle motion — cohesive as a set, distinct in rhythm so it
  // reads as deliberate orbiting rather than a uniform bob.
  const floatAmp = [7, 9.5, 6][index % 3];
  const floatDur = [5.4, 6.6, 5.9][index % 3];
  const driftX = [3, -3.5, 2.5][index % 3];
  const ringDur = [24, 30, 27][index % 3];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.8, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 16, delay }}
      whileHover={reduced ? undefined : { scale: 1.04 }}
      className="group absolute flex items-center gap-4"
      style={{
        top: `${topPct}%`,
        [mirror ? "left" : "right"]: `${insetPct}%`,
        flexDirection: mirror ? "row-reverse" : "row",
      }}
    >
      {/* Icon cluster — layered halo, glow and a premium glass badge */}
      <motion.span
        className="relative shrink-0"
        animate={reduced ? undefined : { y: [0, -floatAmp, 0], x: [0, driftX, 0] }}
        transition={
          reduced
            ? undefined
            : { duration: floatDur, repeat: Infinity, ease: "easeInOut", delay }
        }
      >
        {/* Outer rotating dashed orbit ring — emerges on hover */}
        <motion.span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-secondary/30 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={reduced ? undefined : { duration: ringDur, repeat: Infinity, ease: "linear" }}
        />
        {/* Concentric thin halo ring */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[112px] w-[112px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/12 transition-all duration-500 group-hover:h-[122px] group-hover:w-[122px] group-hover:border-primary/25"
        />
        {/* Emerald ambient glow (default) */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[98px] w-[98px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,140,100,0.26),transparent_70%)] blur-xl transition-opacity duration-500 group-hover:opacity-0"
        />
        {/* Gold ambient glow (hover) */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(207,166,61,0.34),transparent_70%)] blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
        {/* Glass badge */}
        <span className="relative flex h-[82px] w-[82px] items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-white/85 to-white/40 backdrop-blur-md shadow-[0_10px_34px_rgba(20,80,60,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] transition-all duration-300 group-hover:border-secondary/55 group-hover:shadow-[0_16px_46px_rgba(20,80,60,0.18),inset_0_1px_0_rgba(255,255,255,0.85)]">
          {/* Inner gold accent ring — fades in on hover */}
          <span
            aria-hidden="true"
            className="absolute inset-[6px] rounded-full border border-secondary/0 transition-colors duration-300 group-hover:border-secondary/45"
          />
          <Icon
            className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110"
            strokeWidth={1.4}
          />
        </span>
      </motion.span>

      <span
        className={`max-w-[130px] text-[11px] font-semibold uppercase leading-[1.45] tracking-[0.16em] text-primary/75 transition-colors duration-300 group-hover:text-primary ${
          mirror ? "text-right" : "text-left"
        }`}
      >
        {label}
      </span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Services data — icon mapping (UI-only; base data lives in site-content.ts)
───────────────────────────────────────────────────────────────── */
const SERVICE_ICONS: Record<string, React.ElementType> = {
  "islamic-systems": Scale,
  "management-systems": Briefcase,
  "digital-transformation": Laptop,
  "consulting": Lightbulb,
  "academy": GraduationCap,
  "research": FileText,
  "publishing": Languages,
  "store": ShoppingCart,
};

const SERVICES = SERVICES_DATA.map(s => ({
  ...s,
  icon: SERVICE_ICONS[s.slug] ?? Briefcase,
}));

const STATS = [
  { value: 9, suffix: "+", icon: Award, bg: statServicesBg },
  { value: 15, suffix: "+", icon: TrendingUp, bg: statExperienceBg },
  { value: 4, suffix: "", icon: Globe, bg: statSectorsBg },
  { value: 4, suffix: "", icon: GraduationCap, bg: statAcademyBg },
  { value: 19, suffix: "+", icon: ScrollText, bg: statAcademyBg },
  { value: 44, suffix: "+", icon: BookOpen, bg: statServicesBg },
];

const VALUES = [
  { ar: "المرجعية الشرعية", en: "Sharia Authority", icon: BookOpen },
  { ar: "الاحترافية الإدارية", en: "Managerial Professionalism", icon: Briefcase },
  { ar: "الابتكار والتميز", en: "Innovation & Excellence", icon: Lightbulb },
  { ar: "التعاون والتكامل", en: "Collaboration & Integration", icon: Users },
  { ar: "الواقعية والأثر", en: "Impact", icon: TrendingUp },
  { ar: "الاستدامة", en: "Sustainability", icon: Globe },
];

/* ─────────────────────────────────────────────────────────────────
   Translations
───────────────────────────────────────────────────────────────── */
const T = {
  ar: {
    dir: "rtl" as const,
    nav: {
      home: "الرئيسية", about: "من نحن", services: "خدماتنا", sectors: "القطاعات",
      academy: "الأكاديمية", onlineStore: "متجر الكتب", aiConsult: "وكيل الاستشارات الذكي",
      aiConsultMobile: "وكيل الاستشارات الذكي", career: "الوظائف", contact: "تواصل معنا",
      events: "الفعاليات", langToggle: "English",
      servicesDropdown: [
        { label: "أنظمة الحوكمة والامتثال الشرعي", href: "/services/islamic-systems" },
        { label: "الإدارة", href: "/services/management-systems" },
        { label: "التحول الرقمي", href: "/services/digital-transformation" },
        { label: "خدمات الاستشارات", href: "/services/consulting" },
        { label: "البحث والنشر", href: "/services/research" },
        { label: "الفعاليات والمؤتمرات", href: "/events" },
      ],
      sectorsDropdown: [
        { label: "الأفراد", anchor: "sectors" },
        { label: "المؤسسات والشركات", anchor: "sectors" },
        { label: "الحكومة والقطاع العام", anchor: "sectors" },
        { label: "البحث والترجمة والنشر", anchor: "sectors" },
      ],
    },
    hero: {
      label: "مؤسسة علمية رائدة",
      eyebrow: "استشارات متكاملة",
      title: "دار نظم",
      titleLead: "حيث يلتقي التميّز الإداري",
      titleAccent: "بالقيم الإسلامية.",
      subhead: "نساعد القادة على بناء مؤسسات عالية الأداء من خلال الحوكمة الشرعية والتميّز الإداري والتحول الرقمي.",
      slogan: "حيث يلتقي التميز الإداري بالقيم الإسلامية.",
      body: "نقدم حلولاً متكاملة في الحوكمة والامتثال الشرعي، والاستراتيجية والإدارة، والتحول الرقمي — لتمكين الوضوح الاستراتيجي والتميز المؤسسي والأثر المستدام طويل الأمد.",
      cta1: "اكتشف خدماتنا",
      cta2: "وكيل الاستشارات الذكي",
      cta3: "تواصل معنا",
      cta4: "متجر الكتب",
      cta5: "الأكاديمية",
      ctaDiscover: "تعرّف على دار نظم",
      pillars: {
        shariah: "الحوكمة الشرعية",
        management: "التميّز الإداري",
        digital: "التحول الرقمي",
      },
    },
    stats: [
      { label: "خدمة متخصصة", sublabel: "خدمات متخصصة" },
      { label: "سنة خبرة", sublabel: "سنوات من التميز" },
      { label: "قطاعات", sublabel: "قطاعات مستهدفة" },
      { label: "برامج أكاديمية", sublabel: "برامج أكاديمية" },
      { label: "دبلومات متخصصة", sublabel: "دبلومات متخصصة" },
      { label: "كورسات تدريبية", sublabel: "كورسات تدريبية" },
    ],
    about: {
      sectionLabel: "من نحن",
      heading: "شريكك الاستراتيجي لتطوير النظم الإسلامية والإدارية",
      p1: "دار نظم مؤسسة علمية متخصصة في تقديم حلول متكاملة في النظم الإسلامية والإدارة الحديثة والتحول المؤسسي. نعمل على تمكين الأفراد وتطوير المؤسسات ودعم الحكومات.",
      p2: "من خلال منهج يجمع بين المرجعية الشرعية والاحتراف الإداري — نحقق التوازن الحقيقي بين القيم والأداء.",
      cta: "تواصل مع فريقنا",
      visionLabel: "رؤيتنا",
      vision: "أن تكون دار نظم المرجعية العالمية الرائدة في تصميم وتطوير النظم الإسلامية والإدارية المتكاملة.",
      missionLabel: "رسالتنا",
      mission: "حلول استشارية وتعليمية وتطبيقية متكاملة — تجمع النظم الشرعية بالإدارة الحديثة لتطوير الأفراد وتمكين المؤسسات.",
      valuesLabel: "قيمنا المؤسسية",
    },
    services: {
      sectionLabel: "خدماتنا",
      heading1: "منظومة متكاملة",
      heading2: "لمؤسسة احترافية",
      sub: "نقدّم منظومة متكاملة تنقل مؤسستك إلى مستوى أعلى من الاحتراف والالتزام.",
      more: "اعرف المزيد",
      moreSmall: "المزيد",
    },
    methodology: {
      sectionLabel: "المنهجية",
      heading: "كيف نعمل معك؟",
      methodIntro: "مسار واحد منضبط نطبّقه عبر المحاور الثلاثة — الحوكمة الشرعية، والتميّز الإداري، والتحول الرقمي — لنقدّم منظومة متكاملة لا مسارات منفصلة، فتتحوّل القيم والممارسات والتقنية إلى أداء مؤسسي راسخ.",
      steps: [
        {
          step: "01",
          title: "تشخيص",
          desc: "خط أساس قائم على الحقائق يقيس الالتزام الشرعي، وكفاءة النموذج الإداري، ونضج التحول الرقمي معًا — لكشف القيود الحقيقية لا الأعراض.",
        },
        {
          step: "02",
          title: "تصميم",
          desc: "نموذج تشغيلي متكامل وخارطة طريق نُصمّمها مع القيادة، تجمع بين أطر الحوكمة الشرعية والممارسات الإدارية العالمية والبنية الرقمية الممكِّنة.",
        },
        {
          step: "03",
          title: "تطبيق وتمكين",
          desc: "تنفيذ مدمج مع فرقك يربط الفتاوى التشغيلية والسياسات الإدارية والأنظمة الرقمية في خط عمل واحد، مع نقل القدرات في كل خطوة.",
        },
        {
          step: "04",
          title: "تدقيق واستدامة",
          desc: "تدقيق شرعي دوري، ومؤشرات أداء إدارية، ولوحات قياس رقمية، وآليات تحديث تجعل المنظومة حيّة ومتطوّرة مع تطوّر المؤسسة.",
        },
      ],
    },
    sectors: {
      sectionLabel: "القطاعات",
      heading: "من نخدم؟",
      sub: "نخدم مجموعة واسعة من القطاعات بحلول مصممة خصيصًا لتلبية احتياجات كل فئة.",
      items: [
        { num: "01", title: "الأفراد", sub: "أفراد", icon: Users, desc: "استشارات شرعية وإدارية وحياتية، وبرامج تدريبية لتطوير مهارات القيادة الشخصية والمهنية." },
        { num: "02", title: "المؤسسات والشركات", sub: "مؤسسات", icon: Building2, desc: "حلول شاملة في الحوكمة الشرعية والاستشارات الإدارية والتحول الرقمي وإدارة الأداء." },
        { num: "03", title: "الحكومة والقطاع العام", sub: "حكومات", icon: Landmark, desc: "تطوير برامج وطنية للحوكمة ومؤشرات أداء قائمة على القيم ودعم اتخاذ القرار." },
        { num: "04", title: "البحث والترجمة والنشر", sub: "بحث ونشر", icon: BookOpen, desc: "إنتاج وتطوير أبحاث إدارية وشرعية وكتب متخصصة وترجمة الدراسات العالمية." },
      ],
    },
    cta: {
      label: "ابدأ رحلتك اليوم",
      heading1: "هل مؤسستك جاهزة",
      heading2: "للمستوى التالي؟",
      sub: "تواصل مع فريقنا الاستشاري لنبدأ رحلة التحول المؤسسي — شرعيًا وإداريًا وتقنيًا.",
      btn1: "احجز استشارة مجانية",
      btn2: "واتساب مباشر",
    },
    contact: {
      sectionLabel: "تواصل معنا",
      heading1: "نحن هنا",
      heading2: "لخدمتك",
      infoItems: [
        { label: "الهاتف", value: "+20 102 204 4240" },
        { label: "واتساب", value: "+20 102 204 4240" },
        { label: "البريد الإلكتروني", value: "info@darnozom.com" },
        { label: "العنوان", value: "ذا أدريس كمبوند، الشيخ زايد، محافظة الجيزة، مصر" },
      ],
      formHeading: "أرسل لنا رسالة",
      name: "الاسم الكامل",
      org: "المؤسسة / الشركة (اختياري)",
      email: "البريد الإلكتروني",
      subject: "موضوع الرسالة",
      message: "رسالتك",
      send: "إرسال الرسالة",
      whatsapp: "تواصل عبر واتساب",
      followUs: "تابعنا على",
    },
    footer: {
      rights: "جميع الحقوق محفوظة",
      tagline: "لإنتاج وتطوير النظم الإسلامية والإدارية",
      servicesHeading: "خدماتنا",
      services: ["أنظمة الحوكمة والامتثال الشرعي", "الإدارة", "التحول الرقمي", "الاستشارات"],
      contactHeading: "تواصل",
      address: "الشيخ زايد، الجيزة، مصر",
      privacy: "سياسة الخصوصية",
      terms: "الشروط والأحكام",
    },
  },
  en: {
    dir: "ltr" as const,
    nav: {
      home: "Home", about: "About", services: "Services", sectors: "Sectors",
      academy: "Academy", onlineStore: "Book Store", aiConsult: "AI Consulting Agent",
      aiConsultMobile: "AI Consulting Agent", career: "Careers", contact: "Contact",
      events: "Events", langToggle: "العربية",
      servicesDropdown: [
        { label: "Shariah Governance & Compliance Systems", href: "/services/islamic-systems" },
        { label: "Management", href: "/services/management-systems" },
        { label: "Digital Transformation", href: "/services/digital-transformation" },
        { label: "Consulting Services", href: "/services/consulting" },
        { label: "Research & Publishing", href: "/services/research" },
        { label: "Events & Conferences", href: "/events" },
      ],
      sectorsDropdown: [
        { label: "Individuals", anchor: "sectors" },
        { label: "Organizations", anchor: "sectors" },
        { label: "Government", anchor: "sectors" },
        { label: "Research & Publishing", anchor: "sectors" },
      ],
    },
    hero: {
      label: "Leading Scientific Institution",
      eyebrow: "Integrated Consulting",
      title: "DarNozom",
      titleLead: "Where Managerial Excellence meets",
      titleAccent: "Islamic Values.",
      subhead: "We help leaders build high-performing organizations through Shariah Governance, Management Excellence, and Digital Transformation.",
      slogan: "where Managerial Excellence meets Islamic Values.",
      body: "We deliver integrated solutions across Shariah Governance & Compliance, Strategy & Management, and Digital Transformation — enabling strategic clarity, institutional excellence, and long-term sustainable impact.",
      cta1: "Explore Our Services",
      cta2: "AI Consulting Agent",
      cta3: "Contact Us",
      cta4: "Book Store",
      cta5: "Academy",
      ctaDiscover: "Discover DarNozom",
      pillars: {
        shariah: "Shariah Governance",
        management: "Management Excellence",
        digital: "Digital Transformation",
      },
    },
    stats: [
      { label: "Specialized Services", sublabel: "Specialized Services" },
      { label: "Years of Experience", sublabel: "Years of Excellence" },
      { label: "Sectors", sublabel: "Target Sectors" },
      { label: "Academy Programs", sublabel: "Academy Programs" },
      { label: "Specialized Diplomas", sublabel: "Specialized Diplomas" },
      { label: "Training Courses", sublabel: "Training Courses" },
    ],
    about: {
      sectionLabel: "About Us",
      heading: "Your Strategic Partner for Developing Islamic & Management Systems",
      p1: "DarNozom is a specialized scientific institution providing integrated solutions in Islamic systems, modern management, and institutional transformation — empowering individuals, developing organizations, and supporting governments.",
      p2: "Through a methodology that combines Sharia authority with managerial excellence — we achieve the true balance between values and performance.",
      cta: "Contact Our Team",
      visionLabel: "Our Vision",
      vision: "For DarNozom to be the leading global authority in designing and developing integrated Islamic and management systems.",
      missionLabel: "Our Mission",
      mission: "Integrated consulting, educational, and applied solutions — combining Islamic systems with modern management to develop individuals and empower institutions.",
      valuesLabel: "Our Core Values",
    },
    services: {
      sectionLabel: "Our Services",
      heading1: "An Integrated",
      heading2: "Professional Suite",
      sub: "We offer an integrated system that elevates your institution to a higher level of professionalism and commitment.",
      more: "Learn More",
      moreSmall: "More",
    },
    methodology: {
      sectionLabel: "The Method",
      heading: "How We Work With You",
      methodIntro: "One disciplined path applied across all three vectors — Shariah Governance, Management Excellence, and Digital Transformation — so values, practices, and technology come together as a single integrated system, not as parallel tracks.",
      steps: [
        {
          step: "01",
          title: "Diagnose",
          desc: "A fact-based baseline that measures Shariah compliance, managerial effectiveness, and digital maturity in one view — surfacing the real constraints, not the symptoms.",
        },
        {
          step: "02",
          title: "Design",
          desc: "An integrated target operating model and roadmap, co-created with leadership, that weaves Shariah governance frameworks, global management practices, and enabling digital architecture into one design.",
        },
        {
          step: "03",
          title: "Implement & Enable",
          desc: "Embedded execution with your teams that links operational fatwa, management policies, and digital systems into a single line of delivery — with capability transfer at every step.",
        },
        {
          step: "04",
          title: "Audit & Sustain",
          desc: "Periodic Shariah audit, management KPIs, digital performance dashboards, and update mechanisms that keep the system living and evolving with the institution.",
        },
      ],
    },
    sectors: {
      sectionLabel: "Sectors",
      heading: "Who Do We Serve?",
      sub: "We serve a wide range of sectors with solutions tailored to meet the needs of each group.",
      items: [
        { num: "01", title: "Individuals", sub: "Individuals", icon: Users, desc: "Islamic, managerial, and life consulting, plus training programs for developing personal and professional leadership skills." },
        { num: "02", title: "Organizations & Businesses", sub: "Organizations", icon: Building2, desc: "Comprehensive solutions in Islamic governance, management consulting, digital transformation, and performance management." },
        { num: "03", title: "Government & Public Sector", sub: "Government", icon: Landmark, desc: "Developing national governance programs, value-based performance indicators, and decision-making support." },
        { num: "04", title: "Research, Translation & Publishing", sub: "Research & Publishing", icon: BookOpen, desc: "Producing and developing management and Islamic research, specialized books, and translating global studies." },
      ],
    },
    cta: {
      label: "Start Today",
      heading1: "Is Your Institution Ready",
      heading2: "For the Next Level?",
      sub: "Connect with our consulting team to begin the institutional transformation journey — Islamic, managerial, and technical.",
      btn1: "Book a Free Consultation",
      btn2: "WhatsApp Direct",
    },
    contact: {
      sectionLabel: "Contact Us",
      heading1: "We Are Here",
      heading2: "To Serve You",
      infoItems: [
        { label: "Phone", value: "+20 102 204 4240" },
        { label: "WhatsApp", value: "+20 102 204 4240" },
        { label: "Email", value: "info@darnozom.com" },
        { label: "Address", value: "The Address Compound, Sheikh Zayed, Giza Governorate, Egypt" },
      ],
      formHeading: "Send Us a Message",
      name: "Full Name",
      org: "Organization / Company (Optional)",
      email: "Email Address",
      subject: "Message Subject",
      message: "Your Message",
      send: "Send Message",
      whatsapp: "Contact via WhatsApp",
      followUs: "Follow Us On",
    },
    footer: {
      rights: "All Rights Reserved",
      tagline: "For the Production & Development of Islamic & Management Systems",
      servicesHeading: "Our Services",
      services: ["Shariah Governance & Compliance Systems", "Management", "Digital Transformation", "Consulting"],
      contactHeading: "Contact",
      address: "Sheikh Zayed, Giza, Egypt",
      privacy: "Privacy Policy",
      terms: "Terms & Conditions",
    },
  },
};

/* ─────────────────────────────────────────────────────────────────
   Service Card — Big 4 editorial style
───────────────────────────────────────────────────────────────── */
function ServiceCard({ service, index, more }: { service: typeof SERVICES[0]; index: number; more: string }) {
  const reduced = usePrefersReducedMotion();
  const { language } = useLanguage();
  const num = String(index + 1).padStart(2, "0");
  const href = service.slug === "academy" ? "/academy" : `/services/${service.slug}`;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, clipPath: "inset(20% 0% 20% 0%)" }}
      whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: index * 0.07 }}
      className="h-full"
    >
      <Link href={href}>
        <div className="service-card group relative h-full flex flex-col border-t border-white/10 bg-white/[0.02] p-7 cursor-pointer overflow-hidden transition-colors duration-300 hover:bg-white/[0.05]">
          {/* Gold accent edge — slides in on hover */}
          <div className="absolute top-0 right-0 w-[3px] h-0 bg-secondary group-hover:h-full transition-all duration-500 ease-out" />

          {/* Shimmer glow on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.07) 0%, transparent 70%)" }}
          />

          {/* Number + icon */}
          <div className="flex items-start justify-between mb-5">
            <span className="font-black text-4xl text-secondary/20 group-hover:text-secondary/40 transition-colors leading-none tabular-nums">
              {num}
            </span>
            <service.icon className="w-5 h-5 text-secondary/50 group-hover:text-secondary transition-colors mt-1" />
          </div>

          {/* Thin rule */}
          <div className="h-px w-full bg-white/10 mb-5 group-hover:bg-secondary/30 transition-colors duration-300" />

          {/* Title */}
          <h3 className="text-white font-black text-3xl mb-3 leading-snug group-hover:text-secondary transition-colors duration-300">
            {service.title[language]}
          </h3>

          {/* Description */}
          <p className="text-white/45 text-sm leading-relaxed mb-5">
            {service.desc[language]}
          </p>

          {/* CTA link */}
          <div className="flex items-center gap-1.5 text-secondary/70 text-xs font-bold mt-auto pt-3 group-hover:text-secondary group-hover:translate-x-0 transition-all duration-300">
            {more}
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────── */
export default function Home() {
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", body: "" });
  const [contactStatus, setContactStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const reduced = usePrefersReducedMotion();
  const [, setLocation] = useLocation();

  /* Hero parallax */
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroImgY = useTransform(scrollY, [0, 600], ["0%", "25%"]);
  const heroTextY = useTransform(scrollY, [0, 600], ["0%", "-8%"]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactStatus === "sending") return;
    setContactStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          subject: contactForm.subject,
          message: contactForm.body,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      setContactStatus("success");
      setContactForm({ name: "", email: "", subject: "", body: "" });
    } catch {
      setContactStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={t.dir}>

      {/* Scroll progress bar */}
      <ScrollProgressBar />

      {/* Unified site navigation */}
      <SiteNav mode="page" theme="light" />


      {/* ══════════════════════════════════════
          HERO — Parallax depth 2026
      ══════════════════════════════════════ */}
      <section
        id="hero"
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden bg-transparent"
      >
        {/* Convergence graphic — trailing side, mirrored for RTL */}
        <motion.div
          className="absolute inset-y-0 w-full lg:w-[58%] pointer-events-none"
          style={{
            [isArabic ? "left" : "right"]: 0,
            transform: isArabic ? "scaleX(-1)" : undefined,
            WebkitMaskImage: "linear-gradient(to left, black 55%, transparent 100%)",
            maskImage: "linear-gradient(to left, black 55%, transparent 100%)",
            ...(reduced ? {} : { y: heroImgY }),
          }}
        >
          <ConvergenceGraphic reduced={reduced} />
        </motion.div>

        {/* Pillar nodes — over the graphic, on the trailing side (not mirrored so labels read correctly) */}
        <div className="absolute inset-y-0 w-full lg:w-[58%] hidden md:block pointer-events-none" style={{ [isArabic ? "left" : "right"]: 0 }}>
          <PillarNode icon={Scale} label={t.hero.pillars.shariah} topPct={26} insetPct={24} mirror={isArabic} reduced={reduced} delay={0.7} index={0} />
          <PillarNode icon={BarChart3} label={t.hero.pillars.management} topPct={45} insetPct={15} mirror={isArabic} reduced={reduced} delay={0.85} index={1} />
          <PillarNode icon={NodeBurst} label={t.hero.pillars.digital} topPct={64} insetPct={24} mirror={isArabic} reduced={reduced} delay={1.0} index={2} />
        </div>

        {/* Content */}
        <motion.div
          className="relative z-10 container mx-auto px-6 md:px-12"
          style={reduced ? {} : { y: heroTextY }}
        >
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 mb-7"
            >
              <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
                {t.hero.eyebrow}
              </span>
              <div className="h-px w-10 bg-primary/40" />
            </motion.div>

            {/* Main heading — value proposition with accent word */}
            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-medium text-foreground leading-[1.12] mb-6"
              style={{
                fontSize: "clamp(2rem, 4.4vw, 3.5rem)",
                fontFamily: isArabic
                  ? "'IBM Plex Sans Arabic', sans-serif"
                  : "Georgia, 'Times New Roman', 'Noto Serif', serif",
              }}
            >
              {t.hero.titleLead}{" "}
              <span className="italic text-primary">{t.hero.titleAccent}</span>
            </motion.h1>

            {/* Subhead */}
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="text-muted-foreground max-w-xl leading-relaxed mb-10"
              style={{ fontSize: "clamp(1rem, 1.4vw, 1.2rem)" }}
            >
              {t.hero.subhead}
            </motion.p>

            {/* CTAs — two only */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-wrap items-center gap-5"
            >
              <MagneticButton
                onClick={() => scrollTo("services")}
                className="group flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-base shadow-[0_10px_30px_rgba(15,61,46,0.18)] hover:bg-primary/90 transition-all"
              >
                {t.hero.cta1}
                {isArabic ? (
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                ) : (
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                )}
              </MagneticButton>
              <Link
                href="/about"
                className="group flex items-center gap-2 text-foreground text-sm font-bold underline-offset-[6px] underline decoration-primary/30 hover:decoration-primary transition-colors px-1 py-1"
              >
                {t.hero.ctaDiscover}
                {isArabic ? (
                  <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                )}
              </Link>
            </motion.div>
          </div>
        </motion.div>

      </section>

      {/* ══════════════════════════════════════
          SERVICES — Big 4 Editorial Grid 2026
      ══════════════════════════════════════ */}
      <section id="services" className="py-32 dark bg-[#0F3D2E] relative overflow-hidden">

        {/* Modern atmospheric background image */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <img
            src={`${import.meta.env.BASE_URL}services-bg.webp`}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover select-none"
          />
        </div>

        {/* Soft overlay to keep cards readable while letting the image show through */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F3D2E]/85 via-[#0F3D2E]/55 to-[#0F3D2E]/90 pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0F3D2E_85%)] pointer-events-none" aria-hidden="true" />

        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-10 gap-4">
            <div>
              <SectionLabel>{t.services.sectionLabel}</SectionLabel>
              <RevealHeading
                className="font-black text-white leading-tight"
                style={{ fontSize: "clamp(1.65rem, 3.3vw, 2.65rem)" }}
              >
                {t.services.heading1}
              </RevealHeading>
              <RevealHeading
                className="font-black leading-tight"
                style={{ fontSize: "clamp(1.65rem, 3.3vw, 2.65rem)" }}
              >
                <span className="text-secondary">{t.services.heading2}</span>
              </RevealHeading>
            </div>
            <p className="text-white/50 max-w-md text-start text-sm leading-relaxed">
              {t.services.sub}
            </p>
          </div>

          {/* Main services grid — equal cards, 4-col desktop, 2-col tablet, 1-col mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-white/5 mb-px">
            {SERVICES.map((service, i) => (
              <ServiceCard key={service.slug} service={service} index={i} more={t.services.more} />
            ))}
          </div>

        </div>
      </section>


      {/* ══════════════════════════════════════
          METHODOLOGY — The Darnozom Method (holistic, 4 steps)
      ══════════════════════════════════════ */}
      <section className="py-32 bg-transparent border-y border-border overflow-hidden">
        <div className="container mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-4xl">
            <SectionLabel>{t.methodology.sectionLabel}</SectionLabel>
            <RevealHeading
              className="font-black text-primary flex items-center gap-4 mb-6 mt-4"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            >
              <span className="w-12 h-1.5 bg-secondary inline-block shrink-0 rounded-full" />
              {t.methodology.heading}
            </RevealHeading>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t.methodology.methodIntro}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.methodology.steps.map((step, i) => (
              <motion.div
                key={i}
                initial={reduced ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/40 backdrop-blur-sm border border-white/60 shadow-[0_8px_30px_rgba(20,80,60,0.06)] p-8 rounded-2xl relative flex flex-col hover:bg-white/60 hover:shadow-[0_12px_40px_rgba(20,80,60,0.1)] transition-all duration-300"
                data-testid={`home-method-step-${i}`}
              >
                <div
                  className="w-12 h-12 rounded-2xl bg-primary text-secondary font-black text-lg flex items-center justify-center mb-6 shadow-inner"
                  dir="ltr"
                >
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-primary mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CASE STUDIES — Featured (proof of capability)
      ══════════════════════════════════════ */}
      <section id="case-studies-featured" className="py-32 bg-transparent border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-16 gap-8">
            <div className="max-w-3xl">
              <SectionLabel>{isArabic ? "نماذج الأعمال" : "Case Studies"}</SectionLabel>
              <RevealHeading
                className="font-black text-primary leading-tight mt-4"
                style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}
              >
                {isArabic ? "نماذج من أثرنا في تطوير المؤسسات" : "Examples of our impact"}
              </RevealHeading>
              <p className="text-muted-foreground text-lg leading-relaxed mt-6">
                {isArabic
                  ? "مشاريع حقيقية عبر قطاعات وأسواق متعددة — تجمع بين الكفاءة الإدارية والامتثال الشرعي."
                  : "Real engagements across multiple sectors and markets — combining managerial efficiency with Sharia compliance."}
              </p>
            </div>
            <Link
              href="/case-studies"
              className="group inline-flex items-center gap-2 text-secondary font-bold border-b-2 border-secondary pb-1 hover:gap-3 transition-all w-fit shrink-0"
              data-testid="cta-view-all-case-studies"
            >
              {isArabic ? "عرض جميع نماذج الأعمال" : "View all case studies"}
              <ArrowLeft className="w-4 h-4 rtl:hidden group-hover:translate-x-1 transition-transform rotate-180" />
              <ArrowLeft className="w-4 h-4 ltr:hidden group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {getFeaturedCaseStudies().map((cs, i) => (
              <CaseStudyCard key={cs.id} caseStudy={cs} index={i} showCta={false} />
            ))}
          </div>
        </div>
      </section>

      <FeaturedBooksSection />

      {/* ══════════════════════════════════════
          SECTORS — McKinsey number style
      ══════════════════════════════════════ */}
      <section id="sectors" className="py-32 bg-transparent">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-[40fr_60fr] gap-20 items-start">
            <motion.div
              initial={reduced ? false : { opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="sticky top-32"
            >
              <SectionLabel>{t.sectors.sectionLabel}</SectionLabel>
              <RevealHeading
                className="font-black text-primary leading-tight mb-6 mt-4"
                style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)" }}
              >
                {t.sectors.heading}
              </RevealHeading>
              <p className="text-muted-foreground text-lg leading-relaxed">{t.sectors.sub}</p>
            </motion.div>

            <div className="space-y-4">
              {t.sectors.items.map((sector, i) => (
                <motion.div
                  key={i}
                  initial={reduced ? false : { opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group flex items-start gap-8 p-8 rounded-2xl bg-white/30 backdrop-blur-sm border border-white/50 hover:bg-white/60 hover:shadow-[0_12px_40px_rgba(20,80,60,0.08)] transition-all cursor-default"
                >
                  <span className="text-secondary/30 font-black text-3xl shrink-0 group-hover:text-secondary transition-colors leading-none mt-1">
                    {sector.num}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <sector.icon className="w-5 h-5 text-secondary shrink-0" />
                      <div>
                        <span className="font-black text-primary text-2xl">{sector.title}</span>
                        <span className="text-muted-foreground text-xs ml-2 rtl:mr-2 rtl:ml-0 uppercase tracking-wider">· {sector.sub}</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-base leading-relaxed">{sector.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CONTACT
      ══════════════════════════════════════ */}
      <section id="contact" className="py-32 bg-[#F4ECD7]">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-[45fr_55fr] gap-16 lg:gap-24">
            {/* Left info */}
            <motion.div
              initial={reduced ? false : { opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col justify-center"
            >
              <SectionLabel>{t.contact.sectionLabel}</SectionLabel>
              <RevealHeading
                className="font-black text-primary leading-tight mb-8 mt-4"
                style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)" }}
              >
                {t.contact.heading1} <br />
                <span className="text-secondary">{t.contact.heading2}</span>
              </RevealHeading>

              <div className="space-y-8 bg-white/40 backdrop-blur-sm p-8 rounded-2xl border border-white/60 shadow-sm mb-12">
                {[
                  { icon: Phone, label: t.contact.infoItems[0].label, value: t.contact.infoItems[0].value, href: "tel:+201022044240" },
                  { icon: MessageSquare, label: t.contact.infoItems[1].label, value: t.contact.infoItems[1].value, href: "https://wa.me/201022044240" },
                  { icon: Mail, label: t.contact.infoItems[2].label, value: t.contact.infoItems[2].value, href: `mailto:${t.contact.infoItems[2].value}` },
                  { icon: MapPin, label: t.contact.infoItems[3].label, value: t.contact.infoItems[3].value, href: "https://www.google.com/maps/place/The+Address+Compound/@30.043299,30.9786042,17z/" },
                ].map((contact, i) => (
                  <div key={i} className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-xl border border-secondary/30 bg-white/50 flex items-center justify-center shrink-0 shadow-sm">
                      <contact.icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="mt-1">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{contact.label}</div>
                      {contact.href ? (
                        <a
                          href={contact.href}
                          dir={contact.href.startsWith("tel:") || contact.href.startsWith("https://wa.me/") || contact.href.startsWith("mailto:") ? "ltr" : undefined}
                          className="text-lg font-bold text-primary hover:text-secondary transition-colors inline-block"
                        >
                          {contact.value}
                        </a>
                      ) : (
                        <span className="text-lg font-bold text-primary">{contact.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Social links */}
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{t.contact.followUs}</div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Facebook", href: "https://facebook.com/darnozom" },
                    { label: "X", href: "https://x.com/darnozom" },
                    { label: "Instagram", href: "https://instagram.com/darnozom" },
                    { label: "LinkedIn", href: "https://linkedin.com/company/darnozom" },
                  ].map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3 rounded-full bg-white/40 border border-white/60 text-sm font-bold text-primary hover:bg-white hover:border-secondary hover:text-secondary hover:shadow-md transition-all"
                    >
                      {social.label}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={reduced ? false : { opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
            >
              <div className="bg-primary rounded-3xl p-10 md:p-12 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-2 h-full bg-secondary" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
                
                <h3 className="text-white font-black text-2xl mb-8 flex items-center gap-3">
                  <div className="w-8 h-1 bg-secondary rounded-full" />
                  {t.contact.formHeading}
                </h3>
                {contactStatus === "success" ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-8 h-8 text-secondary">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-white font-bold text-xl">{isArabic ? "تم الإرسال بنجاح!" : "Message Sent!"}</p>
                    <p className="text-white/60 text-sm">{isArabic ? "سنتواصل معك قريباً." : "We'll get back to you soon."}</p>
                    <button
                      onClick={() => setContactStatus("idle")}
                      className="mt-4 text-secondary text-sm underline underline-offset-4 hover:text-secondary/80 transition-colors"
                    >
                      {isArabic ? "إرسال رسالة أخرى" : "Send another message"}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-white/60 text-xs uppercase tracking-widest block mb-2">{t.contact.name}</label>
                        <input
                          name="name"
                          value={contactForm.name}
                          onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                          placeholder={t.contact.name}
                          required
                          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 focus:outline-none focus:border-secondary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-xs uppercase tracking-widest block mb-2">{t.contact.email}</label>
                        <input
                          name="email"
                          type="email"
                          value={contactForm.email}
                          onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="your@email.com"
                          dir="ltr"
                          required
                          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 focus:outline-none focus:border-secondary transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-widest block mb-2">{t.contact.subject}</label>
                      <input
                        name="subject"
                        value={contactForm.subject}
                        onChange={e => setContactForm(f => ({ ...f, subject: e.target.value }))}
                        placeholder={t.contact.subject}
                        className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 focus:outline-none focus:border-secondary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-widest block mb-2">{t.contact.message}</label>
                      <textarea
                        name="body"
                        value={contactForm.body}
                        onChange={e => setContactForm(f => ({ ...f, body: e.target.value }))}
                        placeholder={t.contact.message}
                        rows={5}
                        required
                        className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 focus:outline-none focus:border-secondary transition-colors resize-none"
                      />
                    </div>
                    {contactStatus === "error" && (
                      <p className="text-red-400 text-sm">
                        {isArabic ? "حدث خطأ. يرجى المحاولة مرة أخرى." : "Something went wrong. Please try again."}
                      </p>
                    )}
                    <MagneticButton
                      type="submit"
                      disabled={contactStatus === "sending"}
                      className="w-full bg-secondary text-primary py-4 font-black text-base hover:bg-secondary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {contactStatus === "sending"
                        ? (isArabic ? "جارٍ الإرسال…" : "Sending…")
                        : t.contact.send}
                    </MagneticButton>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* GET THE APP BANNER — REMOVED PER REQUEST */}
      {false && <section className="hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 -translate-y-1/2 start-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-secondary/5 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 md:px-12 py-20 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            {/* Left: icon + text */}
            <div className="flex items-center gap-8">
              <div className="hidden md:flex w-20 h-20 rounded-2xl bg-secondary/10 border border-secondary/30 items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-secondary" fill="currentColor">
                  <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
                </svg>
              </div>
              <div>
                <div className="inline-flex items-center gap-2 text-secondary text-xs font-bold tracking-[0.2em] uppercase border border-secondary/40 px-3 py-1 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  {isArabic ? "التطبيق متاح الآن" : "App Available Now"}
                </div>
                <h2 className="font-black text-white mb-2" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
                  {isArabic ? "حمّل تطبيق دار نظم" : "Get DarNozom ConsultAI App"}
                </h2>
                <p className="text-white/50 text-sm leading-relaxed max-w-sm">
                  {isArabic
                    ? "استشارات ذكية في جيبك — تحدث مع الوكيل الذكي في أي وقت ومن أي مكان على iPhone وiPad وAndroid."
                    : "Smart consulting in your pocket — chat with the consulting AI agent anytime, anywhere on iPhone, iPad & Android."}
                </p>
              </div>
            </div>
            {/* Right: download badges */}
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <a
                href="#"
                className="group flex items-center gap-3 bg-white/5 hover:bg-secondary/10 border border-white/10 hover:border-secondary/50 transition-all px-6 py-4"
              >
                <svg className="w-7 h-7 text-white group-hover:text-secondary transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.24 1.31-2.22 3.91.03 3.1 2.73 4.13 2.75 4.14-.03.07-.42 1.44-1.38 2.57M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div>
                  <div className="text-white/40 text-[10px] leading-none">
                    {isArabic ? "متاح على" : "Download on the"}
                  </div>
                  <div className="text-white font-black text-sm leading-tight mt-0.5">App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="group flex items-center gap-3 bg-white/5 hover:bg-secondary/10 border border-white/10 hover:border-secondary/50 transition-all px-6 py-4"
              >
                <svg className="w-7 h-7 text-white group-hover:text-secondary transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.35.2.74.24 1.12.12l12.75-7.36-2.75-2.75-11.12 9.99zM.59 1.27C.22 1.64 0 2.2 0 2.93v18.14c0 .73.22 1.29.59 1.66l.09.09L10.45 13V12.8L.68 1.18l-.09.09zM20.85 10.1l-2.85-1.65-3.07 3.07 3.07 3.07 2.86-1.65c.82-.47.82-1.37-.01-1.84zM4.3.12L17.06 7.48l-2.75 2.75L3.18.24A1.35 1.35 0 014.3.12z"/>
                </svg>
                <div>
                  <div className="text-white/40 text-[10px] leading-none">
                    {isArabic ? "احصل عليه من" : "Get it on"}
                  </div>
                  <div className="text-white font-black text-sm leading-tight mt-0.5">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>}

      {/* ══════════════════════════════════════
          FOOTER (shared across all pages)
      ══════════════════════════════════════ */}
      <SiteFooter />
    </div>
  );
}
