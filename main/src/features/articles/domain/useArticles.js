import { useSyncExternalStore } from "react";
import ArticleRepository from "./articleRepository";

let cachedArticles = [];
if (typeof window !== "undefined") {
  cachedArticles = ArticleRepository.getAll();
}

function subscribe(callback) {
  if (typeof window === "undefined") return () => {};

  const handler = () => {
    // Ensure getSnapshot returns a stable reference unless the store changed.
    cachedArticles = ArticleRepository.getAll();
    callback();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("zrcstories_articles_changed", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("zrcstories_articles_changed", handler);
  };
}

function getSnapshot() {
  return cachedArticles;
}

export function useArticles() {
  return useSyncExternalStore(subscribe, getSnapshot, () => []);
}
