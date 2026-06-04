import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import ArticleCard from "../components/common/ArticleCard";
import { useArticles } from "../features/articles/domain/useArticles";
import { filterArticlesByCategory } from "../features/articles/domain/articleSelectors";
import {
  ARTICLE_CATEGORY_FILTERS,
  ARTICLE_CATEGORY_META,
  getCategoryColor,
} from "../features/articles/constants/categories";
import { ARTICLE_CATEGORY_ICONS } from "../features/articles/constants/icons";
import { searchArticles } from "../utils/search";

export default function SearchResults() {
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");
  const [pillSweepTick, setPillSweepTick] = useState({});
  const allArticles = useArticles();

  const query = useMemo(
    () => new URLSearchParams(location.search).get("q") || "",
    [location.search],
  );

  useEffect(() => {
    document.title = query
      ? `ZRC Stories: Search "${query}"`
      : "ZRC Stories: Search";
  }, [query]);

  const matchedArticles = useMemo(
    () => searchArticles(allArticles, query),
    [allArticles, query],
  );

  const visibleCards = useMemo(() => {
    return filterArticlesByCategory(matchedArticles, activeCategory);
  }, [activeCategory, matchedArticles]);

  function handlePillClick(category) {
    setActiveCategory(category);
    setPillSweepTick((prev) => ({
      ...prev,
      [category]: (prev[category] || 0) + 1,
    }));
  }

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
      <main className="min-h-screen overflow-y-auto overflow-x-hidden pt-24 md:pt-28 pb-2">
        <section
          className="w-[96vw] md:w-[80vw] mx-auto rounded-3xl"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "clamp(0.75rem, 2vw, 1.25rem)",
          }}
        >
          <h1 className="text-xl md:text-3xl font-semibold">
            Search Results
          </h1>
          <p className="mt-2 text-sm md:text-base opacity-85">
            {query
              ? `Showing results for "${query}"`
              : "Type in the search bar to find articles."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {ARTICLE_CATEGORY_FILTERS.map((category) => {
              const categoryColor = getCategoryColor(category);
              const Icon = ARTICLE_CATEGORY_ICONS[category];
              const isActive = activeCategory === category;

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

          <div className="mt-5">
            {query && visibleCards.length ? (
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
              <div className="text-sm opacity-75 py-6">
                {query
                  ? "No matching articles for this query."
                  : "No query yet."}
              </div>
            )}
          </div>
        </section>
        <div className="mt-8 md:mt-10">
          <Footer />
        </div>
      </main>
    </>
  );
}

