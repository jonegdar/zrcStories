export function filterArticlesByCategory(articles, category) {
  if (!Array.isArray(articles)) return [];
  if (!category || category === "All") return articles;
  return articles.filter((article) => article.category === category);
}

export function getReadMoreArticles(articles, currentId, count = 2) {
  const others = (articles || []).filter((article) => article.id !== currentId);
  if (others.length <= count) return others;

  const pivot =
    String(currentId || "")
      .split("")
      .reduce((total, ch) => total + ch.charCodeAt(0), 0) % others.length;

  return Array.from({ length: count }, (_, index) => {
    return others[(pivot + index) % others.length];
  });
}
