// Dev-only helper: talks to the Vite dev server middleware (see `vite.config.js`)
// to write canonical articles into `src/data/articles.generated.json`.

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function tryUpsertRepoArticle(article) {
  // Only works in local dev; production builds won't have this endpoint.
  if (!import.meta.env.DEV) return { ok: false, reason: "not_dev" };

  try {
    const res = await fetch("/__content/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ article }),
    });
    const data = await safeJson(res);
    if (!res.ok) return { ok: false, reason: data?.reason || "http_error" };
    return { ok: true, count: data?.count };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

export async function tryDeleteRepoArticle(id) {
  if (!import.meta.env.DEV) return { ok: false, reason: "not_dev" };
  const key = String(id || "").trim();
  if (!key) return { ok: false, reason: "invalid" };

  try {
    const res = await fetch(`/__content/articles?id=${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
    const data = await safeJson(res);
    if (!res.ok) return { ok: false, reason: data?.reason || "http_error" };
    return { ok: true, count: data?.count };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

