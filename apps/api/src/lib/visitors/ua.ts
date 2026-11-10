const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|go-http|monitor/i;

export function parseUserAgent(ua: string | undefined): {
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
  isBot: boolean;
} {
  const s = ua ?? "";
  const isBot = !s || BOT_RE.test(s);
  const device = /ipad|tablet|playbook|silk/i.test(s)
    ? "tablet"
    : /mobi|iphone|android/i.test(s)
      ? "mobile"
      : "desktop";
  const browser = /edg\//i.test(s) ? "Edge"
    : /opr\/|opera/i.test(s) ? "Opera"
    : /chrome|crios/i.test(s) ? "Chrome"
    : /firefox|fxios/i.test(s) ? "Firefox"
    : /safari/i.test(s) ? "Safari"
    : "Other";
  const os = /windows/i.test(s) ? "Windows"
    : /android/i.test(s) ? "Android"
    : /iphone|ipad|ios/i.test(s) ? "iOS"
    : /mac os/i.test(s) ? "macOS"
    : /linux/i.test(s) ? "Linux"
    : "Other";
  return { device, browser, os, isBot };
}
