// Creates a MeritHub learner account from the trial-lesson form.
// Your MeritHub credentials stay on the server as Netlify environment variables.
// They must never be written into index.html.

const CLIENT_ID = process.env.MERITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.MERITHUB_CLIENT_SECRET;
const USER_HOST = process.env.MERITHUB_USER_HOST || 'https://serviceaccount1.meritgraph.com';

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

async function getToken() {
  // VERIFY 1: confirm the token request (method and body) in MeritHub's API docs.
  const res = await fetch(`${USER_HOST}/${CLIENT_ID}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientSecret: CLIENT_SECRET }),
  });
  if (!res.ok) throw new Error('Token request failed: ' + res.status);
  const data = await res.json();
  return data.token || data.access_token || data.accessToken;
}

function buildUser({ name, email }) {
  // VERIFY 2: confirm the field names and allowed values for creating a user.
  return { name, email, userType: 'learner' };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!CLIENT_ID || !CLIENT_SECRET) return json(500, { error: 'Server is not configured' });

  let data;
  try { data = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Bad request' }); }

  if (data.website) return json(200, { ok: true }); // hidden field: only bots fill it in

  const name = String(data.name || '').trim().slice(0, 100);
  const email = String(data.email || '').trim().slice(0, 200);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    return json(400, { error: 'A name and a valid email are required' });
  }

  try {
    const token = await getToken();
    const res = await fetch(`${USER_HOST}/${CLIENT_ID}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(buildUser({ name, email })),
    });
    if (!res.ok) {
      console.error('MeritHub user create failed', res.status, await res.text());
      return json(502, { error: 'Could not create the account' });
    }
    return json(200, { ok: true });
  } catch (err) {
    console.error(err);
    return json(502, { error: 'Could not reach MeritHub' });
  }
};
