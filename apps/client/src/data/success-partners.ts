import chemwellLogo from "@/assets/partners/Asset_1@2x_1776790640815.webp";
import logoBlack from "@/assets/partners/Logo_Black_1776790654822.png";
import kaleemLogo from "@/assets/partners/logo_dark_mode_1776790705708.png";
import rosewellLogo from "@/assets/partners/Logo_Full_1776790724521.png";
import mLionLogo from "@/assets/partners/Logo_1776790755824.png";
import blink22Logo from "@/assets/partners/Blink22_1776790797145.png";
import darAlAmalLogo from "@/assets/partners/50934380_2347174335307299_6005306277805162496_n_1777488953078.png";
import leadersAcademyLogo from "@/assets/partners/625344326_122174405594603291_622226040764434685_n_1777488953077.jpg";
import abubakrMoscheeLogo from "@/assets/partners/WhatsApp_Image_2026-04-25_at_3.30.35_PM_1777488953073.jpeg";

export type SuccessPartner = {
  id: string;
  nameAr: string;
  nameEn: string;
  logoUrl?: string;
  website?: string;
  /** Logos designed for dark backgrounds — render on a dark card and skip the light-card invert */
  darkBackground?: boolean;
};

export const SUCCESS_PARTNERS: SuccessPartner[] = [
  { id: "chemwell", nameAr: "كيم ويل", nameEn: "ChemWell", logoUrl: chemwellLogo },
  { id: "rosewell", nameAr: "روزويل للطاقة", nameEn: "Rosewell Energy", logoUrl: rosewellLogo },
  { id: "kaleem", nameAr: "كليم.AI", nameEn: "Kaleem.ai", logoUrl: kaleemLogo, darkBackground: true },
  { id: "blink22", nameAr: "بلينك 22", nameEn: "Blink22", logoUrl: blink22Logo, darkBackground: true },
  { id: "dar-al-amal", nameAr: "دار الأمل للنشر", nameEn: "Dar Al Amal Publishing", logoUrl: darAlAmalLogo },
  { id: "leaders-academy", nameAr: "أكاديمية القادة الإسلامية", nameEn: "Islam Leaders Academy", logoUrl: leadersAcademyLogo },
  { id: "abubakr-moschee-koln", nameAr: "مسجد أبو بكر كولن", nameEn: "Abubakr Moschee Köln", logoUrl: abubakrMoscheeLogo },
  { id: "m-corp", nameAr: "مؤسسة مارشال", nameEn: "Marshall Group", logoUrl: mLionLogo },
  { id: "aspire", nameAr: "أسباير", nameEn: "Aspire", logoUrl: logoBlack },
];
