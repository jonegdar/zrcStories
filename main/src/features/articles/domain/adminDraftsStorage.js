const STORAGE_KEY = "zrcstories_admin_draft_articles_v1";

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function notifyDraftsChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("zrcstories_admin_drafts_changed"));
  } catch {
    // ignore
  }
}

function normalizeDraft(input) {
  if (!input || typeof input !== "object") return null;
  if (typeof input.id !== "string" || !input.id.trim()) return null;

  const authors = Array.isArray(input.authors)
    ? input.authors.map((a) => String(a || "")).filter(Boolean)
    : [String(input.author || "")].filter(Boolean);

  return {
    id: String(input.id || "").trim(),
    title: String(input.title || ""),
    authors: authors.length ? authors : [""],
    date: String(input.date || ""),
    status: String(input.status || "Done"),
    category: String(input.category || "School Announcements"),
    caption: String(input.caption || ""),
    thumbnail: input.thumbnail || "",
    thumbnailUrl: String(input.thumbnailUrl || ""),
    links: Array.isArray(input.links) ? input.links.map((v) => String(v || "")) : [""],
    media: Array.isArray(input.media) ? input.media : [],
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : Date.now(),
  };
}

export function loadAdminDrafts() {
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
  return parsed.map(normalizeDraft).filter(Boolean);
}

function saveAdminDrafts(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  notifyDraftsChanged();
}

export function findAdminDraftById(id) {
  const key = String(id || "").trim();
  if (!key) return null;
  return loadAdminDrafts().find((d) => d.id === key) || null;
}

export function upsertAdminDraft(draft) {
  const normalized = normalizeDraft(draft);
  if (!normalized) return { ok: false, reason: "invalid" };

  const current = loadAdminDrafts();
  const map = new Map(current.map((d) => [d.id, d]));
  map.set(normalized.id, { ...normalized, updatedAt: Date.now() });
  saveAdminDrafts(Array.from(map.values()));
  return { ok: true };
}

export function deleteAdminDraft(id) {
  const key = String(id || "").trim();
  if (!key) return { ok: false, reason: "invalid" };
  const current = loadAdminDrafts();
  const next = current.filter((d) => d.id !== key);
  saveAdminDrafts(next);
  return { ok: true };
}
