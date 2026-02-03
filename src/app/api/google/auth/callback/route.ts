import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { encryptString } from "@/lib/crypto";
import { getOAuthClient } from "@/lib/googleCalendar";

function scheduleRedirect(req: Request, params: string) {
  const base = new URL(req.url).origin;
  return NextResponse.redirect(`${base}/schedule?${params}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;

  if (!code) {
    return scheduleRedirect(req, "google=error&reason=missing_code");
  }
  if (!state || !expectedState || state !== expectedState) {
    return scheduleRedirect(req, "google=error&reason=bad_state");
  }

  try {
    const oauth2 = getOAuthClient();
    const tokenResponse = await oauth2.getToken(code);
    const tokens = tokenResponse.tokens;

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiryDateMs = tokens.expiry_date;

    if (!accessToken) {
      return scheduleRedirect(req, "google=error&reason=missing_access_token");
    }

    const existing = await db.googleIntegration.findUnique({
      where: { id: "default" },
    });

    if (!refreshToken && !existing) {
      return scheduleRedirect(req, "google=error&reason=missing_refresh_token");
    }

    const refreshEnc = refreshToken
      ? encryptString(refreshToken)
      : existing!.refreshTokenEnc;

    const expiresAt = new Date(
      typeof expiryDateMs === "number" ? expiryDateMs : Date.now() + 55 * 60 * 1000
    );

    await db.googleIntegration.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        calendarId: "primary",
        accessTokenEnc: encryptString(accessToken),
        refreshTokenEnc: refreshEnc,
        expiresAt,
        connectedAt: new Date(),
      },
      update: {
        calendarId: "primary",
        accessTokenEnc: encryptString(accessToken),
        refreshTokenEnc: refreshEnc,
        expiresAt,
        connectedAt: new Date(),
      },
    });

    const res = scheduleRedirect(req, "google=connected");
    res.cookies.set("google_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return scheduleRedirect(req, "google=error&reason=error");
  }
}

