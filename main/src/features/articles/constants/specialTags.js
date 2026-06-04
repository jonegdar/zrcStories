export const SPECIAL_TAGS = [
  {
    id: "womens-month",
    label: "Women's Month",
    activeMonths: [2],
  },
  {
    id: "intrams",
    label: "Intrams",
    activeMonths: [0],
  },
  {
    id: "science-month",
    label: "Science Month",
    activeMonths: [8],
  },
  {
    id: "national-science-club-month",
    label: "National Science Club Month",
    activeMonths: [8],
  },
];

export function getActiveSpecialTags(dateValue = new Date()) {
  const month = dateValue.getMonth();
  return SPECIAL_TAGS.filter((tag) => tag.activeMonths.includes(month)).map(
    (tag) => tag.label,
  );
}

