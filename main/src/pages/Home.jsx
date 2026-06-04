import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import ArticleCard from "../components/common/ArticleCard";
import homeBg from "../assets/images/homeBg.jpg";
import { ARTICLE_CATEGORY_META } from "../features/articles/constants/categories";
import { ARTICLE_CATEGORY_ICONS } from "../features/articles/constants/icons";
import { parsePublishedDate } from "../utils/date";
import {
  Check,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { getActiveSpecialTags } from "../features/articles/constants/specialTags";
import { useArticles } from "../features/articles/domain/useArticles";

const CATEGORY_ICONS = ARTICLE_CATEGORY_ICONS;

export default function Home() {
  useEffect(() => {
    document.title = "ZRC Stories: Home";
  }, []);

  const allArticles = useArticles();

  function pickRandom(pool, count) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.max(0, count));
  }

  const hotStories = useMemo(() => {
    const activeTags = getActiveSpecialTags();
    const byCategory = allArticles.filter((a) =>
      ["SHC announcements", "Promotions"].includes(a.category),
    );
    const byTag = activeTags.length
      ? allArticles.filter((a) =>
          (a.tags || []).some((t) => activeTags.includes(t)),
        )
      : [];
    const merged = Array.from(
      new Map([...byCategory, ...byTag].map((a) => [a.id, a])).values(),
    );
    return pickRandom(merged, 5);
  }, [allArticles]);

  const importantStories = useMemo(() => {
    const activeTags = getActiveSpecialTags();
    const byCategory = allArticles.filter((a) =>
      ["School Announcements", "SHC announcements"].includes(a.category),
    );
    const byTag = activeTags.length
      ? allArticles.filter((a) =>
          (a.tags || []).some((t) => activeTags.includes(t)),
        )
      : [];
    const merged = Array.from(
      new Map([...byCategory, ...byTag].map((a) => [a.id, a])).values(),
    );
    return pickRandom(merged, 5);
  }, [allArticles]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const withDates = allArticles
      .map((article) => ({
        ...article,
        _date: parsePublishedDate(article.date),
      }))
      .filter((article) => article._date)
      .sort((a, b) => b._date - a._date);

    const upcoming = withDates.filter((article) => article._date >= today);
    if (upcoming.length >= 5) {
      return upcoming.slice(0, 5);
    }

    const upcomingIds = new Set(upcoming.map((article) => article.id));
    const fallback = withDates.filter((article) => !upcomingIds.has(article.id));
    return [...upcoming, ...fallback].slice(0, 5);
  }, [allArticles]);

  function formatScheduleDate(dateValue) {
    if (!dateValue) return "";
    const dt = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(dt.getTime())) return "";
    const mon = dt.toLocaleString("en-US", { month: "short" });
    return `${mon} ${String(dt.getDate()).padStart(2, "0")}, ${dt.getFullYear()}`;
  }

  function previewText(value, max = 120) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  const hotScrollRef = useRef(null);
  const importantScrollRef = useRef(null);
  const valuesRef = useRef(null);
  const storiesRef = useRef(null);
  const [hotOverflow, setHotOverflow] = useState(false);
  const [hotLeft, setHotLeft] = useState(false);
  const [hotRight, setHotRight] = useState(false);
  const [importantOverflow, setImportantOverflow] = useState(false);
  const [importantLeft, setImportantLeft] = useState(false);
  const [importantRight, setImportantRight] = useState(false);

  function updateRowScrollState(ref, setOverflow, setLeft, setRight) {
    const el = ref.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setOverflow(maxScroll > 2);
    setLeft(el.scrollLeft > 2);
    setRight(el.scrollLeft < maxScroll - 2);
  }

  function scrollRow(ref, direction) {
    if (!ref.current) return;
    ref.current.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    });
  }

  function scrollToRef(sectionRef, mode = "top") {
    if (!sectionRef.current) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const offset = 80;
    const scroller = sectionRef.current.closest("main");
    if (!scroller) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const sectionRect = sectionRef.current.getBoundingClientRect();
    const centeredTop =
      scroller.scrollTop +
      (sectionRect.top - scrollerRect.top) -
      (scroller.clientHeight / 2 - sectionRect.height / 2);
    const topAligned =
      scroller.scrollTop + (sectionRect.top - scrollerRect.top) - offset;
    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const targetTop = mode === "center" ? centeredTop : topAligned;

    scroller.scrollTo({
      top: Math.min(maxTop, Math.max(0, targetTop)),
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }

  useEffect(() => {
    const updateAll = () => {
      updateRowScrollState(hotScrollRef, setHotOverflow, setHotLeft, setHotRight);
      updateRowScrollState(
        importantScrollRef,
        setImportantOverflow,
        setImportantLeft,
        setImportantRight,
      );
    };

    updateAll();
    window.addEventListener("resize", updateAll);
    return () => window.removeEventListener("resize", updateAll);
  }, []);

  return (
    <>
      <Navbar />
      <style>
        {`
          .hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .gallery-cta {
            background: rgba(107, 114, 128, 0.14);
            border-color: rgba(107, 114, 128, 0.35);
            color: rgba(55, 65, 81, 0.95);
          }
          .gallery-cta:hover,
          .gallery-cta:focus-visible {
            background: color-mix(in srgb, var(--category-shc) 18%, white);
            border-color: color-mix(in srgb, var(--category-shc) 58%, transparent);
            color: var(--category-shc);
          }
          .events-cta {
            background: rgba(107, 114, 128, 0.14);
            border-color: rgba(107, 114, 128, 0.35);
            color: rgba(55, 65, 81, 0.95);
          }
          .events-cta:hover,
          .events-cta:focus-visible {
            background: color-mix(in srgb, var(--theme-violet) 18%, white);
            border-color: color-mix(in srgb, var(--theme-violet) 58%, transparent);
            color: var(--theme-violet);
          }
          .schedule-card {
            background: white;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow:
              0 14px 30px rgba(15, 23, 42, 0.12),
              0 4px 12px rgba(15, 23, 42, 0.08);
          }
          .schedule-row {
            border-left: 3px solid transparent;
            transition: background 200ms ease, border-color 200ms ease;
          }
          .schedule-row:hover {
            background: color-mix(in srgb, var(--row-accent) 10%, white);
            border-left-color: var(--row-accent);
          }
          .schedule-row:focus-visible {
            outline: 2px solid var(--row-accent);
            outline-offset: -2px;
          }
        `}
      </style>

      <main className="h-screen overflow-y-auto overflow-x-hidden">
        <div className="w-full h-[90vh] relative flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${homeBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "brightness(30%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.28) 55%, rgba(0,0,0,0.72) 100%)",
            }}
          />
          <div
            className="relative z-10 text-center px-4 text-white reveal-on-scroll gpu-animate"
            data-reveal
          >
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-semibold">
              Welcome to ZRC Stories!
            </h1>
            <p className="mt-3 text-[0.72rem] sm:text-sm md:text-xl opacity-95 max-w-3xl mx-auto">
              Scroll through all the stories that have happened, are happening,
              and will happen in ZRC
            </p>
            <div className="mt-4 md:mt-6 flex flex-wrap gap-2 md:gap-3 justify-center">
              <button
                type="button"
                onClick={() => scrollToRef(valuesRef, "center")}
                className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium bg-white/20 border border-white/45 backdrop-blur-md transition-transform duration-200 hover:scale-105 focus-visible:scale-105"
              >
                Core Values
              </button>
              <button
                type="button"
                onClick={() => scrollToRef(storiesRef)}
                className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium bg-white/20 border border-white/45 backdrop-blur-md transition-transform duration-200 hover:scale-105 focus-visible:scale-105"
              >
                Browse articles
              </button>
            </div>
          </div>
        </div>

        <section
          ref={valuesRef}
          data-reveal
          className="w-[96vw] md:w-[70vw] h-[24vh] min-h-[195px] md:min-h-0 md:h-[30vh] mx-auto -mt-[12vh] md:-mt-[15vh] relative z-20 rounded-[12px] overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "var(--glass-backdrop)",
            WebkitBackdropFilter: "var(--glass-backdrop)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          <div className="grid grid-cols-3 h-full">
            <div className="relative p-2 md:p-6 flex flex-col items-center justify-center text-center">
              <Check
                className="w-5 h-5 md:w-11 md:h-11"
                strokeWidth={2.2}
                style={{ color: "var(--theme-blue)" }}
              />
              <h3
                className="text-[0.8rem] md:text-2xl font-semibold mt-1 md:mt-3"
                style={{ color: "var(--theme-blue)" }}
              >
                Integrity
              </h3>
              <p className="mt-1 md:mt-3 text-[0.58rem] md:text-sm opacity-90 leading-tight md:leading-relaxed">
                Scholars demonstrate honesty, fairness, and respect in their
                pursuits and social interactions, upholding high standards of
                behavior.
              </p>
              <span
                className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[0.5px] h-[70%] bg-gray-300/45"
                aria-hidden="true"
              />
            </div>

            <div className="relative p-2 md:p-6 flex flex-col items-center justify-center text-center">
              <Gauge
                className="w-5 h-5 md:w-11 md:h-11"
                strokeWidth={2.2}
                style={{ color: "var(--theme-violet)" }}
              />
              <h3
                className="text-[0.8rem] md:text-2xl font-semibold mt-1 md:mt-3"
                style={{ color: "var(--theme-violet)" }}
              >
                Excellence
              </h3>
              <p className="mt-1 md:mt-3 text-[0.58rem] md:text-sm opacity-90 leading-tight md:leading-relaxed">
                Scholars strive for the highest standards in academics, critical
                thinking, and creativity, harnessing their full potential.
              </p>
              <span
                className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[0.5px] h-[70%] bg-gray-300/45"
                aria-hidden="true"
              />
            </div>

            <div className="p-2 md:p-6 flex flex-col items-center justify-center text-center">
              <ChevronsUp
                className="w-5 h-5 md:w-11 md:h-11"
                strokeWidth={2.2}
                style={{ color: "var(--theme-orange)" }}
              />
              <h3
                className="text-[0.8rem] md:text-2xl font-semibold mt-1 md:mt-3"
                style={{ color: "var(--theme-orange)" }}
              >
                Service to Nation
              </h3>
              <p className="mt-1 md:mt-3 text-[0.58rem] md:text-sm opacity-90 leading-tight md:leading-relaxed">
                Scholars are committed to serving God, the country, and their
                fellowmen, applying their expertise to solve societal
                challenges.
              </p>
            </div>
          </div>
        </section>

        <section
          ref={storiesRef}
          className="w-[90vw] md:w-[70vw] mx-auto mt-10 md:mt-14 pb-4 reveal-on-scroll gpu-animate"
          data-reveal
        >
          <div className="mb-14 md:mb-20">
            <h2 className="text-lg md:text-3xl font-semibold text-left">
              Hot stories 🔥🔥
            </h2>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs md:text-base opacity-85 text-left">
                The latest trending stories in ZRC
              </p>
              <Link
                to="/gallery"
                className="gallery-cta group inline-flex items-center justify-end rounded-full pl-4 pr-3 py-1.5 text-[10px] md:text-sm font-medium whitespace-nowrap border transition-all duration-300 w-[124px] md:w-[140px]"
              >
                <span className="flex items-center justify-end w-full">
                  <ArrowRight
                    size={14}
                    className="w-[14px] mr-1 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                  />
                  <span className="text-right">Go to Gallery</span>
                </span>
              </Link>
            </div>
            <div className="mt-5 md:mt-6 relative">
              <div
                ref={hotScrollRef}
                className="overflow-x-auto hide-scrollbar -mx-4 px-4 pt-5 pb-6"
                onScroll={() =>
                  updateRowScrollState(
                    hotScrollRef,
                    setHotOverflow,
                    setHotLeft,
                    setHotRight,
                  )
                }
              >
                <div className="flex gap-3 md:gap-5 min-w-max">
                  {hotStories.map((article) => (
                    <div key={article.id} className="w-[220px] md:w-[280px]">
                      <ArticleCard
                        id={article.id}
                        title={article.title}
                        description={article.description}
                        author={article.author}
                        date={article.date}
                        status={article.status}
                        image={article.image}
                        to={`/articles/${article.id}`}
                        categoryLabel={article.category}
                        categoryColor={ARTICLE_CATEGORY_META[article.category].color}
                        categoryIcon={CATEGORY_ICONS[article.category]}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {hotOverflow && hotLeft && (
                <div
                  className="pointer-events-none absolute inset-y-0 -left-4 w-16 flex items-center justify-start"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--gallery-side-fade-solid), var(--gallery-side-fade-clear))",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => scrollRow(hotScrollRef, -1)}
                    className="chevron-pop-up pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--pill-arrow-bg)",
                      border: "1px solid var(--pill-arrow-border)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                    aria-label="Scroll hot stories left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              )}
              {hotOverflow && hotRight && (
                <div
                  className="pointer-events-none absolute inset-y-0 -right-4 w-16 flex items-center justify-end"
                  style={{
                    background:
                      "linear-gradient(270deg, var(--gallery-side-fade-solid), var(--gallery-side-fade-clear))",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => scrollRow(hotScrollRef, 1)}
                    className="chevron-pop-up pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--pill-arrow-bg)",
                      border: "1px solid var(--pill-arrow-border)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                    aria-label="Scroll hot stories right"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

            </div>
          </div>

          <div>
            <h2 className="text-lg md:text-3xl font-semibold text-left">
              Important info ❗❗
            </h2>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs md:text-base opacity-85 text-left">
                Official information from the campus administration and Scholar&apos;s
                High Council
              </p>
              <Link
                to="/gallery"
                className="gallery-cta group inline-flex items-center justify-end rounded-full pl-4 pr-3 py-1.5 text-[10px] md:text-sm font-medium whitespace-nowrap border transition-all duration-300 w-[124px] md:w-[140px]"
              >
                <span className="flex items-center justify-end w-full">
                  <ArrowRight
                    size={14}
                    className="w-[14px] mr-1 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                  />
                  <span className="text-right">Go to Gallery</span>
                </span>
              </Link>
            </div>
            <div className="mt-5 md:mt-6 relative">
              <div
                ref={importantScrollRef}
                className="overflow-x-auto hide-scrollbar -mx-4 px-4 pt-5 pb-6"
                onScroll={() =>
                  updateRowScrollState(
                    importantScrollRef,
                    setImportantOverflow,
                    setImportantLeft,
                    setImportantRight,
                  )
                }
              >
                <div className="flex gap-3 md:gap-5 min-w-max">
                  {importantStories.map((article) => (
                    <div key={article.id} className="w-[220px] md:w-[280px]">
                      <ArticleCard
                        id={article.id}
                        title={article.title}
                        description={article.description}
                        author={article.author}
                        date={article.date}
                        status={article.status}
                        image={article.image}
                        to={`/articles/${article.id}`}
                        categoryLabel={article.category}
                        categoryColor={ARTICLE_CATEGORY_META[article.category].color}
                        categoryIcon={CATEGORY_ICONS[article.category]}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {importantOverflow && importantLeft && (
                <div
                  className="pointer-events-none absolute inset-y-0 -left-4 w-16 flex items-center justify-start"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--gallery-side-fade-solid), var(--gallery-side-fade-clear))",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => scrollRow(importantScrollRef, -1)}
                    className="chevron-pop-up pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--pill-arrow-bg)",
                      border: "1px solid var(--pill-arrow-border)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                    aria-label="Scroll important stories left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              )}
              {importantOverflow && importantRight && (
                <div
                  className="pointer-events-none absolute inset-y-0 -right-4 w-16 flex items-center justify-end"
                  style={{
                    background:
                      "linear-gradient(270deg, var(--gallery-side-fade-solid), var(--gallery-side-fade-clear))",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => scrollRow(importantScrollRef, 1)}
                    className="chevron-pop-up pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--pill-arrow-bg)",
                      border: "1px solid var(--pill-arrow-border)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                    aria-label="Scroll important stories right"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

            </div>
          </div>
        </section>

        <section
          className="w-[90vw] md:w-[70vw] mx-auto mt-12 md:mt-16 pb-6 reveal-on-scroll gpu-animate"
          data-reveal
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] md:text-xs font-semibold tracking-[0.12em] text-emerald-600">
                UPCOMING
              </div>
              <h2 className="text-xl md:text-4xl font-semibold text-left mt-1">
                Event Schedule
              </h2>
            </div>
            <Link
              to="/events"
              className="events-cta group inline-flex items-center justify-end rounded-full pl-4 pr-3 py-1.5 text-[10px] md:text-sm font-medium whitespace-nowrap border transition-all duration-300 w-[120px] md:w-[132px]"
            >
              <span className="flex items-center justify-end w-full">
                <ArrowRight
                  size={14}
                  className="w-[14px] mr-1 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                />
                <span className="text-right">See Events</span>
              </span>
            </Link>
          </div>

          <div className="mt-5 md:mt-6 rounded-2xl overflow-hidden schedule-card">
            <div className="hidden md:grid grid-cols-[150px_0.9fr_1.8fr_200px] bg-slate-900 text-white text-xs font-semibold tracking-wide uppercase px-6 py-4">
              <div className="inline-flex items-center gap-2">
                <CalendarDays size={14} />
                Date
              </div>
              <div>Event Name</div>
              <div>Description</div>
              <div>Category</div>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {upcomingEvents.length ? upcomingEvents.map((eventItem) => {
                const categoryColor =
                  ARTICLE_CATEGORY_META[eventItem.category]?.color ||
                  "var(--category-all)";

                return (
                  <Link
                    key={eventItem.id}
                    to={`/articles/${eventItem.id}`}
                    className="schedule-row grid grid-cols-1 md:grid-cols-[150px_0.9fr_1.8fr_200px] gap-2 md:gap-0 px-4 md:px-6 py-4 md:py-5 items-start md:items-center text-sm"
                    style={{ "--row-accent": categoryColor }}
                  >
                    <div className="font-semibold text-slate-900">
                      <span className="md:hidden text-[10px] uppercase tracking-wide text-slate-400 block">
                        Date
                      </span>
                      {formatScheduleDate(eventItem._date)}
                    </div>
                    <div className="text-slate-700">
                      <span className="md:hidden text-[10px] uppercase tracking-wide text-slate-400 block">
                        Event Name
                      </span>
                      {eventItem.title}
                    </div>
                    <div className="text-slate-600 text-xs md:text-sm leading-relaxed">
                      <span className="md:hidden text-[10px] uppercase tracking-wide text-slate-400 block">
                        Description
                      </span>
                      {previewText(eventItem.description)}
                    </div>
                    <div>
                      <span className="md:hidden text-[10px] uppercase tracking-wide text-slate-400 block">
                        Category
                      </span>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold"
                        style={{
                          color: categoryColor,
                          background: `color-mix(in srgb, ${categoryColor} 12%, white)`,
                          border: `1px solid color-mix(in srgb, ${categoryColor} 40%, transparent)`,
                        }}
                      >
                        {eventItem.category}
                      </span>
                    </div>
                  </Link>
                );
              }) : (
                <div className="px-4 md:px-6 py-6 text-sm text-slate-600">
                  No upcoming events yet. Publish an article to see it here.
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 md:mt-10">
          <Footer />
        </div>
      </main>
    </>
  );
}
