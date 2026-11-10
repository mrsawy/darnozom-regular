import { emitVisitorsLive } from "../admin-socket";

export type LiveVisitor = {
  sessionId: string;
  path: string;
  device: string;
  country: string | null;
  since: number;
  lastSeen: number;
};

/** A visitor counts as "online" if we heard from them in this window. */
export const ONLINE_WINDOW_MS = 60_000;
const BROADCAST_EVERY_MS = 10_000;

const sessions = new Map<string, LiveVisitor>();
let timer: NodeJS.Timeout | null = null;
let lastSignature = "";

export function touchSession(v: Omit<LiveVisitor, "since" | "lastSeen">): void {
  const now = Date.now();
  const prev = sessions.get(v.sessionId);
  sessions.set(v.sessionId, { ...v, since: prev?.since ?? now, lastSeen: now });
  startBroadcasting();
}

export function snapshot(): { count: number; visitors: LiveVisitor[] } {
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  for (const [id, v] of sessions) if (v.lastSeen < cutoff) sessions.delete(id);
  const visitors = [...sessions.values()].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 100);
  return { count: sessions.size, visitors };
}

function startBroadcasting(): void {
  if (timer) return;
  timer = setInterval(() => {
    const snap = snapshot();
    const sig = snap.visitors.map((v) => `${v.sessionId}:${v.path}`).join("|");
    // Only push when something changed; admins also fetch on load.
    if (sig !== lastSignature) {
      lastSignature = sig;
      emitVisitorsLive(snap);
    }
    if (snap.count === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, BROADCAST_EVERY_MS);
  timer.unref();
}
