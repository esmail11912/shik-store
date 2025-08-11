import fetch from 'node-fetch';
export default async function handler(req, res) {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = 'main', GITHUB_TOKEN, ADMIN_PASSWORD } = process.env;
  if (req.method === 'GET') {
    try {
      const raw = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/products.json`;
      const r = await fetch(raw, { cache: 'no-store' });
      if (!r.ok) return res.status(200).json({ products: [] });
      const data = await r.json();
      return res.status(200).json({ products: Array.isArray(data.products) ? data.products : [] });
    } catch (e) { return res.status(200).json({ products: [] }); }
  }
  if (req.method === 'POST') {
    try {
      const key = req.headers['x-admin-key'];
      if (!key || key !== ADMIN_PASSWORD) return res.status(401).json({ error: 'unauthorized' });
      if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) return res.status(500).json({ error: 'server_not_configured' });
      const body = req.body || {}; const products = Array.isArray(body.products) ? body.products : [];
      const contentString = JSON.stringify({ products }, null, 2);
      const contentB64 = Buffer.from(contentString).toString('base64');
      const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/products.json`;
      const head = await fetch(apiBase + `?ref=${GITHUB_BRANCH}`, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' } });
      let sha; if (head.ok) { const j = await head.json(); sha = j.sha; }
      const put = await fetch(apiBase, { method: 'PUT', headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'update products.json via admin', content: contentB64, sha, branch: GITHUB_BRANCH, committer: { name: 'Shik Admin', email: 'admin@example.com' } }) });
      if (!put.ok) { const t = await put.text(); return res.status(500).json({ error: 'github_update_failed', details: t }); }
      return res.status(200).json({ ok: true });
    } catch (e) { return res.status(500).json({ error: 'server_error', details: e?.message }); }
  }
  res.setHeader('Allow','GET, POST'); return res.status(405).end('Method Not Allowed');
}
