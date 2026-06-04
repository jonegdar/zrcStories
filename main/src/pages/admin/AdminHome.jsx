import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import { useAdminAuth } from "../../features/admin/auth/useAdminAuth";
import ArticleRepository from "../../features/articles/domain/articleRepository";
import { deleteArticleId } from "../../features/articles/domain/customArticlesStorage";
import { tryDeleteRepoArticle } from "../../features/articles/domain/repoArticlesClient";
import { deleteAdminDraft, loadAdminDrafts } from "../../features/articles/domain/adminDraftsStorage";

export default function AdminHome() {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    function bump() {
      setVersion((v) => v + 1);
    }
    window.addEventListener("storage", bump);
    window.addEventListener("zrcstories_articles_changed", bump);
    window.addEventListener("zrcstories_admin_drafts_changed", bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener("zrcstories_articles_changed", bump);
      window.removeEventListener("zrcstories_admin_drafts_changed", bump);
    };
  }, []);

  const drafts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = loadAdminDrafts();
    const filtered = q
      ? all.filter((d) => {
          return (
            String(d.title || "").toLowerCase().includes(q) ||
            String(d.id || "").toLowerCase().includes(q) ||
            String((d.authors || []).join("; ") || "").toLowerCase().includes(q) ||
            String(d.category || "").toLowerCase().includes(q)
          );
        })
      : all;

    return filtered
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .map((d) => ({
        id: d.id,
        title: d.title || "(Untitled draft)",
        author: (d.authors || []).filter(Boolean).join("; "),
        date: d.date || "",
        category: d.category || "",
      }));
  }, [query, version]);

  const draftIdSet = useMemo(() => new Set(drafts.map((d) => d.id)), [drafts]);

  const articles = useMemo(() => {
    const all = ArticleRepository.getAll()
      .map((a) => ({
        id: a.id,
        title: a.title,
        author: a.author,
        date: a.date,
        category: a.category,
      }))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) => {
      return (
        String(a.title || "").toLowerCase().includes(q) ||
        String(a.author || "").toLowerCase().includes(q) ||
        String(a.id || "").toLowerCase().includes(q) ||
        String(a.category || "").toLowerCase().includes(q)
      );
    });
  }, [query, version]);

  useEffect(() => {
    document.title = "Admin Panel";
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 md:pt-32 pb-8 flex flex-col">
        <div className="w-[92vw] max-w-5xl mx-auto flex-1">
          <style>
            {`
              .admin-action {
                background: rgba(255,255,255,0.82);
                border: 1px solid rgba(15, 23, 42, 0.12);
                box-shadow: 0 10px 24px rgba(11,18,32,0.10);
                color: var(--glass-text);
                transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
              }
              .admin-action:hover,
              .admin-action:focus-visible {
                background: rgba(255,255,255,0.90);
                box-shadow: 0 12px 28px rgba(11,18,32,0.14);
                transform: translateY(-2px);
              }
            `}
          </style>
          <div
            className="rounded-3xl p-6 md:p-8"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
              backdropFilter: "var(--glass-backdrop)",
              WebkitBackdropFilter: "var(--glass-backdrop)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] tracking-[0.14em] font-semibold opacity-70">
                  ADMINISTRATOR
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold mt-1">
                  Admin Panel
                </h1>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/", { replace: true });
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold border transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.82)",
                  borderColor: "rgba(15, 23, 42, 0.12)",
                  color: "var(--glass-text)",
                }}
              >
                Log out
              </button>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(15, 23, 42, 0.10)",
                }}
              >
                <div className="text-sm font-semibold">Article Maker</div>
                <p className="text-xs opacity-80 mt-1">
                  Create and publish new articles.
                </p>
                <div className="mt-3">
                  <Link
                    to="/admin/articles/new"
                    className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      background: "var(--theme-orange)",
                      color: "#0b1220",
                      boxShadow: "0 12px 26px rgba(234, 88, 12, 0.28)",
                    }}
                  >
                    Open Article Maker
                  </Link>
                </div>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(15, 23, 42, 0.10)",
                }}
              >
                <div className="text-sm font-semibold" aria-hidden="true">
                  &nbsp;
                </div>
                <p className="text-xs opacity-80 mt-1">
                  &nbsp;
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="text-lg font-semibold">Manage Articles</div>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="rounded-full px-4 py-2 text-sm outline-none border w-full sm:w-[280px]"
                  style={{
                    background: "rgba(255,255,255,0.82)",
                    borderColor: "rgba(15, 23, 42, 0.12)",
                    color: "var(--glass-text)",
                  }}
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">
                    Drafts <span className="opacity-70 font-normal">(not published)</span>
                  </div>
                </div>

                <div
                  className="mt-2 rounded-2xl overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    border: "1px solid rgba(15, 23, 42, 0.10)",
                  }}
                >
                  <div className="max-h-[280px] overflow-auto">
                    <div className="hidden md:grid grid-cols-[1.4fr_0.9fr_0.7fr_150px] gap-3 px-4 py-3 text-[11px] font-semibold tracking-wide uppercase opacity-70 sticky top-0 bg-white/80 backdrop-blur">
                      <div>Title</div>
                      <div>Author</div>
                      <div>Date</div>
                      <div>Actions</div>
                    </div>
                    {drafts.length ? (
                      drafts.map((draft) => (
                        <div
                          key={`draft-${draft.id}`}
                          className="md:grid md:grid-cols-[1.4fr_0.9fr_0.7fr_150px] md:gap-3 px-4 py-3 border-t border-slate-200/60 items-start md:items-center"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{draft.title}</div>
                            <div className="text-[11px] opacity-70 font-mono truncate">
                              {draft.id} â€¢ {draft.category}
                            </div>
                          </div>
                          <div className="text-xs opacity-80 truncate mt-2 md:mt-0">
                            <span className="md:hidden font-semibold opacity-70 mr-2">Author</span>
                            {draft.author || <span className="opacity-60">—</span>}
                          </div>
                          <div className="text-xs opacity-80 mt-1 md:mt-0">
                            <span className="md:hidden font-semibold opacity-70 mr-2">Date</span>
                            {draft.date || <span className="opacity-60">—</span>}
                          </div>
                          <div className="flex items-center gap-3 justify-start md:justify-end mt-3 md:mt-0">
                            <Link
                              to={`/admin/articles/${encodeURIComponent(draft.id)}/edit`}
                              className="admin-action rounded-full px-3 py-1.5 text-xs font-semibold inline-flex items-center justify-center"
                              style={{ color: "var(--theme-orange)" }}
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                const ok = window.confirm(
                                  `Delete draft "${draft.title}"? This won't affect the published site.`,
                                );
                                if (!ok) return;
                                deleteAdminDraft(draft.id);
                                setVersion((v) => v + 1);
                              }}
                              className="admin-action rounded-full px-3 py-1.5 text-xs font-semibold"
                              style={{ color: "#b91c1c" }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-5 text-sm opacity-70">No drafts.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 text-sm font-semibold">Published</div>
              <div
                className="mt-2 rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(15, 23, 42, 0.10)",
                }}
              >
                <div className="max-h-[420px] overflow-auto">
                  <div className="hidden md:grid grid-cols-[1.4fr_0.9fr_0.7fr_150px] gap-3 px-4 py-3 text-[11px] font-semibold tracking-wide uppercase opacity-70 sticky top-0 bg-white/80 backdrop-blur">
                    <div>Title</div>
                    <div>Author</div>
                    <div>Date</div>
                    <div>Actions</div>
                  </div>
                  {articles.length ? (
                    articles.map((article) => (
                      <div
                        key={article.id}
                        className="md:grid md:grid-cols-[1.4fr_0.9fr_0.7fr_150px] md:gap-3 px-4 py-3 border-t border-slate-200/60 items-start md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{article.title}</div>
                          {draftIdSet.has(article.id) ? (
                            <div className="mt-1">
                              <span className="text-[10px] px-2 py-0.5 rounded-full border opacity-80 inline-flex">
                                Draft
                              </span>
                            </div>
                          ) : null}
                          <div className="text-[11px] opacity-70 font-mono truncate">
                            {article.id} • {article.category}
                          </div>
                        </div>
                        <div className="text-xs opacity-80 truncate mt-2 md:mt-0">
                          <span className="md:hidden font-semibold opacity-70 mr-2">Author</span>
                          {article.author}
                        </div>
                        <div className="text-xs opacity-80 mt-1 md:mt-0">
                          <span className="md:hidden font-semibold opacity-70 mr-2">Date</span>
                          {article.date}
                        </div>
                        <div className="flex items-center gap-3 justify-start md:justify-end mt-3 md:mt-0">
                          <Link
                            to={`/admin/articles/${encodeURIComponent(article.id)}/edit`}
                            className="admin-action rounded-full px-3 py-1.5 text-xs font-semibold inline-flex items-center justify-center"
                            style={{ color: "var(--theme-orange)" }}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = window.confirm(
                                `Delete "${article.title}"? This hides it from the website on this browser.`,
                              );
                              if (!ok) return;
                              await tryDeleteRepoArticle(article.id);
                              deleteArticleId(article.id);
                              setVersion((v) => v + 1);
                            }}
                            className="admin-action rounded-full px-3 py-1.5 text-xs font-semibold"
                            style={{ color: "#b91c1c" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm opacity-70">No matching articles.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
}
