import { useEffect } from "react";
import { Link } from "wouter";
import { PageShell } from "@/components/content/page-shell";
import { useLanguage } from "@/lib/language-context";
import { useClientLogos } from "@/lib/cms-api";
import { HOME_MAX_W, HOME_PX } from "@/lib/site-constants";
import { Skeleton } from "@/components/ui/skeleton";

export default function Clients() {
  const { isArabic: ar } = useLanguage();
  const { data, isLoading, isError } = useClientLogos();
  useEffect(() => {
    document.title = ar ? "عملاؤنا — دار نظم" : "Our Clients — DarNozom";
  }, [ar]);

  return (
    <PageShell footerTone="light">
      <section className="dark bg-[#183650] text-white pt-32 pb-16">
        <div className={`mx-auto ${HOME_MAX_W} ${HOME_PX}`}>
          <h1 className="text-4xl md:text-5xl font-bold">{ar ? "عملاؤنا" : "Our Clients"}</h1>
          <p className="mt-4 max-w-2xl text-white/70 leading-relaxed">
            {ar ? "مؤسسات وشركات وثقت بدار نظم، نفخر بشراكتنا معها." : "Institutions and companies that trust DarNozom. We are proud to work with them."}
          </p>
        </div>
      </section>
      <section className={`mx-auto ${HOME_MAX_W} ${HOME_PX} py-14`}>
        {isLoading && (
          <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        )}
        {isError && <p className="text-center text-black/60">{ar ? "تعذّر تحميل القائمة." : "Could not load the list."}</p>}
        {data && data.length === 0 && <p className="text-center text-black/60">{ar ? "لا يوجد عملاء لعرضهم حاليًا." : "No clients to show yet."}</p>}
        {data && data.length > 0 && (
          <ul className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.map((c) => {
              const name = ar ? c.nameAr : c.nameEn || c.nameAr;
              return (
                <li key={c.id}>
                  <Link href={`/clients/${c.id}`} className="group block border border-black/10 hover:border-[#244B70]/50 transition-colors">
                    <div className={`aspect-[5/3] flex items-center justify-center overflow-hidden ${c.darkBackground ? "bg-[#244B70]" : "bg-white"}`}>
                      {c.logoUrl ? (
                        <img src={c.logoUrl} alt={name} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-bold text-[#244B70]/70 text-center">{name}</span>
                      )}
                    </div>
                    <div className="border-t border-black/10 px-4 py-3 text-center font-semibold text-[#183650] group-hover:text-[#244B70]">{name}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
