import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      titleAr="الشروط والأحكام"
      titleEn="Terms & Conditions"
      updatedAr="آخر تحديث: سبتمبر 2026 — نص توضيحي قابل للتعديل."
      updatedEn="Last updated: September 2026 — placeholder copy for legal review."
      sectionsAr={[
        {
          heading: "1. القبول",
          paragraphs: [
            "باستخدام موقع دار نظم أو متجر الكتب أو طلب أي خدمة، فإنكم توافقون على هذه الشروط. إن لم توافقوا، يُرجى عدم استخدام المنصة.",
          ],
        },
        {
          heading: "2. الخدمات والمنتجات",
          paragraphs: [
            "نقدم استشارات ومنتجات رقمية وورقية (كتب وغيرها). قد تختلف التفاصيل والأسعار والتوفر دون إشعار مسبق ضمن الحدود المعقولة.",
          ],
        },
        {
          heading: "3. الحسابات والطلبات",
          paragraphs: [
            "أنتم مسؤولون عن دقة بيانات الحساب والطلب. نحتفظ بحق رفض أو إلغاء طلبات مشبوهة أو مخالفة لهذه الشروط.",
          ],
        },
        {
          heading: "4. الملكية الفكرية",
          paragraphs: [
            "المحتوى والعلامات والمواد على الموقع مملوكة لدار نظم أو مرخّصة لها. لا يجوز النسخ أو إعادة التوزيع دون إذن كتابي، باستثناء ما يسمح به القانون.",
          ],
        },
        {
          heading: "5. المسؤولية",
          paragraphs: [
            "نبذل عناية معقولة في تقديم الخدمات. لا نتحمل مسؤولية أضرار غير مباشرة أو تبعية ناتجة عن استخدام الموقع، في حدود ما يسمح به القانون المعمول به.",
          ],
        },
      ]}
      sectionsEn={[
        {
          heading: "1. Acceptance",
          paragraphs: [
            "By using the DarNozom website, book store, or requesting any service, you agree to these terms. If you do not agree, please do not use the platform.",
          ],
        },
        {
          heading: "2. Services and products",
          paragraphs: [
            "We offer consulting and digital/physical products (including books). Details, prices, and availability may change within reasonable bounds without prior notice.",
          ],
        },
        {
          heading: "3. Accounts and orders",
          paragraphs: [
            "You are responsible for the accuracy of account and order details. We may refuse or cancel suspicious or non-compliant orders.",
          ],
        },
        {
          heading: "4. Intellectual property",
          paragraphs: [
            "Content, marks, and materials on the site are owned by or licensed to DarNozom. Copying or redistribution without written permission is prohibited except as allowed by law.",
          ],
        },
        {
          heading: "5. Liability",
          paragraphs: [
            "We take reasonable care in delivering services. To the extent permitted by applicable law, we are not liable for indirect or consequential damages arising from use of the site.",
          ],
        },
      ]}
    />
  );
}
