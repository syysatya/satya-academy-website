// Admin-only testimonial review API.
// Configure Netlify Identity on the site and set TESTIMONIAL_ADMIN_EMAILS to a
// comma-separated allow-list. Never trust an email or role supplied in the body.
const { getStore } = require("@netlify/blobs");
const STORE_NAME = "satya-academy-testimonials";
const ADMIN_EMAILS = (process.env.TESTIMONIAL_ADMIN_EMAILS || "")
  .split(",").map(v => v.trim().toLowerCase()).filter(Boolean);

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  body: JSON.stringify(body)
});
const clean = (v, max) => String(v || "").trim().slice(0, max);

function getIdentity(event) {
  const raw = event.headers && (event.headers["x-nf-identity"] || event.headers["X-Nf-Identity"]);
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(raw, "base64").toString("utf8")); }
  catch { return null; }
}
function authorized(event) {
  const identity = getIdentity(event);
  const email = clean(identity && identity.user && identity.user.email, 200).toLowerCase();
  return email && ADMIN_EMAILS.includes(email) ? email : null;
}
async function readAll(store) {
  const { blobs } = await store.list({ prefix: "submission:" });
  const values = await Promise.all(blobs.map(async b => {
    try { return await store.get(b.key, { type: "json" }); } catch { return null; }
  }));
  return values.filter(Boolean);
}
function stats(items) {
  const published = items.filter(x => x.status === "published" && x.publishPermission === true);
  const byCourse = {};
  for (const item of published) {
    const key = item.course;
    byCourse[key] ||= { count: 0, ratingTotal: 0 };
    byCourse[key].count++;
    byCourse[key].ratingTotal += item.rating;
  }
  Object.keys(byCourse).forEach(key => {
    byCourse[key].averageRating = Number((byCourse[key].ratingTotal / byCourse[key].count).toFixed(2));
    delete byCourse[key].ratingTotal;
  });
  return {
    totalSubmissions: items.length,
    published: published.length,
    pending: items.filter(x => x.status === "pending").length,
    rejected: items.filter(x => x.status === "rejected").length,
    averageRating: published.length ? Number((published.reduce((s,x)=>s+x.rating,0)/published.length).toFixed(2)) : null,
    courseRatings: byCourse
  };
}

exports.handler = async event => {
  const adminEmail = authorized(event);
  if (!adminEmail) return json(401, { error: "Administrator authentication required." });
  const store = getStore(STORE_NAME);
  try {
    if (event.httpMethod === "GET") {
      const items = await readAll(store);
      const q = clean(event.queryStringParameters && event.queryStringParameters.q, 100).toLowerCase();
      const course = clean(event.queryStringParameters && event.queryStringParameters.course, 100).toLowerCase();
      const rating = Number(event.queryStringParameters && event.queryStringParameters.rating);
      const status = clean(event.queryStringParameters && event.queryStringParameters.status, 20);
      const filtered = items.filter(x =>
        (!q || x.name.toLowerCase().includes(q) || x.displayName.toLowerCase().includes(q)) &&
        (!course || x.course.toLowerCase() === course) &&
        (!rating || x.rating === rating) &&
        (!status || x.status === status)
      ).sort((a,b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
      return json(200, { stats: stats(items), testimonials: filtered });
    }
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON." }); }
    const id = clean(body.id, 80);
    const action = clean(body.action, 20);
    if (!/^[a-f0-9-]{20,80}$/i.test(id)) return json(400, { error: "Invalid testimonial ID." });
    const key = "submission:" + id;
    const item = await store.get(key, { type: "json" });
    if (!item) return json(404, { error: "Testimonial not found." });

    if (action === "approve") {
      if (item.publishPermission !== true) return json(409, { error: "Publication permission was not granted." });
      item.status = "published";
      item.approvedAt = new Date().toISOString();
      item.reviewedBy = adminEmail;
    } else if (action === "reject") {
      item.status = "rejected";
      item.approvedAt = null;
      item.reviewedBy = adminEmail;
    } else if (action === "unpublish") {
      item.status = "pending";
      item.approvedAt = null;
      item.reviewedBy = adminEmail;
    } else if (action === "edit") {
      const displayName = clean(body.displayName, 100);
      const feedback = clean(body.feedback, 3000);
      if (!displayName || feedback.length < 8) return json(400, { error: "Display name and feedback are required." });
      item.displayName = displayName;
      item.feedback = feedback;
      if (item.status === "published") item.status = "pending";
      item.approvedAt = null;
      item.reviewedBy = adminEmail;
    } else if (action === "delete") {
      await store.delete(key);
      return json(200, { ok: true, deleted: true });
    } else {
      return json(400, { error: "Unsupported action." });
    }
    item.updatedAt = new Date().toISOString();
    await store.setJSON(key, item);
    return json(200, { ok: true, testimonial: item });
  } catch (error) {
    console.error("Testimonial administration failed", error);
    return json(503, { error: "Unable to process the request." });
  }
};
