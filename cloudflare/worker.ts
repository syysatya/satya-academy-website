export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  TURNSTILE_SECRET: string;
  ALLOWED_ORIGIN?: string;
}

const headers = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin",
});

const json = (body: unknown, status = 200, origin = "*") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers(origin) },
  });

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: form,
  });
  if (!res.ok) return false;
  const result = await res.json<{ success: boolean }>();
  return result.success === true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "https://satyaacademy.org";

    const isAllowed = !origin || origin === allowed || origin === "https://www.satyaacademy.org";
    if (!isAllowed && url.pathname.startsWith("/api/")) {
      return json({ error: "Origin not allowed." }, 403, allowed);
    }

    if (url.pathname !== "/api/trial" && url.pathname !== "/api/feedback") {
      return env.ASSETS.fetch(request);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: headers(allowed) });
    }
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, allowed);
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return json({ error: "Expected JSON." }, 415, allowed);
    }

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400, allowed); }

    if (clean(body.website, 200) || clean(body.botField, 200)) {
      return json({ success: true }, 200, allowed);
    }

    const token = clean(body.turnstileToken, 2048);
    if (!(await verifyTurnstile(token, env.TURNSTILE_SECRET))) {
      return json({ error: "Spam verification failed. Please retry." }, 400, allowed);
    }

    if (url.pathname === "/api/trial") {
      const parentName = clean(body.parent_name, 100);
      const email = clean(body.email, 200).toLowerCase();
      const phone = clean(body.phone, 30);
      const studentName = clean(body.student_name, 80);
      const grade = clean(body.grade, 80);
      const subject = clean(body.subject, 100);
      const curriculum = clean(body.curriculum, 100);
      const preferredTime = clean(body.preferred_time, 200);
      const notes = clean(body.notes, 2000);
      if (!parentName || !/^\\S+@\\S+\\.\\S+$/.test(email) || !phone || !studentName || !grade || !subject || !curriculum) {
        return json({ error: "Please complete all required fields correctly." }, 400, allowed);
      }
      await env.DB.prepare(`INSERT INTO trial_requests
        (parent_name,email,phone,student_name,grade,subject,curriculum,preferred_time,notes)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(parentName,email,phone,studentName,grade,subject,curriculum,preferredTime,notes).run();
      return json({ success: true, message: "Trial request received." }, 201, allowed);
    }

    const name = clean(body.name, 100);
    const role = clean(body.role, 30);
    const course = clean(body.course, 100);
    const ratingText = clean(body.rating, 20);
    const ratingMatch = ratingText.match(/[1-5]/);
    const rating = ratingMatch ? Number(ratingMatch[0]) : Number(body.rating);
    const feedback = clean(body.feedback, 3000);
    const permission = body.publish_permission === true;
    if (!name || !feedback || !["Student","Parent"].includes(role) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return json({ error: "Please complete all required feedback fields." }, 400, allowed);
    }
    await env.DB.prepare(`INSERT INTO feedback
      (name,role,course,rating,feedback,publish_permission)
      VALUES (?,?,?,?,?,?)`).bind(name,role,course,rating,feedback,permission ? 1 : 0).run();
    return json({ success: true, message: "Feedback received." }, 201, allowed);
  },
};