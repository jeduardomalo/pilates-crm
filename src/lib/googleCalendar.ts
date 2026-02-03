import { google } from "googleapis";
import { db } from "@/lib/db";
import { decryptString, encryptString } from "@/lib/crypto";

const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export function getGoogleScopes() {
  return GOOGLE_SCOPES;
}

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Google OAuth env vars. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI."
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getGoogleIntegration() {
  return db.googleIntegration.findUnique({ where: { id: "default" } });
}

export async function getGoogleConnectionStatus(): Promise<{
  connected: boolean;
  connectedAt?: string;
  calendarId?: string;
}> {
  const row = await getGoogleIntegration();
  if (!row) return { connected: false };
  return {
    connected: true,
    connectedAt: row.connectedAt.toISOString(),
    calendarId: row.calendarId,
  };
}

async function getAuthedCalendarClient() {
  const integration = await getGoogleIntegration();
  if (!integration) return null;

  const oauth2 = getOAuthClient();
  oauth2.setCredentials({
    access_token: decryptString(integration.accessTokenEnc),
    refresh_token: decryptString(integration.refreshTokenEnc),
    expiry_date: integration.expiresAt.getTime(),
  });

  oauth2.on("tokens", async (tokens) => {
    // Refresh events can provide a new access token + expiry.
    // Refresh token is usually only returned on first consent.
    const updates: Partial<{
      accessTokenEnc: string;
      refreshTokenEnc: string;
      expiresAt: Date;
      lastSyncedAt: Date;
    }> = { lastSyncedAt: new Date() };

    if (tokens.access_token) {
      updates.accessTokenEnc = encryptString(tokens.access_token);
    }
    if (tokens.refresh_token) {
      updates.refreshTokenEnc = encryptString(tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      updates.expiresAt = new Date(tokens.expiry_date);
    }

    // Best-effort update; avoid throwing inside event handler.
    try {
      if (Object.keys(updates).length > 0) {
        await db.googleIntegration.update({
          where: { id: "default" },
          data: updates,
        });
      }
    } catch (e) {
      console.error("Failed to persist refreshed Google tokens:", e);
    }
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  return { calendar, calendarId: integration.calendarId };
}

export async function createGoogleEvent(input: {
  scheduledClassId: string;
  start: Date;
  end: Date;
  summary: string;
  location?: string | null;
  description?: string | null;
}): Promise<string | null> {
  const client = await getAuthedCalendarClient();
  if (!client) return null;

  const { calendar, calendarId } = client;
  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: input.summary,
      location: input.location ?? undefined,
      description: input.description ?? undefined,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
      extendedProperties: {
        private: {
          scheduledClassId: input.scheduledClassId,
        },
      },
    },
  });

  return res.data.id ?? null;
}

export async function updateGoogleEvent(input: {
  googleEventId: string;
  scheduledClassId: string;
  start: Date;
  end: Date;
  summary: string;
  location?: string | null;
  description?: string | null;
}): Promise<boolean> {
  const client = await getAuthedCalendarClient();
  if (!client) return false;

  const { calendar, calendarId } = client;
  await calendar.events.patch({
    calendarId,
    eventId: input.googleEventId,
    requestBody: {
      summary: input.summary,
      location: input.location ?? undefined,
      description: input.description ?? undefined,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
      extendedProperties: {
        private: {
          scheduledClassId: input.scheduledClassId,
        },
      },
    },
  });

  return true;
}

export async function deleteGoogleEvent(googleEventId: string): Promise<boolean> {
  const client = await getAuthedCalendarClient();
  if (!client) return false;

  const { calendar, calendarId } = client;
  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch (e: unknown) {
    // If it was already deleted, treat as success.
    const code =
      typeof e === "object" && e && "code" in e
        ? (e as { code?: number }).code
        : undefined;
    if (code === 410 || code === 404) return true;
    throw e;
  }
  return true;
}

