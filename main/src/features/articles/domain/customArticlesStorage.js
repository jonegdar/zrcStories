const STORAGE_KEY = "zrcstories_custom_articles_v2";
const DELETED_KEY = "zrcstories_deleted_article_ids_v2";

function notifyArticlesChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("zrcstories_articles_changed"));
  } catch {
    // ignore
  }
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeArticle(input) {
  if (!input || typeof input !== "object") return null;
  if (typeof input.id !== "string" || !input.id.trim()) return null;
  if (typeof input.title !== "string" || !input.title.trim()) return null;
  if (typeof input.date !== "string" || !input.date.trim()) return null;

  const links = Array.isArray(input.links)
    ? input.links.map((v) => String(v)).filter(Boolean)
    : [];

  const paragraphs = Array.isArray(input.paragraphs)
    ? input.paragraphs.map((v) => String(v)).filter(Boolean)
    : [];

  const media = Array.isArray(input.media)
    ? input.media
        .map((m) => {
          if (!m || typeof m !== "object") return null;
          const type = m.type === "video" ? "video" : "image";
          const src = String(m.src || "").trim();
          if (!src) return null;
          return {
            id: String(m.id || `${type}-${Math.random().toString(16).slice(2)}`),
            type,
            src,
            caption: String(m.caption || ""),
          };
        })
        .filter(Boolean)
    : [];

  return {
    id: input.id.trim(),
    title: input.title.trim(),
    description: String(input.description || "").trim(),
    author: String(input.author || "").trim(),
    date: input.date.trim(),
    status: String(input.status || "Done"),
    category: String(input.category || "School Announcements"),
    image: input.image || "",
    tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t)).filter(Boolean) : [],
    links,
    // `description` is the caption. `paragraphs` is optional long-form body.
    // Keep them separate to avoid duplicate rendering.
    paragraphs,
    media,
  };
}

export function loadCustomArticles() {
  if (typeof window === "undefined") return [];
  let raw = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  const parsed = safeJsonParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeArticle).filter(Boolean);
}

export function saveCustomArticles(articles) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch {
    // ignore
  }
  notifyArticlesChanged();
}

export function loadDeletedArticleIds() {
  if (typeof window === "undefined") return new Set();
  let raw = null;
  try {
    raw = window.localStorage.getItem(DELETED_KEY);
  } catch {
    return new Set();
  }
  if (!raw) return new Set();
  const parsed = safeJsonParse(raw);
  if (!Array.isArray(parsed)) return new Set();
  return new Set(parsed.map((v) => String(v)).filter(Boolean));
}

export function saveDeletedArticleIds(idSet) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(idSet)));
  } catch {
    // ignore
  }
  notifyArticlesChanged();
}

export function restoreArticleId(id) {
  const key = String(id || "").trim();
  if (!key) return;
  const deleted = loadDeletedArticleIds();
  if (!deleted.has(key)) return;
  deleted.delete(key);
  saveDeletedArticleIds(deleted);
}

export function deleteArticleId(id) {
  const key = String(id || "").trim();
  if (!key) return { ok: false, reason: "invalid" };

  const deleted = loadDeletedArticleIds();
  deleted.add(key);
  saveDeletedArticleIds(deleted);

  const current = loadCustomArticles();
  const next = current.filter((a) => a.id !== key);
  saveCustomArticles(next);
  return { ok: true };
}

export function upsertCustomArticle(article) {
  const normalized = normalizeArticle(article);
  if (!normalized) return { ok: false, reason: "invalid" };

  restoreArticleId(normalized.id);
  const current = loadCustomArticles();
  const map = new Map(current.map((a) => [a.id, a]));
  map.set(normalized.id, normalized);
  const next = Array.from(map.values());
  saveCustomArticles(next);
  return { ok: true, article: normalized };
}
