import { adminCookie, json } from "./_shared.js";

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (!password || password !== adminPassword) return json({ error: "Invalid password" }, 401);

  return json({ authenticated: true }, 200, { "Set-Cookie": adminCookie() });
}
