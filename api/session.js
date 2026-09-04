import { isAdmin, json } from "./_shared.js";

export default async function handler(request) {
  return json({ authenticated: isAdmin(request) });
}
