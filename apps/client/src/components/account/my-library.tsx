import { useEffect, useState } from "react";
import { BookOpen, Clock, Download, Loader2 } from "lucide-react";

// "My Library": digital books the customer bought. Files appear once the
// order's payment is confirmed (see apps/api routes/account/library.ts).

type LibraryFile = {
  id: string;
  title: string;
  fileName: string;
  kind: "pdf" | "epub" | "audio" | "other";
  size: number | null;
  url: string;
};

type LibraryBook = {
  key: string;
  title: string;
  imageUrl: string | null;
  orderId: number;
  status: "available" | "awaiting_payment";
  files: LibraryFile[];
  filesUnavailable?: boolean;
};

const COPY = {
  ar: {
    empty: "لا توجد كتب رقمية في مكتبتك بعد.",
    error: "تعذر تحميل مكتبتك. حاول مرة أخرى لاحقاً.",
    awaiting: "بانتظار تأكيد الدفع — ستظهر الملفات هنا بعد التأكيد.",
    noFiles: "لم تُرفع ملفات هذا الكتاب بعد. سنضيفها قريباً.",
    unavailable: "تعذر تحميل الملفات الآن. حاول مرة أخرى لاحقاً.",
    read: "قراءة",
    download: "تحميل",
    order: "طلب",
  },
  en: {
    empty: "No digital books in your library yet.",
    error: "Couldn't load your library. Please try again later.",
    awaiting: "Awaiting payment confirmation — files appear here once confirmed.",
    noFiles: "This book's files haven't been added yet. We'll add them soon.",
    unavailable: "Files can't be loaded right now. Please try again later.",
    read: "Read",
    download: "Download",
    order: "Order",
  },
} as const;

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function MyLibrary({ lang }: { lang: "ar" | "en" }) {
  const t = COPY[lang];
  const [books, setBooks] = useState<LibraryBook[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/me/library", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body: { books: LibraryBook[] }) => {
        if (!cancelled) setBooks(body.books ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="text-sm text-red-600 py-4" data-testid="library-error">
        {t.error}
      </p>
    );
  }
  if (!books) {
    return (
      <div className="py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }
  if (books.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center" data-testid="library-empty">
        {t.empty}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {books.map((book) => (
        <div key={book.key} className="border border-border p-4 flex gap-4">
          {book.imageUrl ? (
            <img src={book.imageUrl} alt="" className="w-16 h-20 object-cover border border-border shrink-0" />
          ) : (
            <div className="w-16 h-20 bg-muted/40 border border-border flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="font-bold text-primary">{book.title}</div>
            <div className="text-xs text-muted-foreground">
              {t.order} #{book.orderId}
            </div>

            {book.status === "awaiting_payment" ? (
              <p
                className="text-xs text-amber-700 font-bold inline-flex items-center gap-1"
                data-testid={`library-awaiting-${book.key}`}
              >
                <Clock className="w-3 h-3" /> {t.awaiting}
              </p>
            ) : book.filesUnavailable ? (
              <p className="text-xs text-red-600" data-testid={`library-unavailable-${book.key}`}>
                {t.unavailable}
              </p>
            ) : book.files.length === 0 ? (
              <p className="text-xs text-muted-foreground" data-testid={`library-nofiles-${book.key}`}>
                {t.noFiles}
              </p>
            ) : (
              <ul className="divide-y divide-border border border-border">
                {book.files.map((f) => (
                  <li key={f.id} className="p-2.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-primary truncate">{f.title}</div>
                        <div className="text-[11px] text-muted-foreground" dir="ltr">
                          {f.fileName}
                          {f.size ? ` · ${formatSize(f.size)}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.kind === "pdf" && (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-secondary text-primary text-xs font-bold inline-flex items-center gap-1"
                            data-testid={`library-read-${f.id}`}
                          >
                            <BookOpen className="w-3 h-3" /> {t.read}
                          </a>
                        )}
                        <a
                          href={`${f.url}?download=1`}
                          className="px-3 py-1.5 border border-border text-xs font-bold inline-flex items-center gap-1"
                          data-testid={`library-download-${f.id}`}
                        >
                          <Download className="w-3 h-3" /> {t.download}
                        </a>
                      </div>
                    </div>
                    {f.kind === "audio" && (
                      <audio
                        controls
                        preload="none"
                        src={f.url}
                        className="w-full"
                        data-testid={`library-audio-${f.id}`}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
