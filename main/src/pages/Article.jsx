import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  LayoutGrid,
  Link2,
  UserRound,
  X,
} from "lucide-react";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import { getReadMoreArticles } from "../features/articles/domain/articleSelectors";
import { useArticles } from "../features/articles/domain/useArticles";
import { ARTICLE_CATEGORY_META } from "../features/articles/constants/categories";
import { ARTICLE_DETAIL_CATEGORY_ICONS } from "../features/articles/constants/icons";
import { formatPublishedDate } from "../utils/date";

function MediaFrame({ item, className = "" }) {
  return (
    <div className={`w-full h-full bg-black/10 ${className}`}>
      {item.type === "video" ? (
        <video controls preload="metadata" className="w-full h-full object-cover">
          <source src={item.src} type="video/mp4" />
        </video>
      ) : (
        <img
          src={item.src}
          alt={item.caption}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}

function MediaCollage({ media, onOpen }) {
  const preview = media.slice(0, 3);
  const remaining = Math.max(0, media.length - 3);

  if (!preview.length) return null;

  if (preview.length < 3) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {preview.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(index)}
            className="rounded-xl overflow-hidden relative h-60 cursor-pointer"
          >
            <MediaFrame item={item} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 grid-rows-2 gap-1.5 md:gap-2 h-[170px] sm:h-[230px] md:h-[380px]"
      aria-label="Article media collage"
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

  if (activeIndex < 0 || activeIndex >= media.length) return null;

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

      <div className="w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <div
          className="relative max-h-[85vh] rounded-2xl overflow-hidden"
          onTouchStart={(event) => {
            touchStartXRef.current = event.touches[0].clientX;
          }}
          onTouchEnd={(event) => {
            if (touchStartXRef.current === null) return;
            const delta = event.changedTouches[0].clientX - touchStartXRef.current;
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

          <MediaFrame item={item} className="max-h-[75vh]" />
          <div
            className="px-4 py-3 text-white/95 text-sm"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.35))",
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

export default function Article() {
  const { id } = useParams();
  const [activeMediaIndex, setActiveMediaIndex] = useState(-1);

  const allArticles = useArticles();
  const article = useMemo(() => allArticles.find((a) => a.id === id) || null, [allArticles, id]);

  useEffect(() => {
    document.title = article
      ? `ZRC Stories: ${article.title}`
      : "ZRC Stories: Article";
  }, [article]);

  if (!article) {
    return <Navigate to="/gallery" replace />;
  }

  const categoryColor =
    ARTICLE_CATEGORY_META[article.category]?.color || "var(--category-all)";
  const CategoryIcon = ARTICLE_DETAIL_CATEGORY_ICONS[article.category] || LayoutGrid;
  const readMoreArticles = useMemo(() => {
    return getReadMoreArticles(allArticles, article.id, 2);
  }, [allArticles, article.id]);
  const mediaItems = article.media || [];

  const openMedia = (index) => {
    setActiveMediaIndex(index);
  };

  const closeMedia = () => {
    setActiveMediaIndex(-1);
  };

  const showPrevMedia = () => {
    setActiveMediaIndex((prev) =>
      prev <= 0 ? mediaItems.length - 1 : prev - 1,
    );
  };

  const showNextMedia = () => {
    setActiveMediaIndex((prev) =>
      prev >= mediaItems.length - 1 ? 0 : prev + 1,
    );
  };

  function getLinkMeta(url) {
    const lower = String(url || "").toLowerCase();
    if (lower.includes("facebook.com") || lower.includes("fb.com")) {
      return { label: "Facebook", Icon: Facebook };
    }
    if (lower.includes("instagram.com")) {
      return { label: "Instagram", Icon: Instagram };
    }
    return { label: "Link", Icon: Link2 };
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-y-auto overflow-x-hidden pb-2">
        <header className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/35" />
        </header>

        <section className="w-[96vw] sm:w-[90vw] lg:w-[65vw] mx-auto mt-4 md:mt-8">
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 text-sm mb-5 opacity-85 hover:opacity-100"
          >
            <ChevronLeft size={16} />
            Back to Gallery
          </Link>

          <article
            className="relative rounded-2xl p-3 sm:p-4 md:p-8"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-semibold leading-tight">
                {article.title}
              </h1>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold"
                style={{
                  border: `1.5px solid ${categoryColor}`,
                  color: categoryColor,
                  background: `color-mix(in srgb, ${categoryColor} 10%, white)`,
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                }}
              >
                {article.category === "SHC announcements" ? (
                  <span
                    className="inline-block w-4 h-4 md:w-4.5 md:h-4.5 bg-center bg-contain bg-no-repeat"
                    style={{ backgroundImage: "var(--shc-logo)" }}
                    aria-hidden="true"
                  />
                ) : (
                  <CategoryIcon size={14} strokeWidth={2.2} />
                )}
                {article.category}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs md:text-sm opacity-85">
              <div className="flex items-center gap-2">
                <UserRound size={15} />
                {article.author}
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays size={15} />
                {formatPublishedDate(article.date)}
              </div>
            </div>

            {article.description && (
              <p className="mt-6 text-sm md:text-base leading-6 md:leading-8 text-justify whitespace-pre-line">
                {article.description}
              </p>
            )}

            {(article.paragraphs || []).length ? (
              <div className="mt-7 space-y-5">
                {(article.paragraphs || []).map((paragraph, index) => (
                  <p
                    key={`${article.id}-p-${index + 1}`}
                    className="text-sm md:text-base leading-6 md:leading-8 text-justify whitespace-pre-line indent-5 md:indent-8"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : null}

            {(mediaItems.length || article.links?.length) && (
              <div className="mt-9 space-y-6">
                {mediaItems.length ? (
                  <div>
                    <h3 className="text-base md:text-xl font-semibold mb-3">
                      Media
                    </h3>
                    <MediaCollage media={mediaItems} onOpen={openMedia} />
                  </div>
                ) : null}

                {article.links?.length ? (
                  <div>
                    <h3 className="text-base md:text-xl font-semibold mb-3">
                      Links
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      {article.links.map((link, index) => {
                        const { label, Icon } = getLinkMeta(link);
                        return (
                          <a
                            key={`${article.id}-link-${index + 1}`}
                            href={link}
                            className="w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                            style={{
                              borderColor: "rgba(124, 58, 237, 0.35)",
                              color: "var(--theme-violet)",
                              background: "color-mix(in srgb, var(--theme-violet) 10%, white)",
                              boxShadow: "0 10px 20px rgba(11,18,32,0.15)",
                            }}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={label}
                            title={label}
                          >
                            <Icon size={18} strokeWidth={2} />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-9">
              <h3 className="text-base md:text-xl font-semibold mb-3">Read more</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {readMoreArticles.map((nextArticle) => {
                  const nextCategoryColor =
                    ARTICLE_CATEGORY_META[nextArticle.category]?.color ||
                    "var(--category-all)";
                  const NextCategoryIcon =
                    ARTICLE_DETAIL_CATEGORY_ICONS[nextArticle.category] ||
                    LayoutGrid;

                  return (
                    <Link
                      key={nextArticle.id}
                      to={`/articles/${nextArticle.id}`}
                      className="group rounded-xl overflow-hidden block transform transition-all duration-300 hover:-translate-y-1.5"
                      style={{
                        background: "var(--glass-bg)",
                        border: "1px solid var(--glass-border)",
                        boxShadow: "0 10px 24px rgba(11,18,32,0.18)",
                      }}
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={nextArticle.image}
                          alt={nextArticle.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-32 md:h-40 object-cover"
                        />
                        <span
                          className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] md:text-[11px] font-medium z-10"
                          style={{
                            border: `1.5px solid ${nextCategoryColor}`,
                            color: nextCategoryColor,
                            background: `color-mix(in srgb, ${nextCategoryColor} 8%, white)`,
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                          }}
                        >
                          {nextArticle.category === "SHC announcements" ? (
                            <span
                              className="inline-block w-3 h-3 bg-center bg-contain bg-no-repeat"
                              style={{ backgroundImage: "var(--shc-logo)" }}
                              aria-hidden="true"
                            />
                          ) : (
                            <NextCategoryIcon size={10} strokeWidth={2.2} />
                          )}
                          <span className="hidden sm:inline">{nextArticle.category}</span>
                        </span>
                        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/40" />
                      </div>
                      <div className="p-3">
                        <h4
                          className="text-sm md:text-base font-semibold mt-1 transition-colors duration-300 group-hover:[color:var(--theme-orange)]"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {nextArticle.title}
                        </h4>

                        <p className="text-xs opacity-80 mt-1.5">
                          {nextArticle.author} | {formatPublishedDate(nextArticle.date)}
                        </p>

                        <div className="relative mt-1">
                          <p
                            className="text-xs md:text-sm text-[color:var(--glass-text)] opacity-90 overflow-hidden"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              minHeight: "2.2rem",
                            }}
                          >
                            {nextArticle.description}
                          </p>
                          <div
                            className="pointer-events-none absolute left-0 right-0 bottom-0 h-4"
                            style={{
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0), var(--glass-bg))",
                            }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </article>
        </section>
        <div className="mt-8 md:mt-10">
          <Footer />
        </div>
      </main>

      {mediaItems.length > 0 && (
        <MediaOverlay
          media={mediaItems}
          activeIndex={activeMediaIndex}
          onClose={closeMedia}
          onPrev={showPrevMedia}
          onNext={showNextMedia}
        />
      )}
    </>
  );
}



