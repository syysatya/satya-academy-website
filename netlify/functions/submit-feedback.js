// Persistent feedback intake via Netlify Blobs. New submissions are always private and pending.
// Configure Netlify Blobs for the site; the admin review API requires Netlify Identity.
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "satya-academy-testimonials";
const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  },
  body: JSON.stringify(body)
});

const clean = (value, max) => String(value || "").trim().slice(0, max);
const id = () => (globalThis.crypto && crypto.randomUUID)
  ? crypto.randomUUID()
  : require("crypto").randomUUID();

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  let form;
  try { form = new URLSearchParams(event.body || ""); }
  catch { return json(400, { error: "Invalid form data" }); }

  if (clean(form.get("feedback-bot-field"), 200)) return json(200, { ok: true });
  const name = clean(form.get("name"), 100);
  const role = clean(form.get("role"), 20);
  const course = clean(form.get("course"), 100);
  const feedback = clean(form.get("feedback"), 3000);
  const rating = Number(form.get("rating"));
  const permission = form.get("publish_permission") === "yes";

  if (!name || !course || !feedback || !["Student", "Parent"].includes(role) ||
      !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json(400, { error: "Please complete all required fields with a valid rating." });
  }
  if (feedback.length < 8) return json(400, { error: "Please provide a little more detail in your feedback." });

  const record = {
    id: id(),
    name,
    displayName: name,
    role,
    course,
    rating,
    feedback,
    publishPermission: permission,
    verified: false,
    status: "pending",
    submittedAt: new Date().toISOString(),
    approvedAt: null,
    reviewedBy: null
  };

  try {
    const store = getStore(STORE_NAME);
    await store.setJSON("submission:" + record.id, record);
    return json(201, { ok: true, id: record.id, status: "pending" });
  } catch (error) {
    console.error("Feedback persistence failed", error);
    return json(503, { error: "Feedback could not be saved. Please try again later." });
  }
};
