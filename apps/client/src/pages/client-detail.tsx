import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { PageShell } from "@/components/content/page-shell";
import NotFound from "@/pages/not-found";
import { useLanguage } from "@/lib/language-context";
import { useClientLogo } from "@/lib/cms-api";
import { HOME_MAX_W, HOME_PX } from "@/lib/site-constants";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { isArabic: ar } = useLanguage();
  const { data: c, isLoading, isError } = useClientLogo(id);
  const name = c ? (ar ? c.nameAr : c.nameEn || c.nameAr) : "";
  const description = c ? (ar ? c.descriptionAr || c.descriptionEn : c.descriptionEn || c.descriptionAr) : "";
  const Back = ar ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (name) document.title = `${name} — ${ar ? "دار نظم" : "DarNozom"}`;
  }, [name, ar]);

  if (isError) return <NotFound />;

  return (
    <PageShell footerTone="light">
      <section className="dark bg-[#183650] text-white pt-32 pb-12">
        <div className={`mx-auto ${HOME_MAX_W} ${HOME_PX}`}>
          <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
            <Back className="w-4 h-4" /> {ar ? "كل العملاء" : "All clients"}
          </Link>
          <h1 className="mt-5 text-3xl md:text-5xl font-bold">{isLoading ? <Skeleton className="h-12 w-64" /> : name}</h1>
        </div>
      </section>
      <section className={`mx-auto ${HOME_MAX_W} ${HOME_PX} py-14`}>
        {c && (
          <div className="grid gap-10 md:grid-cols-[280px_1fr] items-start">
            <div className={`aspect-[5/3] flex items-center justify-center overflow-hidden border border-black/10 ${c.darkBackground ? "bg-[#244B70]" : "bg-white"}`}>
              {c.logoUrl ? <img src={c.logoUrl} alt={name} className="h-full w-full object-cover" /> : <span className="font-bold text-[#244B70]/70">{name}</span>}
            </div>
            <div>
              {description && <p className="text-lg leading-8 text-black/75 whitespace-pre-line">{description}</p>}
              {c.websiteUrl && (
                <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#244B70] underline underline-offset-4 hover:text-[#183650]">
                  {ar ? "زيارة الموقع" : "Visit website"} <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
