import { adminCookie, readJson, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return sendJson(res, { error: "Method not allowed" }, 405);

    const { password } = await readJson(req);
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    if (!password || password !== adminPassword) return sendJson(res, { error: "Invalid password" }, 401);

    return sendJson(res, { authenticated: true }, 200, { "Set-Cookie": adminCookie() });
  } catch (error) {
    return sendJson(res, { error: error.message || "Server error" }, 500);
  }
}
