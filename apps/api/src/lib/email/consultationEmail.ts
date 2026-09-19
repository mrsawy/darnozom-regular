interface BookingEmailParams {
  to: string;
  clientName: string;
  startsAt: Date;
  durationMinutes: number;
  consultationType?: string | null;
  notes?: string | null;
  meetLink?: string | null;
  calendarLink?: string | null;
  timeZone?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Darnozom Consulting <noreply@darnozom.com>";

function fmtDate(d: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function buildHtml(p: BookingEmailParams): string {
  const tz = p.timeZone ?? "Asia/Riyadh";
  const when = fmtDate(p.startsAt, tz);
  const endTime = new Date(p.startsAt.getTime() + p.durationMinutes * 60_000);
  const endStr = fmtDate(endTime, tz);
  const meetBlock = p.meetLink
    ? `<p style="margin: 16px 0;"><a href="${p.meetLink}" style="display:inline-block;background:#0D1B3E;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">انضم عبر Google Meet</a></p>
       <p style="margin:8px 0;font-size:13px;color:#666;">رابط مباشر: <a href="${p.meetLink}" style="color:#0D1B3E;">${p.meetLink}</a></p>`
    : `<p style="margin: 16px 0; padding: 12px; background:#fff8e6; border:1px solid #C9A84C; color:#7a5b00; font-size:13px;">⚠️ سيتم إرسال رابط الاجتماع لاحقاً عبر بريد إلكتروني منفصل.</p>`;
  const calBlock = p.calendarLink
    ? `<p style="margin: 12px 0; font-size:13px;"><a href="${p.calendarLink}" style="color:#0D1B3E;text-decoration:underline;">إضافة الحدث إلى تقويم Google</a></p>`
    : "";
  const notesBlock = p.notes
    ? `<p style="margin:12px 0;color:#555;"><strong>ملاحظاتك:</strong><br/>${escapeHtml(p.notes)}</p>`
    : "";
  const typeBlock = p.consultationType
    ? `<p style="margin:6px 0;color:#555;"><strong>نوع الاستشارة:</strong> ${escapeHtml(p.consultationType)}</p>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"/></head>
<body style="font-family: Arial, 'Tahoma', sans-serif; background:#f5f5f5; margin:0; padding:0;">
  <div style="max-width:600px; margin:40px auto; background:#fff; border-radius:8px; overflow:hidden;">
    <div style="background:#0D1B3E; padding:28px 32px;">
      <p style="color:#C9A84C; font-size:20px; margin:0; font-weight:bold;">دار نظم | Darnozom Consulting</p>
      <p style="color:#fff; font-size:13px; margin:6px 0 0;">تأكيد حجز استشارة</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px; color:#0D1B3E;">مرحباً ${escapeHtml(p.clientName)}،</h2>
      <p style="margin:0 0 20px; color:#333; font-size:15px; line-height:1.7;">
        شكراً لحجز موعدك معنا. تم تأكيد الاستشارة بالتفاصيل التالية:
      </p>
      <div style="border:1px solid #eee; border-right:4px solid #C9A84C; padding:16px; background:#fafafa; margin:16px 0;">
        <p style="margin:6px 0;color:#0D1B3E;"><strong>الموعد:</strong> ${when}</p>
        <p style="margin:6px 0;color:#0D1B3E;"><strong>تنتهي:</strong> ${endStr}</p>
        ${typeBlock}
        ${notesBlock}
      </div>
      ${meetBlock}
      ${calBlock}
      <p style="margin-top:24px; color:#888; font-size:12px; line-height:1.6;">
        إذا احتجت إلى إلغاء الحجز أو تغييره، يمكنك إدارة استشاراتك من صفحة "حسابي" على موقعنا، أو الرد على هذا البريد.
      </p>
    </div>
    <div style="background:#f5f5f5; padding:16px 32px; text-align:center; color:#888; font-size:11px;">
      © Darnozom Consulting
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendBookingConfirmation(
  params: BookingEmailParams,
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "Email service not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [params.to],
        subject: "تأكيد حجز استشارة | Darnozom Consulting",
        html: buildHtml(params),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Email send failed: ${res.status} ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email error" };
  }
}
