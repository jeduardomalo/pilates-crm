import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { encryptString } from "@/lib/crypto";
import { getOAuthClient } from "@/lib/googleCalendar";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const expectedState = cookies().get("google_oauth_state")?.value;

  if (!code) {
    return NextResponse.redirect(
      new URL("/schedule?google=error&reason=missing_code", req.url)
    );
  }
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/schedule?google=error&reason=bad_state", req.url)
    );
  }

  const oauth2 = getOAuthClient();
  const tokenResponse = await oauth2.getToken(code);
  const tokens = tokenResponse.tokens;

  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;
  const expiryDateMs = tokens.expiry_date;

  if (!accessToken) {
    return NextResponse.redirect(
      new URL("/schedule?google=error&reason=missing_access_token", req.url)
    );
  }

  // If refresh_token is missing (Google sometimes omits it on subsequent consents),
  // reuse existing stored refresh token if present.
  const existing = await db.googleIntegration.findUnique({
    where: { id: "default" },
  });

  if (!refreshToken && !existing) {
    return NextResponse.redirect(
      new URL("/schedule?google=error&reason=missing_refresh_token", req.url)
    );
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

  const res = NextResponse.redirect(new URL("/schedule?google=connected", req.url));
  res.cookies.set("google_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

