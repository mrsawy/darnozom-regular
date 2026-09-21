import { LegalPage } from "@/components/legal-page";

export default function ReturnPolicyPage() {
  return (
    <LegalPage
      titleAr="سياسة الإرجاع"
      titleEn="Return Policy"
      updatedAr="آخر تحديث: سبتمبر 2026 — نص توضيحي قابل للتعديل."
      updatedEn="Last updated: September 2026 — placeholder copy for legal review."
      sectionsAr={[
        {
          heading: "1. الكتب الورقية",
          paragraphs: [
            "يمكن طلب إرجاع النسخ الورقية خلال 14 يوماً من الاستلام إذا كانت غير مستخدمة وفي حالتها الأصلية، ما لم يُنص على خلاف ذلك عند الشراء.",
            "تكاليف الشحن للإرجاع قد يتحملها العميل ما لم يكن الخطأ من جانبنا (منتج تالف أو خاطئ).",
          ],
        },
        {
          heading: "2. المنتجات الرقمية",
          paragraphs: [
            "الكتب والملفات الرقمية غير قابلة للإرجاع بعد إتمام الدفع وفتح الوصول، باستثناء عيب تقني يمنع التحميل أو القراءة ونعجز عن إصلاحه خلال مدة معقولة.",
          ],
        },
        {
          heading: "3. كيفية طلب الإرجاع",
          paragraphs: [
            "تواصلوا معنا على info@darnozom.com مع رقم الطلب وسبب الإرجاع. سنؤكد الخطوات وعنوان الشحن إن لزم.",
          ],
        },
        {
          heading: "4. الاسترداد",
          paragraphs: [
            "بعد استلام المنتج وفحصه، يُعاد المبلغ عبر وسيلة الدفع الأصلية خلال مدة معقولة حسب مزود الدفع.",
          ],
        },
      ]}
      sectionsEn={[
        {
          heading: "1. Physical books",
          paragraphs: [
            "Paper editions may be returned within 14 days of delivery if unused and in original condition, unless stated otherwise at purchase.",
            "Return shipping may be at the customer’s expense unless the issue is our fault (damaged or incorrect item).",
          ],
        },
        {
          heading: "2. Digital products",
          paragraphs: [
            "Digital books and files are non-returnable after payment and access are granted, except where a technical defect prevents download or reading and we cannot fix it within a reasonable time.",
          ],
        },
        {
          heading: "3. How to request a return",
          paragraphs: [
            "Contact info@darnozom.com with your order number and reason. We will confirm next steps and a return address if needed.",
          ],
        },
        {
          heading: "4. Refunds",
          paragraphs: [
            "After we receive and inspect the item, refunds are issued to the original payment method within a reasonable period depending on the payment provider.",
          ],
        },
      ]}
    />
  );
}
