function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function passwordResetEmailHtml(props: Record<string, unknown>): string {
  const resetUrl = escapeHtml(props.reset_url || props.url || "#")
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:Tahoma,Arial,sans-serif;color:#222;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;">
    <h1 style="margin:0 0 12px;font-size:20px;">إعادة تعيين كلمة المرور</h1>
    <p style="margin:0 0 16px;color:#555;">اضغط الزر أدناه لإعادة تعيين كلمة المرور. إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>
    <p style="margin:0;">
      <a href="${resetUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;">إعادة التعيين</a>
    </p>
  </div>
</body>
</html>`
}
