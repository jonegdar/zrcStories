import { ARTICLE_CATEGORY_META } from "../features/articles/constants/categories";
import generatedArticles from "./articles.generated.json";

export const CATEGORY_META = ARTICLE_CATEGORY_META;

// Canonical (repo) articles live in `src/data/articles.generated.json`.
// In local dev, the Article Maker can update this file via the Vite dev-server endpoint.
export const ARTICLES = Array.isArray(generatedArticles) ? generatedArticles : [];
