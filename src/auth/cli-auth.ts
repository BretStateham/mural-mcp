/**
 * One-time OAuth authentication flow.
 * Run with: npm run auth
 *
 * Opens a browser for Mural consent, starts a local HTTP server
 * to capture the callback, exchanges the code for tokens, and saves them.
 */
import http from "node:http";
import { URL } from "node:url";
import { saveTokens } from "./token-store.js";

const CLIENT_ID = process.env["MURAL_CLIENT_ID"];
const CLIENT_SECRET = process.env["MURAL_CLIENT_SECRET"];
const REDIRECT_URI = process.env["MURAL_REDIRECT_URI"] ?? "http://localhost:9876/callback";
const PORT = new URL(REDIRECT_URI).port || "9876";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Error: MURAL_CLIENT_ID and MURAL_CLIENT_SECRET environment variables must be set.");
  process.exit(1);
}

const SCOPES = "murals:read murals:write";

const state = Math.random().toString(36).substring(2, 15);

const authUrl =
  `https://app.mural.co/api/public/v1/authorization/oauth2/` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&state=${state}`;

console.log("\nOpening browser for Mural authorization...\n");
console.log(`If the browser doesn't open, visit:\n${authUrl}\n`);

// Open browser (cross-platform)
const openCmd =
  process.platform === "win32" ? "start" :
  process.platform === "darwin" ? "open" : "xdg-open";

import("node:child_process").then(({ exec }) => {
  exec(`${openCmd} "${authUrl}"`);
});

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/callback")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("Missing authorization code");
    return;
  }

  try {
    const tokenResponse = await fetch(
      "https://app.mural.co/api/public/v1/authorization/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: CLIENT_ID!,
          client_secret: CLIENT_SECRET!,
          redirect_uri: REDIRECT_URI,
          code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      throw new Error(`Token exchange failed (${tokenResponse.status}): ${body}`);
    }

    const data = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    });

    console.log("✓ Authentication successful! Tokens saved to ~/.mural-mcp/tokens.json");

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>Authentication successful!</h1><p>You can close this tab.</p>");
  } catch (err) {
    console.error("Authentication failed:", err);
    res.writeHead(500);
    res.end("Authentication failed. Check console for details.");
  } finally {
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 1000);
  }
});

server.listen(Number(PORT), () => {
  console.log(`Waiting for callback on port ${PORT}...`);
});
