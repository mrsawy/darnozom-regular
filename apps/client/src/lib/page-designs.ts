export const HOME_HERO_DESIGNS = ["classic", "split", "centered", "magazine", "thumbs", "sidebar", "jusoor", "masarat", "rosewell"] as const;
export const ABOUT_DESIGNS = ["classic", "split", "editorial", "immersive", "rosewell"] as const;
export type HomeHeroDesign = (typeof HOME_HERO_DESIGNS)[number];
export type AboutDesign = (typeof ABOUT_DESIGNS)[number];

export interface PageDesigns { homeHero: HomeHeroDesign; about: AboutDesign }
export const DEFAULT_DESIGNS: PageDesigns = { homeHero: "classic", about: "classic" };

/** Stored values are untrusted: anything unrecognised falls back to the default design. */
export function mergeDesigns(stored: Partial<Record<keyof PageDesigns, unknown>> | null | undefined): PageDesigns {
  const pick = <T extends string>(list: readonly T[], v: unknown, d: T): T => (list as readonly unknown[]).includes(v) ? (v as T) : d;
  return {
    homeHero: pick(HOME_HERO_DESIGNS, stored?.homeHero, DEFAULT_DESIGNS.homeHero),
    about: pick(ABOUT_DESIGNS, stored?.about, DEFAULT_DESIGNS.about),
  };
}

export const HOME_HERO_META: Record<HomeHeroDesign, { titleAr: string; descAr: string }> = {
  classic: { titleAr: "كلاسيكي", descAr: "خلفية بعرض الصفحة مع شريط بطاقات سفلي للتنقل بين المختارات." },
  split: { titleAr: "منقسم", descAr: "لوحة نصية داكنة بجانب صورة كبيرة، مع أسهم ونقاط تنقل." },
  centered: { titleAr: "مركزي", descAr: "عنوان كبير في المنتصف فوق الصورة، بأسلوب بسيط وهادئ." },
  magazine: { titleAr: "مجلة", descAr: "بطاقة رئيسية كبيرة بجانب بطاقات مصغّرة على خلفية فاتحة." },
  thumbs: { titleAr: "شريط الصور", descAr: "على نمط الكلاسيكي: صور مصغّرة لكل العناصر أسفل الخلفية للتنقل بينها." },
  sidebar: { titleAr: "قائمة جانبية", descAr: "على نمط الكلاسيكي: قائمة عناصر مرقّمة بجانب الصورة مع مؤشر تقدم." },
  jusoor: { titleAr: "على طريقة جسور", descAr: "صورة بعرض الصفحة وعنوان كبير أسفلها وأزرار تنقل دائرية، وشريط تنقل نظيف." },
  masarat: { titleAr: "على طريقة مسارات", descAr: "مدمج وأنيق: بطاقة رئيسية وقائمة عناصر مرتبة، مع مسافات أصغر بين الأقسام." },
  rosewell: { titleAr: "على طريقة روزويل", descAr: "غلاف كبير بشريط تنقل شفاف، وبطاقات زجاجية مرقّمة للعناصر في أسفله." },
};

/** The navbar look that goes best with each hero. */
export type NavVariant = "default" | "compact" | "overlay";
export const HERO_NAV: Record<HomeHeroDesign, NavVariant> = {
  classic: "default", split: "default", centered: "overlay", magazine: "compact",
  thumbs: "default", sidebar: "default", jusoor: "compact", masarat: "compact", rosewell: "overlay",
};

export const ABOUT_META: Record<AboutDesign, { titleAr: string; descAr: string }> = {
  classic: { titleAr: "كلاسيكي", descAr: "غلاف داكن بالصورة، وبطاقتا الرؤية والرسالة تتداخلان معه." },
  split: { titleAr: "منقسم", descAr: "نص بجانب صورة على خلفية فاتحة، والمنهج كخط زمني عمودي." },
  editorial: { titleAr: "تحريري", descAr: "عناوين كبيرة وصورة عريضة، والمنهج في أعمدة، والقيم كوسوم." },
  immersive: { titleAr: "غامر", descAr: "صفحة داكنة بالكامل بتوسيط الغلاف وبطاقات زجاجية." },
  rosewell: { titleAr: "على طريقة روزويل", descAr: "شريط عنوان ثم أقسام متتابعة، لكل قسم صورة بجانبه بالتبادل يمينًا ويسارًا." },
};
