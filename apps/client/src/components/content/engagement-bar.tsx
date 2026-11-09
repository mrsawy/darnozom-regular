import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Eye, Facebook, Heart, Instagram, Link2, Linkedin, Mail, MessageCircle, Send, Share2, Twitter } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useSession } from "@/lib/auth-client";
import {
  formatCount, recordShare, recordView, shareUrl, useComments, useDeleteComment, useEngagement, usePostComment,
  useToggleLike, type ShareChannel,
} from "@/lib/cms-engagement";

type Props = { itemId: number; title: string; preview?: boolean };

const btn = "inline-flex items-center gap-2 min-h-11 px-3 border border-line rounded bg-white text-sm font-semibold text-navy hover:bg-mist";

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  const { language } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      {icon}
      <span className="font-semibold text-navy">{formatCount(value, language)}</span>
      <span>{label}</span>
    </span>
  );
}

/** Share buttons + view/share/like/comment counters + like button, shown under every CMS item. */
export function EngagementBar({ itemId, title, preview }: Props) {
  const { language: lang, isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const { data: session } = useSession();
  const q = useEngagement(itemId);
  const like = useToggleLike(itemId);
  const [copied, setCopied] = useState(false);
  const e = q.data;

  useEffect(() => {
    if (!preview) recordView(itemId);
  }, [itemId, preview]);

  const pageUrl = () => window.location.href.replace(/[?&]preview=1/, "");
  const count = (channel: ShareChannel) => {
    if (preview) return;
    recordShare(itemId, channel)
      .then((r) => q.refetch().then(() => r))
      .catch(() => {});
  };
  const open = (channel: Exclude<ShareChannel, "copy" | "native" | "instagram">) => {
    count(channel);
    window.open(shareUrl(channel, pageUrl(), title), "_blank", "noopener,noreferrer");
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(pageUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    count("copy");
  };
  // Instagram has no web share URL. On phones the native share sheet lists the app; on desktop we
  // copy the link and open Instagram so the reader can paste it into a post, story or message.
  const instagram = async () => {
    if (typeof navigator.share === "function" && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try { await navigator.share({ url: pageUrl(), title }); count("instagram"); } catch { /* cancelled */ }
      return;
    }
    await navigator.clipboard?.writeText(pageUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    count("instagram");
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };
  const native = async () => {
    try {
      await navigator.share({ url: pageUrl(), title });
      count("native");
    } catch { /* user cancelled */ }
  };

  const channels: { id: Exclude<ShareChannel, "copy" | "native" | "instagram">; label: string; icon: React.ReactNode }[] = [
    { id: "x", label: "X", icon: <Twitter className="w-4 h-4" aria-hidden /> },
    { id: "facebook", label: "Facebook", icon: <Facebook className="w-4 h-4" aria-hidden /> },
    { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-4 h-4" aria-hidden /> },
    { id: "telegram", label: "Telegram", icon: <Send className="w-4 h-4" aria-hidden /> },
    { id: "linkedin", label: "LinkedIn", icon: <Linkedin className="w-4 h-4" aria-hidden /> },
    { id: "email", label: t("البريد", "Email"), icon: <Mail className="w-4 h-4" aria-hidden /> },
  ];

  return (
    <section aria-label={t("المشاركة والتفاعل", "Share and engagement")} className="mt-10 border-t border-line pt-6">
      {e && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted" data-testid="engagement-stats">
          <Stat icon={<Eye className="w-4 h-4" aria-hidden />} value={e.viewCount} label={t("مشاهدة", "views")} />
          <Stat icon={<Share2 className="w-4 h-4" aria-hidden />} value={e.shareCount} label={t("مشاركة", "shares")} />
          {e.likesEnabled && <Stat icon={<Heart className="w-4 h-4" aria-hidden />} value={e.likeCount} label={t("إعجاب", "likes")} />}
          {e.commentsEnabled && <Stat icon={<MessageCircle className="w-4 h-4" aria-hidden />} value={e.commentCount} label={t("تعليق", "comments")} />}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-navy me-1">{t("شارك:", "Share:")}</span>
        {channels.map((c) => (
          <button key={c.id} type="button" onClick={() => open(c.id)} className={btn} aria-label={t(`مشاركة عبر ${c.label}`, `Share on ${c.label}`)}>
            {c.icon} <span className="hidden sm:inline">{c.label}</span>
          </button>
        ))}
        <button type="button" onClick={instagram} className={btn} aria-label={t("مشاركة عبر Instagram", "Share on Instagram")}>
          <Instagram className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">Instagram</span>
        </button>
        <button type="button" onClick={copy} className={btn}>
          {copied ? <Check className="w-4 h-4" aria-hidden /> : <Link2 className="w-4 h-4" aria-hidden />}
          {copied ? t("تم نسخ الرابط", "Link copied") : t("نسخ الرابط", "Copy link")}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button type="button" onClick={native} className={btn}><Share2 className="w-4 h-4" aria-hidden />{t("المزيد", "More")}</button>
        )}
        {e?.likesEnabled && (
          <button
            type="button" aria-pressed={e.liked} disabled={like.isPending || preview}
            onClick={() => like.mutate(!e.liked)}
            className={`${btn} ms-auto ${e.liked ? "bg-gold-light" : ""}`}
          >
            <Heart className={`w-4 h-4 ${e.liked ? "fill-current" : ""}`} aria-hidden />
            {e.liked ? t("أعجبني", "Liked") : t("إعجاب", "Like")}
          </button>
        )}
      </div>

      {e?.commentsEnabled && <Comments itemId={itemId} signedIn={!!session} lang={lang} preview={preview} />}
    </section>
  );
}

const GUEST_NAME_KEY = "dn-guest-name";
const readGuestName = () => { try { return localStorage.getItem(GUEST_NAME_KEY) ?? ""; } catch { return ""; } };

function Comments({ itemId, signedIn, lang, preview }: { itemId: number; signedIn: boolean; lang: "ar" | "en"; preview?: boolean }) {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [location] = useLocation();
  const list = useComments(itemId, true);
  const post = usePostComment(itemId);
  const del = useDeleteComment(itemId);
  const [text, setText] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [guestName, setGuestName] = useState(readGuestName);

  const send = (name?: string) =>
    post.mutate({ body: text.trim(), guestName: name }, { onSuccess: () => { setText(""); setChoosing(false); } });
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!text.trim()) return;
    if (signedIn) send();
    else setChoosing(true);
  };
  const submitGuest = (ev: React.FormEvent) => {
    ev.preventDefault();
    const name = guestName.trim();
    if (!name) return;
    try { localStorage.setItem(GUEST_NAME_KEY, name); } catch { /* storage blocked */ }
    send(name);
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-navy mb-3">{t("التعليقات", "Comments")}</h2>
      <form onSubmit={submit} className="space-y-2">
        <textarea
          aria-label={t("اكتب تعليقًا", "Write a comment")} value={text} onChange={(e) => setText(e.target.value)}
          rows={3} maxLength={2000} disabled={preview} className="w-full px-3 py-2 border border-line rounded bg-white"
        />
        {post.isError && !choosing && <p role="alert" className="text-sm text-destructive">{(post.error as Error).message}</p>}
        <button type="submit" disabled={post.isPending || !text.trim() || preview} className={btn}>{t("نشر التعليق", "Post comment")}</button>
      </form>

      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("كيف تريد التعليق؟", "How would you like to comment?")}</DialogTitle>
            <DialogDescription>{t("يمكنك التعليق كزائر بالاسم فقط، أو تسجيل الدخول لتعليق باسم حسابك.", "Comment as a guest with just a name, or sign in to use your account.")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitGuest} className="space-y-3">
            <label className="block">
              <span className="text-sm font-semibold">{t("اسمك", "Your name")}</span>
              <input
                value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={80} autoFocus required
                className="w-full min-h-10 px-3 border border-line rounded bg-white"
              />
            </label>
            {post.isError && <p role="alert" className="text-sm text-destructive">{(post.error as Error).message}</p>}
            <button type="submit" disabled={post.isPending || !guestName.trim()} className={`${btn} w-full justify-center bg-navy text-white hover:bg-navy`}>
              {t("التعليق كزائر", "Comment as guest")}
            </button>
          </form>
          <p className="text-center text-sm text-ink-muted">{t("أو", "or")}</p>
          <Link href={`/sign-in?redirect_url=${encodeURIComponent(location)}`} className={`${btn} w-full justify-center`}>
            {t("تسجيل الدخول", "Sign in")}
          </Link>
        </DialogContent>
      </Dialog>

      <ul className="mt-5 space-y-4">
        {list.data?.comments.map((c) => (
          <li key={c.id} className="border-b border-line pb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-navy">{c.authorName}</span>
              {c.isGuest && <span className="text-xs text-ink-muted border border-line rounded px-1.5">{t("زائر", "Guest")}</span>}
              <time className="text-ink-muted" dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}</time>
              {c.mine && <button type="button" onClick={() => del.mutate(c.id)} className="ms-auto text-xs text-ink-muted underline">{t("حذف", "Delete")}</button>}
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words">{c.body}</p>
          </li>
        ))}
        {list.data && list.data.comments.length === 0 && <li className="text-sm text-ink-muted">{t("لا توجد تعليقات بعد.", "No comments yet.")}</li>}
      </ul>
    </div>
  );
}
