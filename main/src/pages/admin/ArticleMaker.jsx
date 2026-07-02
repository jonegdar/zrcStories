import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Upload, ExternalLink, Eye, X, ChevronLeft, ChevronRight, Download, Loader2, Facebook } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import homeBg from "../../assets/images/homeBg.jpg";
import { ARTICLE_CATEGORIES, getCategoryColor } from "../../features/articles/constants/categories";
import { ARTICLE_CATEGORY_ICONS } from "../../features/articles/constants/icons";
import { deleteArticleId, upsertCustomArticle } from "../../features/articles/domain/customArticlesStorage";
import { tryDeleteRepoArticle, tryUpsertRepoArticle } from "../../features/articles/domain/repoArticlesClient";
import { deleteAdminDraft, findAdminDraftById, loadAdminDrafts, upsertAdminDraft } from "../../features/articles/domain/adminDraftsStorage";
import ArticleRepository from "../../features/articles/domain/articleRepository";

function parseAuthors(value) {
  const raw = String(value || "").trim();
  if (!raw) return [""];
  const parts = raw
    .split(/;|\n|,/g)
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return parts.length ? parts : [""];
}

function expandEscapedNewlines(text) {
  return String(text || "").replace(/\\n/g, "\n");
}

function categoryToCatNumber(category) {
  const cat = String(category || "").trim();
  if (cat === "School Announcements") return 1;
  if (cat === "SHC announcements") return 2;
  if (cat === "Student Announcements") return 3;
  if (cat === "Promotions") return 4;
  if (cat === "Resources & Opportunities") return 5;
  if (cat === "Lost & Found") return 6;
  return 1;
}

