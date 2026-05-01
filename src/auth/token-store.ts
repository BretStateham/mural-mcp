import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { TokenData } from "../types.js";

const TOKEN_DIR = path.join(os.homedir(), ".mural-mcp");
const TOKEN_FILE = path.join(TOKEN_DIR, "tokens.json");

export function loadTokens(): TokenData | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const raw = fs.readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(raw) as TokenData;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: TokenData): void {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { recursive: true });
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf-8");
}

function isExpired(tokens: TokenData): boolean {
  // Consider expired 60 seconds early to allow buffer
  return Date.now() >= tokens.expires_at - 60_000;
}

async function refreshAccessToken(tokens: TokenData): Promise<TokenData> {
  const clientId = process.env["MURAL_CLIENT_ID"];
  const clientSecret = process.env["MURAL_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    throw new Error("MURAL_CLIENT_ID and MURAL_CLIENT_SECRET must be set");
  }

  const response = await fetch("https://app.mural.co/api/public/v1/authorization/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const newTokens: TokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  saveTokens(newTokens);
  return newTokens;
}

export async function getAccessToken(): Promise<string> {
  let tokens = loadTokens();

  if (!tokens) {
    throw new Error(
      "No Mural tokens found. Run 'npm run auth' to authenticate first.",
    );
  }

  if (isExpired(tokens)) {
    tokens = await refreshAccessToken(tokens);
  }

  return tokens.access_token;
}
