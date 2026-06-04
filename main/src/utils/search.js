function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function countOccurrences(haystack, term) {
  if (!haystack || !term) return 0;
  let index = 0;
  let count = 0;
  while ((index = haystack.indexOf(term, index)) !== -1) {
    count += 1;
    index += term.length;
  }
  return count;
}

function scoreField(text, term, weight) {
  const count = countOccurrences(String(text || "").toLowerCase(), term);
  return count * weight;
}

const ARTICLE_SEARCH_CACHE = new WeakMap();

function getCachedSearchFields(article) {
  if (!article || typeof article !== "object") {
    return { title: "", details: "", description: "", body: "" };
  }

  const cached = ARTICLE_SEARCH_CACHE.get(article);
  if (cached) return cached;

  const fields = {
    title: String(article.title || "").toLowerCase(),
    details: [
      article.author,
      article.category,
      article.status,
      article.date,
    ]
      .join(" ")
      .toLowerCase(),
    description: String(article.description || "").toLowerCase(),
    body: [
      ...(Array.isArray(article.paragraphs) ? article.paragraphs : []),
      ...((Array.isArray(article.media) ? article.media : []).map(
        (mediaItem) => mediaItem.caption || "",
      )),
    ]
      .join(" ")
      .toLowerCase(),
  };

  ARTICLE_SEARCH_CACHE.set(article, fields);
  return fields;
}

function scoreArticle(article, terms) {
  const { title, details, description, body } = getCachedSearchFields(article);

  let score = 0;

  for (const term of terms) {
    const titleScore = scoreField(title, term, 50);
    const detailScore = scoreField(details, term, 26);
    const descriptionScore = scoreField(description, term, 10);
    const bodyScore = scoreField(body, term, 6);

    const termScore = titleScore + detailScore + descriptionScore + bodyScore;
    if (termScore <= 0) return -1;

    score += termScore;

    if (titleScore > 0) score += 10;
    else if (detailScore > 0) score += 6;
    else if (descriptionScore > 0) score += 2;
  }

  return score;
}

export function searchArticles(articles, query) {
  const terms = tokenize(query);
  if (!terms.length) return [];

  return (articles || [])
    .map((article) => ({
      article,
      relevance: scoreArticle(article, terms),
    }))
    .filter((entry) => entry.relevance >= 0)
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return String(a.article.title || "").localeCompare(String(b.article.title || ""));
    })
    .map((entry) => entry.article);
}
