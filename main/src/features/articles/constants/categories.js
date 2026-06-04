export const ARTICLE_CATEGORY_FILTERS = [
  "All",
  "School Announcements",
  "SHC announcements",
  "Student Announcements",
  "Promotions",
  "Resources & Opportunities",
  "Lost & Found",
];

export const ARTICLE_CATEGORY_META = {
  "School Announcements": { color: "var(--category-school)" },
  "SHC announcements": { color: "var(--category-shc)" },
  "Student Announcements": { color: "var(--category-student)" },
  Promotions: { color: "var(--category-promotions)" },
  "Resources & Opportunities": { color: "var(--category-resources)" },
  "Lost & Found": { color: "var(--category-lost-found)" },
};

export const ARTICLE_CATEGORIES = ARTICLE_CATEGORY_FILTERS.filter(
  (category) => category !== "All",
);

export function getCategoryColor(category) {
  if (category === "All") return "var(--category-all)";
  return ARTICLE_CATEGORY_META[category]?.color || "var(--category-all)";
}
