// HTML is sanitised server-side (apps/api/src/lib/cms/sanitize.ts) before storage.
export function RichHtml({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null;
  return (
    <div
      className={`prose prose-lg max-w-none prose-headings:text-navy prose-headings:font-bold prose-a:text-navy prose-blockquote:border-gold prose-p:text-ink ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
