import { NextResponse } from "next/server";
import crypto from "crypto";
import { getGoogleScopes, getOAuthClient } from "@/lib/googleCalendar";

export async function GET() {
  const oauth2 = getOAuthClient();
  const state = crypto.randomBytes(16).toString("hex");

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: getGoogleScopes(),
    state,
  });

  const res = NextResponse.redirect(url);
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });
  return res;
}