function makeStructuredId({ date, category, existingArticles }) {
  const dt = String(date || "").trim();
  const parts = dt.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "";
  const [year, month, day] = parts;
  const catNumber = categoryToCatNumber(category);

  const sameBucket = (existingArticles || []).filter(
    (a) => String(a?.date || "") === dt && String(a?.category || "") === String(category || ""),
  );
  const order = sameBucket.length + 1;
  return `${year}-${month}-${day}-article-cat${catNumber}-${order}`;
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function normalizeFacebookExtractorApiUrl(rawUrl) {
  const url = String(rawUrl || "").trim().replace(/\/+$/g, "");
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (/^:\d+$/.test(url)) return `http://localhost${url}`;
  if (/^[^:/]+:\d+$/.test(url)) return `http://${url}`;
  return `http://${url}`;
}

function getFacebookExtractorApiUrl() {
  const configured = String(import.meta.env.VITE_FB_EXTRACTOR_API_URL || "").trim();
  if (configured) return normalizeFacebookExtractorApiUrl(configured);
  return import.meta.env.DEV ? "http://localhost:8000" : "";
}

function getImporterStatusMessage(error, apiUrl) {
  const text = String(error?.message || "").trim();
  const normalized = text.toLowerCase();
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("connection refused") ||
    normalized.includes("ecconnrefused") ||
    normalized.includes("xhr") ||
    normalized.includes("net::err")
  ) {
    return `Facebook importer backend is not running or cannot be reached at ${apiUrl}. Start the backend and try again.`;
  }
  return text || "Please try again or create the article manually.";
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function importedMediaFromPayload(payload) {
  const plannedMedia = Array.isArray(payload?.media) ? payload.media : [];
  if (plannedMedia.length) return plannedMedia;

  const legacy = payload?.data || {};
  const legacyImages = Array.isArray(legacy.images) ? legacy.images : [];
  const imageMedia = legacyImages.map((src) => ({ type: "image", src, caption: "" }));
  return legacy.video
    ? [...imageMedia, { type: "video", src: legacy.video, caption: "" }]
    : imageMedia;
}

function normalizeImportedMediaItem(item, index) {
  const type = item?.type === "video" ? "video" : "image";
  const src = String(item?.src || "").trim();
  if (!src) return null;
  return {
    id: `fb-import-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    type,
    src,
    caption: String(item?.caption || ""),
  };
}

function MediaFrame({ item, className = "" }) {
  return (
    <div className={`w-full h-full bg-black/10 ${className}`}>
      {item.type === "video" ? (
        <video
          controls
          preload="metadata"
          className="w-full h-full object-contain"
        >
          <source src={item.src} type="video/mp4" />
        </video>
      ) : (
        <img
          src={item.src}
          alt={item.caption}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}

function MediaCollage({ media, onOpen }) {
  const preview = (media || []).slice(0, 3);
  const remaining = Math.max(0, (media || []).length - 3);

  if (!preview.length) return null;

  if (preview.length < 3) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {preview.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(index)}
            className="rounded-xl overflow-hidden relative aspect-video cursor-pointer"
          >
            <MediaFrame item={item} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 grid-rows-2 gap-1.5 md:gap-2 aspect-square max-h-[250px]"
      aria-label="Preview media collage"
    >
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="row-span-2 rounded-xl overflow-hidden relative cursor-pointer"
      >
        <MediaFrame item={preview[0]} />
      </button>

      <button
        type="button"
        onClick={() => onOpen(1)}
        className="rounded-xl overflow-hidden relative cursor-pointer"
      >
        <MediaFrame item={preview[1]} />
      </button>

      <button
        type="button"
        onClick={() => onOpen(2)}
        className="rounded-xl overflow-hidden relative cursor-pointer"
      >
        <MediaFrame item={preview[2]} />
        <div className="absolute inset-0 bg-black/45" />
        <span className="absolute inset-0 flex items-center justify-center text-white text-3xl font-semibold">
          +{remaining}
        </span>
      </button>
    </div>
  );
}

function MediaOverlay({ media, activeIndex, onClose, onPrev, onNext }) {
  const touchStartXRef = useRef(null);

  if (activeIndex < 0 || activeIndex >= (media || []).length) return null;

  const item = media[activeIndex];
  const countLabel = `${activeIndex + 1}/${media.length}`;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
        aria-label="Close media viewer"
      >
        <X size={18} />
      </button>

      <div
        className="w-full max-w-5xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="relative max-h-[85vh] rounded-2xl overflow-hidden"
          onTouchStart={(event) => {
            touchStartXRef.current = event.touches[0].clientX;
          }}
          onTouchEnd={(event) => {
            if (touchStartXRef.current === null) return;
            const delta =
              event.changedTouches[0].clientX - touchStartXRef.current;
            if (Math.abs(delta) > 44) {
              if (delta > 0) onPrev();
              else onNext();
            }
            touchStartXRef.current = null;
          }}
        >
          <span
            className="absolute top-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full text-xs text-white z-10"
            style={{
              background: "rgba(55,65,81,0.55)",
              border: "1px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            {countLabel}
          </span>

          <MediaFrame item={item} className="max-h-[75vh] max-w-full" />
          <div
            className="px-4 py-3 text-white/95 text-sm"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.35))",
            }}
          >
            {item.caption}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            className="w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center"
            aria-label="Previous media"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center"
            aria-label="Next media"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function defaultDraft() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  return {
    id: "",
    title: "",
    authors: [""],
    date: `${yyyy}-${mm}-${dd}`,
    status: "Done",
    category: "School Announcements",
    caption: "",
    thumbnail: "",
    thumbnailUrl: "",
    links: [""],
    media: [],
  };
}

export default function ArticleMaker() {
  const navigate = useNavigate();
  const params = useParams();
  const editingId = typeof params.id === "string" ? params.id : "";
  const captionRef = useRef(null);
  const draftKey = `zrcstories_article_maker_draft_v1:${editingId || "new"}`;
  const [draft, setDraft] = useState(() => {
    if (typeof window === "undefined") return defaultDraft();
    const raw = window.localStorage.getItem(draftKey);
    const parsed = raw ? safeJsonParse(raw) : null;
    if (parsed && typeof parsed === "object") {
      const merged = { ...defaultDraft(), ...parsed };
      if (!Array.isArray(merged.authors) || merged.authors.length === 0) {
        merged.authors = parseAuthors(merged.author);
      }
      delete merged.author;
      return merged;
    }
    return defaultDraft();
  });
  const [saving, setSaving] = useState(false);
  const [fbImportUrl, setFbImportUrl] = useState("");
  const [fbImporting, setFbImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [loadedFromExisting, setLoadedFromExisting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMediaIndex, setPreviewMediaIndex] = useState(-1);
  const categoryMenuRef = useRef(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState("");
  const statusMenuRef = useRef(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState("");
  const editingDraft = useMemo(() => {
    if (!editingId) return null;
    return findAdminDraftById(editingId);
  }, [editingId, loadedFromExisting]);

  const previewArticle = useMemo(() => {
    const captionNormalized = expandEscapedNewlines(draft.caption);
    const trimmedLinks = (draft.links || [])
      .map((l) => String(l || "").trim())
      .filter(Boolean);
    const authors = (draft.authors || []).map((a) => String(a || "").trim()).filter(Boolean);

    return {
      id: String(draft.id || "").trim(),
      title: String(draft.title || "").trim(),
      description: String(captionNormalized || "").trim(),
      author: authors.join("; "),
      date: String(draft.date || "").trim(),
      status: String(draft.status || "Done").trim() || "Done",
      category: draft.category,
      image: draft.thumbnail || homeBg,
      links: trimmedLinks,
      paragraphs: [],
      media: (draft.media || [])
        .filter((m) => String(m?.src || "").trim())
        .map((m) => ({
          id: m.id,
          type: m.type === "video" ? "video" : "image",
          src: String(m.src).trim(),
          caption: String(m.caption || ""),
        })),
    };
  }, [draft]);

  function openPreviewMedia(index) {
    setPreviewMediaIndex(index);
  }

  function closePreviewMedia() {
    setPreviewMediaIndex(-1);
  }

  function showPrevPreviewMedia() {
    setPreviewMediaIndex((prev) =>
      prev <= 0 ? (previewArticle.media?.length || 0) - 1 : prev - 1,
    );
  }

  function showNextPreviewMedia() {
    setPreviewMediaIndex((prev) =>
      prev >= (previewArticle.media?.length || 0) - 1 ? 0 : prev + 1,
    );
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setCategoryMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setStatusMenuOpen(false);
      }
    }

    if (categoryMenuOpen || statusMenuOpen) {
      window.addEventListener("pointerdown", handlePointerDown);
      return () => window.removeEventListener("pointerdown", handlePointerDown);
    }
    return undefined;
  }, [categoryMenuOpen, statusMenuOpen]);

  useEffect(() => {
    document.title = editingId ? "Edit Article" : "Article Maker";
  }, [editingId]);

  useEffect(() => {
    const el = captionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft.caption]);

  useEffect(() => {
    if (!previewOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setPreviewOpen(false);
        closePreviewMedia();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [previewOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draft, draftKey]);

  useEffect(() => {
    if (editingId) return;
    setDraft((prev) => {
      const existingArticles = ArticleRepository.getAll();
      const draftIds = new Set(loadAdminDrafts().map((d) => d.id).filter(Boolean));
      const combined = [
        ...existingArticles,
        ...Array.from(draftIds).map((id) => ({ id, date: prev.date, category: prev.category })),
      ];
      const nextId = makeStructuredId({
        date: prev.date,
        category: prev.category,
        existingArticles: combined,
      });
      if (!nextId) return prev;
      if (prev.id === nextId) return prev;
      return { ...prev, id: nextId };
    });
  }, [editingId, draft.date, draft.category]);

  useEffect(() => {
    if (!editingId) return;
    if (loadedFromExisting) return;

    const existingDraft = findAdminDraftById(editingId);
    if (existingDraft) {
      setDraft({
        ...defaultDraft(),
        ...existingDraft,
        id: existingDraft.id,
        authors: Array.isArray(existingDraft.authors) ? existingDraft.authors : [""],
        links:
          Array.isArray(existingDraft.links) && existingDraft.links.length
            ? existingDraft.links
            : [""],
      });
      setLoadedFromExisting(true);
      setStatus("Draft loaded (not published yet).");
      return;
    }

    const existing = ArticleRepository.findById(editingId);
    if (!existing) {
      setStatus("Article not found.");
      return;
    }
    const paragraphs = Array.isArray(existing.paragraphs) ? existing.paragraphs : [];
    // We no longer support a separate "body"; keep everything in caption.
    const combined = paragraphs.map((p) => String(p || "").trim()).filter(Boolean).join("\n\n");
    const caption = String(existing.description || combined || "").trim();
    const thumbnail = existing.image || "";
    const thumbnailUrl = typeof thumbnail === "string" && /^https?:\/\//i.test(thumbnail) ? thumbnail : "";

    setDraft({
      ...defaultDraft(),
      id: existing.id,
      title: existing.title || "",
      authors: parseAuthors(existing.author),
      date: existing.date || "",
      status: existing.status || "Done",
      category: existing.category || "School Announcements",
      caption,
      thumbnail,
      thumbnailUrl,
      links: Array.isArray(existing.links) && existing.links.length ? existing.links : [""],
      media: Array.isArray(existing.media) ? existing.media : [],
    });
    setLoadedFromExisting(true);
    setStatus("");
  }, [editingId, loadedFromExisting]);

  function updateField(name, value) {
    setDraft((prev) => ({ ...prev, [name]: value }));
  }

  function updateAuthor(index, value) {
    setDraft((prev) => {
      const next = [...(prev.authors || [])];
      next[index] = value;
      return { ...prev, authors: next };
    });
  }

  function addAuthor() {
    setDraft((prev) => ({ ...prev, authors: [...(prev.authors || [""]), ""] }));
  }

  function removeAuthor(index) {
    setDraft((prev) => {
      const next = [...(prev.authors || [])];
      if (next.length <= 1) {
        next[0] = "";
        return { ...prev, authors: next };
      }
      next.splice(index, 1);
      return { ...prev, authors: next };
    });
  }

  function applyThumbnailUrl(urlValue) {
    const next = String(urlValue || "").trim();
    setDraft((prev) => ({
      ...prev,
      thumbnailUrl: next,
      thumbnail: next,
    }));
  }

  function updateLink(index, value) {
    setDraft((prev) => {
      const links = [...prev.links];
      const currentValue = links[index] || "";
      const isCurrentlyFbLink = String(currentValue).trim().startsWith('[FB]');
      
      // Preserve FB prefix if it existed and new value doesn't already have it
      if (isCurrentlyFbLink && value.trim() && !String(value).trim().startsWith('[FB]')) {
        links[index] = `[FB] ${value}`;
      } else {
        links[index] = value;
      }
      return { ...prev, links };
    });
  }

  function addLink() {
    setDraft((prev) => ({ ...prev, links: [...prev.links, ""] }));
  }

  function removeLink(index) {
    setDraft((prev) => {
      const links = prev.links.filter((_, i) => i !== index);
      return { ...prev, links: links.length ? links : [""] };
    });
  }

  function addMedia() {
    setDraft((prev) => ({
      ...prev,
      media: [
        ...prev.media,
        {
          id: `media-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          type: "image",
          src: "",
          caption: "",
        },
      ],
    }));
  }

  function updateMedia(index, patch) {
    setDraft((prev) => {
      const media = [...prev.media];
      media[index] = { ...media[index], ...patch };
      return { ...prev, media };
    });
  }

  function removeMedia(index) {
    setDraft((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
  }

  async function onImportFacebookPost() {
    setStatus("");
    const sourceUrl = fbImportUrl.trim();
    if (!sourceUrl) {
      setStatus("Paste a public Facebook post URL first.");
      return;
    }

    const apiUrl = getFacebookExtractorApiUrl();
    if (!apiUrl) {
      setStatus("Facebook importer API is not configured. Set VITE_FB_EXTRACTOR_API_URL.");
      return;
    }

    setFbImporting(true);
    try {
      const response = await fetch(`${apiUrl}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });
      const payload = await readJsonSafely(response);
      if (!response.ok) {
        throw new Error(payload?.detail || "Facebook import failed.");
      }

      const importedCaption = String(payload?.caption || payload?.data?.text || "").trim();
      const importedMedia = importedMediaFromPayload(payload)
        .map(normalizeImportedMediaItem)
        .filter(Boolean);
      const firstImage = importedMedia.find((item) => item.type === "image");
      const finalSourceUrl = String(payload?.sourceUrl || sourceUrl).trim();

      if (!importedCaption && !importedMedia.length) {
        setStatus("Facebook import finished, but no caption or media was found.");
        return;
      }

      const shouldReplaceCaption =
        !importedCaption ||
        !String(draft.caption || "").trim() ||
        window.confirm("Replace the current caption with the imported Facebook caption?");

      setDraft((prev) => {
        const existingMediaSources = new Set(
          (prev.media || []).map((item) => String(item?.src || "").trim()).filter(Boolean),
        );
        const nextMedia = [
          ...(prev.media || []),
          ...importedMedia.filter((item) => !existingMediaSources.has(item.src)),
        ];

        const links = [...(prev.links || [""])];
        if (finalSourceUrl && !links.some((link) => String(link || "").trim() === finalSourceUrl)) {
          // Mark FB links with a prefix for UI rendering
          const fbMarkedLink = `[FB] ${finalSourceUrl}`;
          const emptyIndex = links.findIndex((link) => !String(link || "").trim());
          if (emptyIndex >= 0) links[emptyIndex] = fbMarkedLink;
          else links.push(fbMarkedLink);
        }

        return {
          ...prev,
          caption: importedCaption && shouldReplaceCaption ? importedCaption : prev.caption,
          thumbnail: prev.thumbnail || firstImage?.src || (importedMedia.find(m => m.type === 'video') ? '[VIDEO]' : "") || "",
          thumbnailUrl: prev.thumbnail ? prev.thumbnailUrl : firstImage?.src || prev.thumbnailUrl,
          links: links.length ? links : [""],
          media: nextMedia,
        };
      });

      setStatus(
        `Imported Facebook post${importedMedia.length ? ` with ${importedMedia.length} media item(s)` : ""}. Review before publishing.`,
      );
    } catch (error) {
      const errorMessage = getImporterStatusMessage(error, apiUrl);
      setStatus(`Facebook import failed: ${errorMessage}`);
    } finally {
      setFbImporting(false);
    }
  }

  function validate() {
    const id = draft.id.trim();
    const title = draft.title.trim();
    const date = draft.date.trim();
    const authors = (draft.authors || []).map((a) => String(a || "").trim()).filter(Boolean);
    const caption = expandEscapedNewlines(draft.caption).trim();

    if (!id) return "Article ID is required.";
    if (!title) return "Title is required.";
    if (!authors.length) return "Author is required.";
    if (!date) return "Date published is required.";
    if (!caption) return "Caption is required.";
    const idFormat = /^\d{4}-\d{1,2}-\d{1,2}-article-cat[1-6]-\d+$/;
    if (!editingId && !idFormat.test(id)) return "Article ID must match: YYYY-M-D-article-catN-order";
    if (!/^[a-z0-9-]+$/i.test(id)) return "Article ID should only contain letters, numbers, and dashes.";
    return "";
  }

  function validateDraft() {
    const id = String(draft.id || "").trim();
    const title = String(draft.title || "").trim();
    if (!id) return "Article ID is required.";
    if (!title) return "Title is required.";
    return "";
  }

  async function onSaveDraft() {
    setStatus("");
    const problem = validateDraft();
    if (problem) {
      setStatus(problem);
      return;
    }

    setSaving(true);
    try {
      const result = upsertAdminDraft(draft);
      if (!result.ok) {
        setStatus("Failed to save draft.");
        return;
      }
      setStatus("Saved draft (only visible in Admin).");
    } finally {
      setSaving(false);
    }
  }

  async function onPublish(mode) {
    setStatus("");
    const problem = validate();
    if (problem) {
      setStatus(problem);
      return;
    }

    const trimmedLinks = (draft.links || []).map((l) => String(l || "").trim()).filter(Boolean);
    const captionNormalized = expandEscapedNewlines(draft.caption);
    const authors = (draft.authors || []).map((a) => String(a || "").trim()).filter(Boolean);
    const authorLabel = authors.join("; ");

    const payload = {
      id: draft.id.trim(),
      title: draft.title.trim(),
      description: captionNormalized.trim(),
      author: authorLabel,
      date: draft.date.trim(),
      status: String(draft.status || "Done").trim() || "Done",
      category: draft.category,
      image: draft.thumbnail || homeBg,
      tags: [],
      links: trimmedLinks,
      paragraphs: [],
      media: (draft.media || [])
        .filter((m) => String(m?.src || "").trim())
        .map((m) => ({
          id: m.id,
          type: m.type === "video" ? "video" : "image",
          src: String(m.src).trim(),
          caption: String(m.caption || ""),
      })),
    };

    if (editingId) {
      const existing = ArticleRepository.findById(payload.id);
      if (existing && existing.id !== editingId) {
        setStatus("That Article ID already exists. Change the ID to publish.");
        return;
      }
    } else {
      if (ArticleRepository.findById(payload.id)) {
        setStatus("That Article ID already exists. Change the ID to publish.");
        return;
      }
    }

    setSaving(true);
    try {
      const repoResult = await tryUpsertRepoArticle(payload);

      const result = upsertCustomArticle(payload);
      if (!result.ok) {
        setStatus("Failed to save article.");
        return;
      }

      if (repoResult.ok) {
        setStatus(
          "Saved to repo dataset (commit & push for Vercel to show it) and saved locally.",
        );
      } else {
        setStatus("Saved locally (not yet in repo dataset).");
      }

      deleteAdminDraft(payload.id);
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }

      if (mode === "view") {
        navigate(`/articles/${encodeURIComponent(payload.id)}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 md:pt-32 pb-8 flex flex-col">
        <div className="w-[92vw] max-w-5xl mx-auto flex-1">
          <style>
            {`
              .am-control {
                background: rgba(255,255,255,0.84);
                border: 1.5px solid rgba(255,255,255,0.95);
                box-shadow: 0 10px 24px rgba(11,18,32,0.10);
                color: var(--glass-text);
                transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
              }
              .am-control:hover,
              .am-control:focus {
                background: rgba(255,255,255,0.90);
                box-shadow: 0 12px 28px rgba(11,18,32,0.14);
                transform: translateY(-2px);
              }
              .am-control:disabled {
                transform: none;
              }
            `}
          </style>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] tracking-[0.14em] font-semibold opacity-70">
                ADMIN
              </div>
              <h1 className="text-2xl md:text-4xl font-semibold mt-1">
                {editingId ? "Edit Article" : "Article Maker"}
              </h1>
              <p className="text-sm opacity-80 mt-2">
                {editingId
                  ? "Edit an article and save changes locally in this browser."
                  : "Create a new article and save it locally in this browser."}
              </p>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold border transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.82)",
                borderColor: "rgba(15, 23, 42, 0.12)",
                color: "var(--glass-text)",
              }}
            >
              Back to Admin
            </Link>
          </div>

          <div
            className="mt-6 rounded-3xl overflow-hidden"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
              backdropFilter: "var(--glass-backdrop)",
              WebkitBackdropFilter: "var(--glass-backdrop)",
            }}
          >
            <div className="p-5 md:p-7">
              <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
                <div>
                  <div
                    className="rounded-2xl overflow-hidden relative h-40 md:h-44"
                    style={{
                      background: "rgba(255,255,255,0.72)",
                      border: "1px solid rgba(15, 23, 42, 0.10)",
                    }}
                  >
                    {draft.thumbnail === '[VIDEO]' ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/20">
                        <div className="text-center">
                          <div className="text-4xl mb-2">🎬</div>
                          <div className="text-sm opacity-75">Video thumbnail</div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={draft.thumbnail || homeBg}
                        alt="Thumbnail preview"
                        className="w-full h-full object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/25" />
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 items-center justify-between">
                      <div className="text-white">
                        <div className="text-[10px] tracking-[0.16em] font-semibold opacity-85">
                          THUMBNAIL (COVER)
                        </div>
                        <div className="text-sm font-semibold">Upload a thumbnail image</div>
                      </div>

                      <label
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.92)",
                          border: "1px solid rgba(255,255,255,0.95)",
                          color: "var(--glass-text)",
                        }}
                      >
                        <Upload size={14} />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const dataUrl = await fileToDataUrl(file);
                            setDraft((prev) => ({
                              ...prev,
                              thumbnail: dataUrl,
                              thumbnailUrl: "",
                            }));
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                      Thumbnail URL (optional)
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={draft.thumbnailUrl}
                        onChange={(e) => updateField("thumbnailUrl", e.target.value)}
                        className="am-control w-full rounded-2xl px-4 py-3 outline-none text-sm"
                        placeholder="https://example.com/image.jpg"
                      />
                      <button
                        type="button"
                        onClick={() => applyThumbnailUrl(draft.thumbnailUrl)}
                        className="rounded-2xl px-4 py-3 text-sm font-semibold border"
                        style={{
                          background: "rgba(255,255,255,0.82)",
                          borderColor: "rgba(15, 23, 42, 0.12)",
                          color: "var(--glass-text)",
                        }}
                      >
                        Apply
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, thumbnail: "", thumbnailUrl: "" }))
                      }
                      className="mt-2 text-xs font-semibold opacity-70 hover:opacity-100"
                    >
                      Remove thumbnail
                    </button>
                  </div>

                  <div className="mt-6 grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                        Title
                      </label>
                      <input
                        value={draft.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        className="am-control mt-2 w-full rounded-2xl px-4 py-3 outline-none text-sm"
                        placeholder="Article title"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                        Author(s)
                      </label>
                      <div className="mt-2 space-y-2">
                        {(draft.authors || [""]).map((value, index) => (
                          <div key={`author-${index}`} className="flex gap-2">
                            <div className="flex-1">
                              <input
                                value={value}
                                onChange={(e) => updateAuthor(index, e.target.value)}
                                className="am-control w-full rounded-2xl px-4 py-3 outline-none text-sm"
                                placeholder="Author name"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAuthor(index)}
                              className="w-11 rounded-2xl border flex items-center justify-center"
                              aria-label="Remove author"
                              style={{
                                background: "rgba(255,255,255,0.78)",
                                borderColor: "rgba(15, 23, 42, 0.12)",
                                color: "var(--glass-text)",
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addAuthor}
                        className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border transition-transform duration-200 hover:-translate-y-0.5"
                        style={{
                          background: "rgba(255,255,255,0.78)",
                          borderColor: "rgba(15, 23, 42, 0.12)",
                          color: "var(--glass-text)",
                        }}
                      >
                        <Plus size={14} /> Add author
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                        Date Published
                      </label>
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) => updateField("date", e.target.value)}
                        className="am-control mt-2 w-full rounded-2xl px-4 py-3 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                        Status
                      </label>
                      <div className="relative mt-2" ref={statusMenuRef}>
                        <input
                          value={draft.status}
                          onChange={(e) => updateField("status", e.target.value)}
                          className="am-control w-full rounded-2xl px-4 py-3 pr-10 outline-none text-sm"
                          placeholder="Done / Upcoming / Ongoing..."
                          onFocus={() => setStatusMenuOpen(true)}
                          aria-label="Article status"
                        />
                        <button
                          type="button"
                          onClick={() => setStatusMenuOpen((prev) => !prev)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl border flex items-center justify-center"
                          style={{
                            background: "rgba(255,255,255,0.72)",
                            borderColor: "rgba(15, 23, 42, 0.12)",
                            color: "var(--glass-text)",
                          }}
                          aria-label="Toggle status menu"
                          aria-expanded={statusMenuOpen}
                        >
                          <span className="text-xs opacity-70" aria-hidden="true">
                            ▼
                          </span>
                        </button>

                        {statusMenuOpen ? (
                          <div
                            className="absolute z-30 top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden"
                            role="listbox"
                            style={{
                              background: "rgba(255,255,255,0.92)",
                              border: "1px solid rgba(15, 23, 42, 0.12)",
                              boxShadow: "0 18px 34px rgba(11,18,32,0.16)",
                              backdropFilter: "blur(12px)",
                              WebkitBackdropFilter: "blur(12px)",
                            }}
                          >
                            {["Done", "Upcoming", "Ongoing"].map((value) => {
                              const isHovered = hoveredStatus === value;
                              const isActive =
                                String(draft.status || "").trim().toLowerCase() ===
                                value.toLowerCase();
                              return (
                                <button
                                  key={`status-${value}`}
                                  type="button"
                                  onMouseEnter={() => setHoveredStatus(value)}
                                  onMouseLeave={() => setHoveredStatus("")}
                                  onClick={() => {
                                    updateField("status", value);
                                    setStatusMenuOpen(false);
                                  }}
                                  className="w-full px-4 py-3 text-sm text-left"
                                  style={{
                                    background: isHovered || isActive
                                      ? "color-mix(in srgb, var(--theme-violet) 10%, white)"
                                      : "transparent",
                                    color: isActive ? "var(--theme-violet)" : "var(--glass-text)",
                                    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
                                  }}
                                  role="option"
                                  aria-selected={isActive}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                        Category
                      </label>
                      <div className="relative mt-2" ref={categoryMenuRef}>
                        <button
                          type="button"
                          onClick={() => setCategoryMenuOpen((prev) => !prev)}
                          className="am-control w-full rounded-2xl px-4 py-3 outline-none text-sm flex items-center justify-between gap-3"
                          aria-haspopup="menu"
                          aria-expanded={categoryMenuOpen}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {(() => {
                              const Icon = ARTICLE_CATEGORY_ICONS[draft.category];
                              return Icon ? <Icon size={16} /> : null;
                            })()}
                            <span className="truncate">{draft.category}</span>
                          </span>
                          <span className="text-xs opacity-70" aria-hidden="true">
                            ▼
                          </span>
                        </button>

                        {categoryMenuOpen && (
                          <div
                            className="absolute z-30 top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden"
                            role="menu"
                            style={{
                              background: "rgba(255,255,255,0.92)",
                              border: "1px solid rgba(15, 23, 42, 0.12)",
                              boxShadow: "0 18px 34px rgba(11,18,32,0.16)",
                              backdropFilter: "blur(12px)",
                              WebkitBackdropFilter: "blur(12px)",
                            }}
                          >
                            {ARTICLE_CATEGORIES.map((category) => {
                              const Icon = ARTICLE_CATEGORY_ICONS[category];
                              const categoryColor = getCategoryColor(category);
                              const isHovered = hoveredCategory === category;
                              const isActive = draft.category === category;
                              return (
                                <button
                                  key={category}
                                  type="button"
                                  onMouseEnter={() => setHoveredCategory(category)}
                                  onMouseLeave={() => setHoveredCategory("")}
                                  onClick={() => {
                                    updateField("category", category);
                                    setCategoryMenuOpen(false);
                                  }}
                                  className="w-full px-4 py-3 text-sm flex items-center gap-3 text-left"
                                  style={{
                                    background: isHovered || isActive
                                      ? `color-mix(in srgb, ${categoryColor} 12%, white)`
                                      : "transparent",
                                    color: "var(--glass-text)",
                                    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
                                  }}
                                  role="menuitem"
                                >
                                  <span
                                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{
                                      background: `color-mix(in srgb, ${categoryColor} 10%, white)`,
                                      border: `1px solid color-mix(in srgb, ${categoryColor} 30%, transparent)`,
                                      color: categoryColor,
                                    }}
                                  >
                                    {Icon ? <Icon size={14} /> : null}
                                  </span>
                                  <span className="flex-1 min-w-0 truncate">{category}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                      Article ID (URL)
                    </label>
                    <input
                      value={draft.id}
                      readOnly
                      className="am-control mt-2 w-full rounded-2xl px-4 py-3 outline-none text-sm font-mono"
                      placeholder="YYYY-M-D-article-catN-order"
                    />
                    <p className="text-[11px] opacity-70 mt-2">
                      This becomes: <span className="font-mono">/articles/{draft.id || "..."}</span>
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                      Caption
                    </label>
                    <textarea
                      ref={captionRef}
                      value={draft.caption}
                      onChange={(e) => updateField("caption", e.target.value)}
                      className="am-control mt-2 w-full rounded-2xl px-4 py-3 outline-none text-sm min-h-[110px] resize-none overflow-hidden"
                      placeholder="Short caption / description (use \\n for line breaks)"
                    />
                  </div>
                </div>

                <div>
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.72)",
                      border: "1px solid rgba(15, 23, 42, 0.10)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold tracking-wide uppercase opacity-80">
                          Facebook Import
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          Paste a public post URL to autofill this draft.
                        </div>
                      </div>
                      <Download size={18} style={{ color: "var(--theme-violet)" }} />
                    </div>

                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <input
                        value={fbImportUrl}
                        onChange={(e) => setFbImportUrl(e.target.value)}
                        className="am-control w-full rounded-2xl px-4 py-3 outline-none text-sm"
                        placeholder="https://www.facebook.com/..."
                        disabled={fbImporting}
                      />
                      <button
                        type="button"
                        onClick={onImportFacebookPost}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold border transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                        style={{
                          background: "rgba(255,255,255,0.84)",
                          borderColor: "rgba(15, 23, 42, 0.12)",
                          color: "var(--theme-violet)",
                        }}
                        disabled={fbImporting}
                      >
                        {fbImporting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        {fbImporting ? "Importing..." : "Import"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-7 text-xs font-semibold tracking-wide uppercase opacity-80">
                    Social Media Link(s)
                  </div>
                  <div className="mt-2 space-y-2">
                    {draft.links.map((value, index) => {
                      const isFbLink = String(value || "").trim().startsWith('[FB]');
                      const displayValue = isFbLink ? String(value || "").trim().replace('[FB] ', '') : value;
                      
                      return (
                        <div key={`link-${index}`} className="flex gap-2">
                          <div className="flex-1 relative">
                            {isFbLink && (
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none">
                                <Facebook size={16} />
                              </div>
                            )}
                            <input
                              value={displayValue}
                              onChange={(e) => updateLink(index, e.target.value)}
                              className={`am-control w-full rounded-2xl px-4 py-3 outline-none text-sm ${isFbLink ? 'pl-10' : ''}`}
                              placeholder="https://www.facebook.com/..."
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="w-11 rounded-2xl border flex items-center justify-center"
                            aria-label="Remove link"
                            style={{
                              background: "rgba(255,255,255,0.78)",
                              borderColor: "rgba(15, 23, 42, 0.12)",
                              color: "var(--glass-text)",
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addLink}
                    className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      background: "rgba(255,255,255,0.78)",
                      borderColor: "rgba(15, 23, 42, 0.12)",
                      color: "var(--glass-text)",
                    }}
                  >
                    <Plus size={14} /> Add link
                  </button>

                  <div className="mt-7 flex items-center justify-between">
                    <div className="text-xs font-semibold tracking-wide uppercase opacity-80">
                      Media
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {draft.media.length === 0 ? (
                      <div className="text-sm opacity-70">No media yet.</div>
                    ) : (
                      draft.media.map((item, index) => (
                        <div
                          key={item.id}
                          className="rounded-2xl p-4"
                          style={{
                            background: "rgba(255,255,255,0.72)",
                            border: "1px solid rgba(15, 23, 42, 0.10)",
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold">Media #{index + 1}</div>
                            <button
                              type="button"
                              onClick={() => removeMedia(index)}
                              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold border"
                              style={{
                                background: "rgba(255,255,255,0.82)",
                                borderColor: "rgba(15, 23, 42, 0.12)",
                                color: "var(--glass-text)",
                              }}
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold tracking-wide uppercase opacity-80">
                                Type
                              </label>
                              <select
                                value={item.type}
                                onChange={(e) => updateMedia(index, { type: e.target.value })}
                                className="am-control mt-2 w-full rounded-2xl px-4 py-2.5 outline-none text-sm"
                              >
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold tracking-wide uppercase opacity-80">
                                Source URL
                              </label>
                              <input
                                value={item.src}
                                onChange={(e) => updateMedia(index, { src: e.target.value })}
                                className="am-control mt-2 w-full rounded-2xl px-4 py-2.5 outline-none text-sm"
                                placeholder="https://..."
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 items-center">
                            <label
                              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold cursor-pointer border"
                              style={{
                                background: "rgba(255,255,255,0.82)",
                                borderColor: "rgba(15, 23, 42, 0.12)",
                                color: "var(--glass-text)",
                              }}
                            >
                              <Upload size={14} />
                              Upload file
                              <input
                                type="file"
                                accept={item.type === "video" ? "video/*" : "image/*"}
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const dataUrl = await fileToDataUrl(file);
                                  updateMedia(index, { src: dataUrl });
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            {item.src?.trim() ? (
                              <a
                                href={item.src}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border"
                                style={{
                                  background: "rgba(255,255,255,0.82)",
                                  borderColor: "rgba(15, 23, 42, 0.12)",
                                  color: "var(--glass-text)",
                                }}
                              >
                                <ExternalLink size={14} />
                                Open
                              </a>
                            ) : null}
                          </div>

                          <div className="mt-3">
                            <label className="block text-[11px] font-semibold tracking-wide uppercase opacity-80">
                              Caption (optional)
                            </label>
                            <input
                              value={item.caption}
                              onChange={(e) => updateMedia(index, { caption: e.target.value })}
                              className="am-control mt-2 w-full rounded-2xl px-4 py-2.5 outline-none text-sm"
                              placeholder="Media caption"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={addMedia}
                    className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      background: "rgba(255,255,255,0.78)",
                      borderColor: "rgba(15, 23, 42, 0.12)",
                      color: "var(--glass-text)",
                    }}
                  >
                    <Plus size={14} /> Add media
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 justify-between">
                <div className="text-sm">
                  {status ? (
                    <span
                      style={{
                        color: /^(saved|draft|ready|imported)/i.test(status)
                          ? "var(--theme-blue)"
                          : "#b91c1c",
                      }}
                    >
                      {status}
                    </span>
                  ) : (
                    <span className="opacity-70">Ready.</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingId ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = window.confirm(
                          editingDraft
                            ? "Delete this draft? This won't affect the published site."
                            : "Delete this article? This will hide it from the website on this browser.",
                        );
                        if (!ok) return;
                        if (editingDraft) {
                          deleteAdminDraft(editingId);
                        } else {
                          await tryDeleteRepoArticle(editingId);
                          deleteArticleId(editingId);
                        }
                        navigate("/admin", { replace: true });
                      }}
                      className="rounded-full px-4 py-2 text-sm font-semibold border"
                      style={{
                        background: "rgba(255,255,255,0.82)",
                        borderColor: "rgba(15, 23, 42, 0.12)",
                        color: "#b91c1c",
                      }}
                      disabled={saving}
                    >
                      {editingDraft ? "Delete Draft" : "Delete"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      window.localStorage.removeItem(draftKey);
                      setDraft((prev) => ({ ...defaultDraft(), id: prev.id }));
                      setStatus("Draft cleared.");
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold border"
                    style={{
                      background: "rgba(255,255,255,0.82)",
                      borderColor: "rgba(15, 23, 42, 0.12)",
                      color: "var(--glass-text)",
                    }}
                    disabled={saving}
                  >
                    Clear draft
                  </button>
                  <button
                    type="button"
                    onClick={onSaveDraft}
                    className="rounded-full px-4 py-2 text-sm font-semibold border"
                    style={{
                      background: "rgba(255,255,255,0.82)",
                      borderColor: "rgba(15, 23, 42, 0.12)",
                      color: "var(--glass-text)",
                    }}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="rounded-full px-4 py-2 text-sm font-semibold border transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      background: "rgba(255,255,255,0.82)",
                      borderColor: "rgba(15, 23, 42, 0.12)",
                      color: "var(--theme-violet)",
                    }}
                    disabled={saving}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Eye size={16} />
                      Preview
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPublish("publish")}
                    className="rounded-full px-5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                    style={{
                      background: "var(--theme-orange)",
                      color: "white",
                      boxShadow: "0 12px 26px rgba(234, 88, 12, 0.28)",
                    }}
                    disabled={saving}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => onPublish("view")}
                    className="rounded-full px-5 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                    style={{
                      background: "var(--theme-orange)",
                      color: "white",
                      boxShadow: "0 12px 26px rgba(234, 88, 12, 0.28)",
                    }}
                    disabled={saving}
                  >
                    Publish & View
                  </button>
                </div>
              </div>

              <p className="text-[11px] opacity-70 mt-4">
                Note: uploads are stored as data URLs in your browser storage (large files may fail).
              </p>
            </div>
          </div>

        </div>
        <Footer />
      </main>

      {previewOpen ? (
        <div
          className="fixed left-0 right-0 bottom-0 z-50 top-[calc(0.75rem+3.5rem)] md:top-[calc(2.5vh+8.75vh)]"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => {
              setPreviewOpen(false);
              closePreviewMedia();
            }}
            aria-hidden="true"
          />
          <div
            className="relative h-full flex items-center justify-center px-4 py-6 md:py-8"
            style={{ top: 0 }}
          >
            <div
              className="w-[92vw] max-w-5xl rounded-3xl overflow-hidden pointer-events-auto"
              style={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(15, 23, 42, 0.12)",
                boxShadow: "0 26px 54px rgba(11,18,32,0.22)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Article preview"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 md:px-7 py-4 flex items-center justify-between gap-3 border-b border-slate-200/60">
                <div className="min-w-0">
                  <div className="text-[10px] tracking-[0.16em] font-semibold opacity-70">
                    PREVIEW
                  </div>
                  <div className="text-sm md:text-base font-semibold truncate">
                    {previewArticle.title || "Untitled article"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    closePreviewMedia();
                  }}
                  className="w-10 h-10 rounded-full border flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.88)",
                    borderColor: "rgba(15, 23, 42, 0.12)",
                    color: "var(--glass-text)",
                  }}
                  aria-label="Close preview"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className="px-5 md:px-7 py-5 overflow-auto"
                style={{ height: "70vh" }}
              >
                <div className="rounded-2xl overflow-hidden h-44 md:h-52">
                  <img
                    src={previewArticle.image || homeBg}
                    alt="Preview cover"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg md:text-2xl font-semibold leading-tight">
                      {previewArticle.title || "Untitled article"}
                    </div>
                    <div className="mt-2 space-y-1 text-xs md:text-sm opacity-85">
                      <div>{previewArticle.author || "Author"}</div>
                      <div>{previewArticle.date || "YYYY-MM-DD"}</div>
                      <div>{previewArticle.status || "Done"}</div>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      border: `1.5px solid ${getCategoryColor(previewArticle.category)}`,
                      color: getCategoryColor(previewArticle.category),
                      background: `color-mix(in srgb, ${getCategoryColor(previewArticle.category)} 10%, white)`,
                    }}
                  >
                    {(() => {
                      const Icon = ARTICLE_CATEGORY_ICONS[previewArticle.category];
                      return Icon ? <Icon size={14} strokeWidth={2.2} /> : null;
                    })()}
                    {previewArticle.category}
                  </span>
                </div>

                {previewArticle.description ? (
                  <p className="mt-4 text-sm md:text-base leading-6 md:leading-7 text-justify whitespace-pre-line">
                    {previewArticle.description}
                  </p>
                ) : null}

                {/* No separate "body" anymore; preview is caption-only. */}

                {previewArticle.media?.length ? (
                  <div className="mt-7">
                    <div className="text-sm font-semibold mb-3">Media</div>
                    <MediaCollage media={previewArticle.media} onOpen={openPreviewMedia} />
                  </div>
                ) : null}

                {previewArticle.links?.length ? (
                  <div className="mt-7">
                    <div className="text-sm font-semibold mb-3">Links</div>
                    <div className="space-y-2">
                      {previewArticle.links.map((link, index) => (
                        <a
                          key={`preview-link-${index + 1}`}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm underline break-words"
                          style={{ color: "var(--theme-violet)" }}
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {previewArticle.media?.length ? (
        <MediaOverlay
          media={previewArticle.media}
          activeIndex={previewMediaIndex}
          onClose={closePreviewMedia}
          onPrev={showPrevPreviewMedia}
          onNext={showNextPreviewMedia}
        />
      ) : null}
    </>
  );
}
