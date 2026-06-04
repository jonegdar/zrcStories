import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import ArticleCard from "../components/common/ArticleCard";
import homeBg from "../assets/images/homeBg.jpg";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useArticles } from "../features/articles/domain/useArticles";
import { filterArticlesByCategory } from "../features/articles/domain/articleSelectors";
import {
  ARTICLE_CATEGORY_FILTERS,
  ARTICLE_CATEGORY_META,
  getCategoryColor,
} from "../features/articles/constants/categories";
import { ARTICLE_CATEGORY_ICONS } from "../features/articles/constants/icons";

export default function Gallery() {
  useEffect(() => {
    document.title = "ZRC Stories: Gallery";
  }, []);

  const [activeCategory, setActiveCategory] = useState("All");
  const [pillSweepTick, setPillSweepTick] = useState({});
  const pillsScrollRef = useRef(null);
  const storiesRef = useRef(null);
  const [hasPillOverflow, setHasPillOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const allArticles = useArticles();

  const visibleCards = useMemo(() => {
    return filterArticlesByCategory(allArticles, activeCategory);
  }, [activeCategory, allArticles]);

  function handlePillClick(category) {
    setActiveCategory(category);
    setPillSweepTick((prev) => ({
      ...prev,
      [category]: (prev[category] || 0) + 1,
    }));
  }

  function scrollPills(direction) {
    if (!pillsScrollRef.current) return;
    pillsScrollRef.current.scrollBy({
      left: direction * 260,
      behavior: "smooth",
    });
  }

  function updatePillScrollState() {
    const el = pillsScrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setHasPillOverflow(maxScroll > 2);
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < maxScroll - 2);
  }

  function scrollToRef(sectionRef) {
    if (!sectionRef.current) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const offset = 80;
    const scroller = sectionRef.current.closest("main");
    if (!scroller) {
      sectionRef.current.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start",
      });
      return;
    }
    const scrollerRect = scroller.getBoundingClientRect();
    const sectionRect = sectionRef.current.getBoundingClientRect();
    const topAligned =
      scroller.scrollTop + (sectionRect.top - scrollerRect.top) - offset;
    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTo({
      top: Math.min(maxTop, Math.max(0, topAligned)),
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }

  useEffect(() => {
    updatePillScrollState();
    window.addEventListener("resize", updatePillScrollState);
    return () => window.removeEventListener("resize", updatePillScrollState);
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
        `}
      </style>

      <main className="h-screen overflow-y-auto overflow-x-hidden">
        <div className="w-full h-[52vh] relative flex items-center justify-center">
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
            className="relative z-10 text-center px-4 text-white translate-y-[4vh] reveal-on-scroll gpu-animate"
            data-reveal
          >
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-semibold">
              Welcome to ZRC Gallery!
            </h1>
            <p className="mt-3 text-[0.72rem] sm:text-sm md:text-xl opacity-95 max-w-3xl mx-auto">
              All movements of ZRC, tracked and recorded, for everyone to
              embrace.
            </p>
            <div className="mt-4 md:mt-6 flex flex-wrap gap-2 md:gap-3 justify-center">
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

        <div
          id="stories"
          ref={storiesRef}
          data-reveal
          className="relative w-[96vw] md:w-[80vw] mx-auto pb-2 overflow-hidden mt-6 md:mt-8 rounded-3xl"
          style={{
            background: "transparent",
            padding: "clamp(0.75rem, 2vw, 1.25rem)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl z-10"
            aria-hidden="true"
          >
            <span
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.18) 14%, rgba(255,255,255,0.18) 86%, rgba(255,255,255,0))",
              }}
            />
            <span
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.18) 14%, rgba(255,255,255,0.18) 86%, rgba(255,255,255,0))",
              }}
            />
            <span
              className="absolute top-0 bottom-0 left-0 w-px"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.18) 14%, rgba(255,255,255,0.18) 86%, rgba(255,255,255,0))",
              }}
            />
            <span
              className="absolute top-0 bottom-0 right-0 w-px"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.18) 14%, rgba(255,255,255,0.18) 86%, rgba(255,255,255,0))",
              }}
            />
          </div>

          <div className="mt-5 md:mt-10">
            <div className="relative">
              <div
                ref={pillsScrollRef}
                className="hide-scrollbar overflow-x-auto overflow-y-visible -mx-3 px-3"
                onScroll={updatePillScrollState}
              >
                <div className="flex items-center gap-3 w-max py-2">
                  {ARTICLE_CATEGORY_FILTERS.map((category) => {
                    const categoryColor = getCategoryColor(category);
                    const isActive = activeCategory === category;
                    const Icon = ARTICLE_CATEGORY_ICONS[category];

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handlePillClick(category)}
                        className="relative overflow-hidden px-2.5 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm whitespace-nowrap transition-transform duration-200 hover:scale-105 focus-visible:scale-105"
                        style={{
                          border: `1.5px solid ${categoryColor}`,
                          background: isActive
                            ? `color-mix(in srgb, ${categoryColor} 10%, white)`
                            : "var(--pill-glass-bg)",
                          color: categoryColor,
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                          boxShadow: "var(--pill-glass-shadow)",
                        }}
                      >
                        {pillSweepTick[category] ? (
                          <span
                            key={`${category}-${pillSweepTick[category]}`}
                            className="pill-sweep pointer-events-none absolute inset-0 rounded-full"
                            style={{
                              background:
                                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)",
                            }}
                          />
                        ) : null}
                        <span className="relative z-10 flex items-center gap-1.5 md:gap-2">
                          {category === "SHC announcements" ? (
                            <span
                              className="inline-block w-5 h-5 bg-center bg-contain bg-no-repeat"
                              style={{ backgroundImage: "var(--shc-logo)" }}
                              aria-hidden="true"
                            />
                          ) : (
                            <Icon size={13} strokeWidth={2} />
                          )}
                          {category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {hasPillOverflow && canScrollLeft && (
                <div
                  className="pointer-events-none absolute inset-y-0 -left-3 w-20 flex items-center justify-start pl-2"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--gallery-side-fade-solid), var(--gallery-side-fade-clear))",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => scrollPills(-1)}
                    aria-label="Scroll categories left"
                    className="chevron-pop-up pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--pill-arrow-bg)",
                      border: "1px solid var(--pill-arrow-border)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              )}
              {hasPillOverflow && canScrollRight && (
                <div
                  className="pointer-events-none absolute inset-y-0 -right-3 w-20 flex items-center justify-end pr-2"
                  style={{
                    background:
                      "linear-gradient(270deg, var(--gallery-side-fade-solid), var(--gallery-side-fade-clear))",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => scrollPills(1)}
                    aria-label="Scroll categories right"
                    className="chevron-pop-up pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--pill-arrow-bg)",
                      border: "1px solid var(--pill-arrow-border)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-4 md:mt-6">
            {visibleCards.length ? (
              <div className="grid gap-2 md:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleCards.map((card) => (
                  <ArticleCard
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    description={card.description}
                    author={card.author}
                    date={card.date}
                    status={card.status}
                    image={card.image}
                    to={`/articles/${card.id}`}
                    categoryLabel={card.category}
                    categoryColor={ARTICLE_CATEGORY_META[card.category].color}
                    categoryIcon={ARTICLE_CATEGORY_ICONS[card.category]}
                  />
                ))}
              </div>
            ) : (
              <div
                className="rounded-2xl p-6 text-sm opacity-75"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(15, 23, 42, 0.10)",
                }}
              >
                No articles yet. Create one in the Admin Panel to populate the gallery.
              </div>
            )}

            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-8"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0))",
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-8"
              style={{
                background:
                  "linear-gradient(270deg, rgba(255,255,255,0.08), rgba(255,255,255,0))",
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-8"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0))",
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
              style={{
                background:
                  "linear-gradient(0deg, rgba(255,255,255,0.08), rgba(255,255,255,0))",
              }}
            />
          </div>
        </div>
        <div className="mt-8 md:mt-10">
          <Footer />
        </div>
      </main>
    </>
  );
}
