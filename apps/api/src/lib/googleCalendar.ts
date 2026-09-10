import { OAuth2Client } from "google-auth-library";

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

let cachedClient: OAuth2Client | null = null;

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

function getClient(): OAuth2Client {
  if (!isGoogleCalendarConfigured()) {
    throw new Error("Google Calendar is not configured");
  }
  if (!cachedClient) {
    cachedClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
    cachedClient.setCredentials({ refresh_token: REFRESH_TOKEN });
  }
  return cachedClient;
}

async function getAccessToken(): Promise<string> {
  const client = getClient();
  const { token } = await client.getAccessToken();
  if (!token) {
    throw new Error("Failed to obtain Google access token");
  }
  return token;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  timeZone?: string;
  attendees?: { email: string; displayName?: string }[];
  conferenceRequestId: string;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink?: string;
  meetLink?: string;
}

export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<CalendarEventResult> {
  const accessToken = await getAccessToken();
  const calendarId = encodeURIComponent(CALENDAR_ID);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`;

  const body = {
    summary: input.summary,
    description: input.description ?? "",
    start: {
      dateTime: input.startsAt.toISOString(),
      timeZone: input.timeZone ?? "Asia/Riyadh",
    },
    end: {
      dateTime: input.endsAt.toISOString(),
      timeZone: input.timeZone ?? "Asia/Riyadh",
    },
    attendees: input.attendees ?? [],
    conferenceData: {
      createRequest: {
        requestId: input.conferenceRequestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: { useDefault: true },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: {
      entryPoints?: { entryPointType?: string; uri?: string }[];
    };
  };

  let meetLink = data.hangoutLink;
  if (!meetLink && data.conferenceData?.entryPoints) {
    const video = data.conferenceData.entryPoints.find(
      (e) => e.entryPointType === "video",
    );
    meetLink = video?.uri;
  }

  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
    meetLink,
  };
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const accessToken = await getAccessToken();
  const calendarId = encodeURIComponent(CALENDAR_ID);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(eventId)}?sendUpdates=all`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const text = await res.text();
    throw new Error(`Google Calendar delete ${res.status}: ${text}`);
  }
}
