import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { HOME_MAX_W, HOME_PX } from "@/lib/site-constants";
import type { ClientLogo } from "@/lib/cms-types";

function LogoCard({ logo, name }: { logo: ClientLogo; name: string }) {
  const card = (
    <div
      className={`group aspect-[5/3] w-40 md:w-52 flex items-center justify-center border border-black/10 hover:border-[#244B70]/50 transition-colors duration-300 overflow-hidden ${
        logo.darkBackground ? "bg-[#244B70]" : "bg-white"
      }`}
    >
      {logo.logoUrl ? (
        <img
          src={logo.logoUrl}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
        />
      ) : (
        <span className="text-center text-sm md:text-base font-bold text-[#244B70]/70 leading-tight px-3">{name}</span>
      )}
    </div>
  );
  return (
    <Link href={`/clients/${logo.id}`} aria-label={name} className="shrink-0">
      {card}
    </Link>
  );
}

/** "Our clients" strip: a slow, hover-pausable logo marquee. Each logo opens that client's own page (/clients/:id). Admin-managed from /admin/client-logos. */
export function ClientsStrip({ logos }: { logos: ClientLogo[] }) {
  const { isArabic: ar } = useLanguage();
  // Repeat the set until one half is wider than any screen, then translate by exactly one half for a seamless loop.
  const reps = Math.max(2, Math.ceil(12 / logos.length));
  const half = Array.from({ length: reps }, () => logos).flat();
  const items = [...half, ...half];
  const seconds = Math.max(25, half.length * 5);

  return (
    <section id="our-clients" className="overflow-hidden">
      <div className={`mx-auto ${HOME_MAX_W} ${HOME_PX} mb-8 text-center`}>
        <h2 className="text-2xl md:text-3xl font-bold text-[#183650]">{ar ? "عملاؤنا" : "Our Clients"}</h2>
        <p className="mt-2 text-sm md:text-base text-black/60">
          {ar ? "مؤسسات وشركات وثقت بدار نظم." : "Institutions and companies that trust DarNozom."}
        </p>
        <Link href="/clients" className="mt-3 inline-block text-sm font-semibold text-[#244B70] underline underline-offset-4 hover:text-[#183650]">
          {ar ? "عرض كل العملاء" : "View all clients"}
        </Link>
      </div>
      <div
        dir="ltr"
        className="w-full"
        style={{
          maskImage: "linear-gradient(to right, transparent 0, #000 80px, #000 calc(100% - 80px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 80px, #000 calc(100% - 80px), transparent 100%)",
        }}
      >
        <div
          className="clients-marquee flex w-max gap-4 hover:[animation-play-state:paused]"
          style={{ animationDuration: `${seconds}s` }}
        >
          {items.map((logo, i) => (
            <LogoCard key={`${logo.id}-${i}`} logo={logo} name={ar ? logo.nameAr : logo.nameEn || logo.nameAr} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes clients-scroll { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        .clients-marquee { animation: clients-scroll 45s linear infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .clients-marquee { animation: none; } }
      `}</style>
    </section>
  );
}
