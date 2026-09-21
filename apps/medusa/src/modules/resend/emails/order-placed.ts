function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatPrice(amount: unknown, currencyCode: unknown): string {
  const n =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? Number.parseFloat(amount)
        : Number.NaN
  const currency = String(currencyCode || "EGP").toUpperCase()
  if (!Number.isFinite(n)) return ""
  try {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(n)
  } catch {
    return `${n} ${currency}`
  }
}

type OrderLike = {
  display_id?: number | string
  email?: string
  currency_code?: string
  total?: unknown
  item_total?: unknown
  tax_total?: unknown
  customer?: { first_name?: string | null } | null
  shipping_address?: { first_name?: string | null } | null
  items?: Array<{
    id?: string
    product_title?: string | null
    variant_title?: string | null
    total?: unknown
  }> | null
  shipping_methods?: Array<{
    id?: string
    name?: string | null
    total?: unknown
  }> | null
}

export function orderPlacedEmailHtml(props: Record<string, unknown>): string {
  const order = (props.order ?? {}) as OrderLike
  const name =
    order.customer?.first_name ||
    order.shipping_address?.first_name ||
    "عميلنا"
  const currency = order.currency_code || "egp"
  const items = order.items ?? []
  const shipping = order.shipping_methods ?? []

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          <strong>${escapeHtml(item.product_title)}</strong>
          ${item.variant_title ? `<br/><span style="color:#666;font-size:13px;">${escapeHtml(item.variant_title)}</span>` : ""}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:left;white-space:nowrap;">
          ${escapeHtml(formatPrice(item.total, currency))}
        </td>
      </tr>`,
    )
    .join("")

  const shippingRows = shipping
    .map(
      (method) => `
      <tr>
        <td style="padding:4px 0;color:#555;">${escapeHtml(method.name || "الشحن")}</td>
        <td style="padding:4px 0;text-align:left;">${escapeHtml(formatPrice(method.total, currency))}</td>
      </tr>`,
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:Tahoma,Arial,sans-serif;color:#222;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#1a1a1a;color:#fff;padding:16px 24px;font-weight:bold;">دار النظم</div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 8px;font-size:20px;">شكراً لطلبك، ${escapeHtml(name)}</h1>
      <p style="margin:0 0 16px;color:#555;">استلمنا طلبك رقم #${escapeHtml(order.display_id)} وسنخطرك عند الشحن.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        ${itemRows}
      </table>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;color:#555;">المجموع الفرعي</td>
          <td style="padding:4px 0;text-align:left;">${escapeHtml(formatPrice(order.item_total, currency))}</td>
        </tr>
        ${shippingRows}
        <tr>
          <td style="padding:4px 0;color:#555;">الضريبة</td>
          <td style="padding:4px 0;text-align:left;">${escapeHtml(formatPrice(order.tax_total || 0, currency))}</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;font-weight:bold;border-top:1px solid #ddd;">الإجمالي</td>
          <td style="padding:12px 0 0;text-align:left;font-weight:bold;border-top:1px solid #ddd;">${escapeHtml(formatPrice(order.total, currency))}</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`
}
