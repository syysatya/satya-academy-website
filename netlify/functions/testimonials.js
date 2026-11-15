const { getStore } = require("@netlify/blobs");
const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "X-Content-Type-Options": "nosniff"
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    const store = getStore("satya-academy-testimonials");
    const { blobs } = await store.list({ prefix: "submission:" });
    const records = await Promise.all(blobs.map(async item => {
      try { return await store.get(item.key, { type: "json" }); }
      catch { return null; }
    }));
    const testimonials = records.filter(item =>
      item && item.status === "published" && item.publishPermission === true
    ).map(item => ({
      id: item.id,
      displayName: item.displayName,
      role: item.role,
      course: item.course,
      rating: item.rating,
      feedback: item.feedback,
      verified: item.verified === true,
      publishedAt: item.approvedAt
    })).sort((a,b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
    return json(200, { testimonials });
  } catch (error) {
    console.error("Testimonial listing failed", error);
    return json(503, { error: "Testimonials are temporarily unavailable." });
  }
};
