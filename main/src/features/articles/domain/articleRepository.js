import { ARTICLES } from "../../../data/articles";
import { loadCustomArticles, loadDeletedArticleIds } from "./customArticlesStorage";

class ArticleRepository {
  static getAll() {
    const custom = loadCustomArticles();
    const merged = new Map(ARTICLES.map((article) => [article.id, article]));
    custom.forEach((article) => merged.set(article.id, article));
    const deleted = loadDeletedArticleIds();
    return Array.from(merged.values()).filter((article) => !deleted.has(article.id));
  }

  static findById(id) {
    return ArticleRepository.getAll().find((article) => article.id === id) || null;
  }

  static filterByCategories(categories) {
    if (!Array.isArray(categories) || categories.length === 0) return [];
    return ArticleRepository.getAll().filter((article) =>
      categories.includes(article.category),
    );
  }

  static pickRandomByCategories(categories, count) {
    const pool = ArticleRepository.filterByCategories(categories);
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.max(0, count));
  }

  static filterByTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return [];
    return ArticleRepository.getAll().filter((article) =>
      (article.tags || []).some((tag) => tags.includes(tag)),
    );
  }

  static pickRandomByCategoriesAndTags(categories, tags, count) {
    const pool = [
      ...ArticleRepository.filterByCategories(categories),
      ...ArticleRepository.filterByTags(tags),
    ];
    const unique = Array.from(
      new Map(pool.map((article) => [article.id, article])).values(),
    );
    const shuffled = [...unique];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.max(0, count));
  }
}

export default ArticleRepository;
