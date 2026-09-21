import { LegalPage } from "@/components/legal-page";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      titleAr="سياسة الخصوصية"
      titleEn="Privacy Policy"
      updatedAr="آخر تحديث: سبتمبر 2026 — نص توضيحي قابل للتعديل."
      updatedEn="Last updated: September 2026 — placeholder copy for legal review."
      sectionsAr={[
        {
          heading: "1. مقدمة",
          paragraphs: [
            "تحترم دار نظم خصوصيتكم. توضح هذه السياسة كيف نجمع البيانات الشخصية ونستخدمها ونحميها عند استخدام موقعنا أو متجر الكتب أو طلب الخدمات.",
          ],
        },
        {
          heading: "2. البيانات التي نجمعها",
          paragraphs: [
            "قد نجمع الاسم والبريد الإلكتروني ورقم الهاتف وعنوان الشحن وبيانات الطلب عند إتمام شراء أو تسجيل أو طلب خدمة.",
            "كما قد تُجمع بيانات تقنية محدودة (مثل نوع المتصفح) لتحسين الأداء والأمان.",
          ],
        },
        {
          heading: "3. كيف نستخدم البيانات",
          paragraphs: [
            "نستخدم بياناتكم لتنفيذ الطلبات، والتواصل بشأن الشحن والدفع، وتقديم الدعم، وتحسين خدماتنا، والامتثال للمتطلبات القانونية.",
          ],
        },
        {
          heading: "4. المشاركة مع أطراف ثالثة",
          paragraphs: [
            "قد نشارك بيانات ضرورية مع مزودي الدفع والشحن والاستضافة فقط بقدر ما يلزم لإتمام الخدمة. لا نبيع بياناتكم الشخصية.",
          ],
        },
        {
          heading: "5. حقوقكم",
          paragraphs: [
            "يمكنكم طلب الاطلاع على بياناتكم أو تصحيحها أو حذفها ضمن الحدود القانونية عبر التواصل على info@darnozom.com.",
          ],
        },
      ]}
      sectionsEn={[
        {
          heading: "1. Introduction",
          paragraphs: [
            "DarNozom respects your privacy. This policy explains how we collect, use, and protect personal data when you use our website, book store, or request services.",
          ],
        },
        {
          heading: "2. Data we collect",
          paragraphs: [
            "We may collect your name, email, phone number, shipping address, and order details when you purchase, register, or request a service.",
            "Limited technical data (such as browser type) may also be collected to improve performance and security.",
          ],
        },
        {
          heading: "3. How we use data",
          paragraphs: [
            "We use your data to fulfil orders, communicate about shipping and payment, provide support, improve our services, and comply with legal obligations.",
          ],
        },
        {
          heading: "4. Sharing with third parties",
          paragraphs: [
            "We may share necessary data with payment, shipping, and hosting providers only as needed to deliver the service. We do not sell your personal data.",
          ],
        },
        {
          heading: "5. Your rights",
          paragraphs: [
            "You may request access, correction, or deletion of your data within legal limits by contacting info@darnozom.com.",
          ],
        },
      ]}
    />
  );
}
