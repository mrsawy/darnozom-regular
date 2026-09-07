import { useLanguage } from "@/lib/language-context";
import { SUCCESS_PARTNERS, type SuccessPartner } from "@/data/success-partners";

function LogoCard({ p, name }: { p: SuccessPartner; name: string }) {
  const cardBg = p.darkBackground
    ? "dark bg-[#134A38] hover:dark bg-[#134A38]"
    : "bg-white hover:bg-white";
  const card = (
    <div
      className={`group h-28 md:h-32 w-44 md:w-52 shrink-0 flex items-center justify-center rounded-sm border border-secondary/15 hover:border-secondary/60 transition-colors duration-300 px-5 py-4 overflow-hidden ${cardBg}`}
    >
      {p.logoUrl ? (
        <img
          src={p.logoUrl}
          alt={name}
          loading="lazy"
          className="h-full w-full object-contain grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
        />
      ) : (
        <span className="text-center text-sm md:text-base font-bold text-foreground/60 group-hover:text-secondary transition-colors duration-300 leading-tight">
          {name}
        </span>
      )}
    </div>
  );
  return p.website ? (
    <a href={p.website} target="_blank" rel="noopener noreferrer" aria-label={name} className="shrink-0">
      {card}
    </a>
  ) : (
    <div className="shrink-0">{card}</div>
  );
}

export default function SuccessPartners() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const items = [...SUCCESS_PARTNERS, ...SUCCESS_PARTNERS];

  return (
    <section id="success-partners" className="py-24 dark bg-[#0F3D2E] text-white scroll-mt-24 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">
          {isAr ? "شركاء النجاح" : "Success Partners"}
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          {isAr ? "نفخر بشراكتنا مع رواد القطاع" : "Proud to Partner With Industry Leaders"}
        </h2>
        <p className="text-white/60 max-w-2xl mb-12 leading-relaxed">
          {isAr
            ? "نخبة من المؤسسات والشركات التي وثقت بدار نظم لتطوير منظومتها الإدارية والشرعية."
            : "A selection of institutions and organizations that trusted DarNozom to elevate their management and Sharia ecosystems."}
        </p>
      </div>

      <div
        dir="ltr"
        className="relative w-full"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0, #000 80px, #000 calc(100% - 80px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, #000 80px, #000 calc(100% - 80px), transparent 100%)",
        }}
      >
        <div className="partners-marquee flex w-max gap-4 hover:[animation-play-state:paused]">
          {items.map((p, idx) => (
            <LogoCard key={`${p.id}-${idx}`} p={p} name={isAr ? p.nameAr : p.nameEn} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes partners-scroll {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .partners-marquee {
          animation: partners-scroll 45s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .partners-marquee { animation: none; }
        }
      `}</style>
    </section>
  );
}
