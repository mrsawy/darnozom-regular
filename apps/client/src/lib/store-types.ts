export type BookFormat = "online" | "hardcopy" | "both";
export type BookLanguage = "ar" | "en" | "both";
export type BookStatus = "available" | "coming_soon" | "out_of_stock";
export type BookCategory = "shariah" | "management" | "digital_transformation";

export interface Book {
  id: number;
  title: string;
  titleEn: string | null;
  author: string | null;
  description: string | null;
  descriptionEn: string | null;
  coverImageUrl: string | null;
  category: BookCategory;
  format: BookFormat;
  language: BookLanguage;
  pages: string | null;
  isbn: string | null;
  price: string | null;
  currency: string | null;
  status: BookStatus;
  isFeatured: boolean;
  isNewRelease: boolean;
  externalUrl: string | null;
  buyLink: string | null;
  paperAvailable: boolean;
  paperPrice: string | null;
  digitalAvailable: boolean;
  digitalPrice: string | null;
  /** Present only on admin endpoints. Public endpoints expose `hasDigitalFile` instead. */
  digitalFileUrl?: string | null;
  hasDigitalFile?: boolean;
  createdAt: string;
}

export type BookEditionFormat = "paper" | "digital";

export interface ShippingRate {
  id: number;
  city: string;
  price: string;
  currency: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CourseDelivery = "online_self" | "online_live" | "onsite" | "hybrid";
export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all_levels";
export type CourseLanguage = "ar" | "en" | "both";
export type CourseStatus = "available" | "coming_soon" | "archived";

export interface StoreCourse {
  id: number;
  titleAr: string;
  titleEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  instructor: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  delivery: CourseDelivery;
  level: CourseLevel;
  language: CourseLanguage;
  durationHours: number | null;
  modules: number | null;
  certification: boolean;
  upcomingDate: string | null;
  location: string | null;
  price: string | null;
  currency: string | null;
  status: CourseStatus;
  isFeatured: boolean;
  isNewRelease: boolean;
  syllabusUrl: string | null;
  createdAt: string;
}

export type AppPlatform = "web" | "ios" | "android" | "all";
export type AppPricing = "free" | "subscription" | "one_time" | "request";
export type AppStatus = "live" | "beta" | "coming_soon";

export interface StoreApp {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string | null;
  taglineAr: string | null;
  taglineEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  iconUrl: string | null;
  category: string | null;
  platform: AppPlatform;
  pricing: AppPricing;
  price: string | null;
  currency: string | null;
  status: AppStatus;
  isFeatured: boolean;
  isNewRelease: boolean;
  webUrl: string | null;
  iosUrl: string | null;
  androidUrl: string | null;
  detailsUrl: string | null;
  createdAt: string;
}
