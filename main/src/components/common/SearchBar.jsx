import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useArticles } from "../../features/articles/domain/useArticles";
import { searchArticles } from "../../utils/search";

export default function SearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const articles = useArticles();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const currentQuery = new URLSearchParams(location.search).get("q") || "";
    setQuery(currentQuery);
  }, [location.search]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  const results = useMemo(() => {
    const normalizedQuery = deferredQuery.trim();
    if (normalizedQuery.length < 2) return [];
    return searchArticles(articles, normalizedQuery).slice(0, 10);
  }, [articles, deferredQuery]);

  function handleSubmit(event) {
    event.preventDefault();
    const next = query.trim();
    if (!next) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(next)}`);
  }

  return (
    <div ref={rootRef} className="relative">
      <form onSubmit={handleSubmit}>
        <label className="search-desktop-shell inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm min-w-[260px] justify-start transition-transform duration-200 hover:-translate-y-0.5 focus-within:-translate-y-0.5">
          <Search size={15} className="search-icon-roulette" />
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Find..."
            className="w-full bg-transparent outline-none placeholder:opacity-70"
            style={{ color: "var(--glass-text)" }}
          />
        </label>
      </form>

      {(open && query.trim().length >= 2) ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] w-[330px] max-h-[380px] overflow-y-auto rounded-2xl p-2 z-[90]"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
            backdropFilter: "var(--glass-backdrop)",
            WebkitBackdropFilter: "var(--glass-backdrop)",
          }}
        >
          {results.length ? (
            <ul className="list-none m-0 p-0 space-y-1">
              {results.map((result) => (
                <li key={result.id}>
                  <Link
                    to={`/articles/${result.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/45"
                  >
                    <img
                      src={result.image}
                      alt={result.title}
                      className="w-9 h-9 rounded-md object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="text-sm leading-tight">{result.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-2 py-2 text-sm opacity-75">No results.</div>
          )}
        </div>
      ) : null}

      <style>
        {`
          @keyframes searchIconRoulette {
            0% {
              transform: translateY(0);
              opacity: 1;
            }
            42% {
              transform: translateY(-10px);
              opacity: 0;
            }
            43% {
              transform: translateY(10px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          .search-desktop-shell:hover .search-icon-roulette,
          .search-desktop-shell:focus-within .search-icon-roulette {
            animation: searchIconRoulette 340ms ease;
          }
          .search-desktop-shell {
            background: rgba(255,255,255,0.78);
            border: 1.5px solid rgba(255,255,255,0.92);
            box-shadow: 0 10px 24px rgba(11,18,32,0.2);
            color: var(--glass-text);
          }
          .search-desktop-shell:hover,
          .search-desktop-shell:focus-within {
            background: rgba(255,255,255,0.86);
            box-shadow: 0 12px 28px rgba(11,18,32,0.24);
          }
        `}
      </style>
    </div>
  );
}

