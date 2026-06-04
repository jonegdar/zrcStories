import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Link2,
  Sparkles,
  Star,
  UserRound,
  X,
} from "lucide-react";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import { useArticles } from "../features/articles/domain/useArticles";
import {
  ARTICLE_CATEGORY_FILTERS,
  getCategoryColor,
} from "../features/articles/constants/categories";
import { ARTICLE_CATEGORY_ICONS } from "../features/articles/constants/icons";
import { SPECIAL_TAGS } from "../features/articles/constants/specialTags";
import { formatPublishedDate, parsePublishedDate } from "../utils/date";
import homeBg from "../assets/images/homeBg.jpg";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PICKABLE_YEARS = [2025, 2026];

function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const matrix = [];
  let week = [];

  for (let i = 0; i < first.getDay(); i += 1) week.push(null);

  for (let day = 1; day <= last.getDate(); day += 1) {
    week.push(new Date(year, month, day));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }

  if (week.length) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }

  return matrix;
}

function toDateKey(dateValue) {
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(
    dateValue.getDate(),
  ).padStart(2, "0")}`;
}

export default function Events() {
  useEffect(() => {
    document.title = "ZRC Stories: Events";
  }, []);

  const now = useMemo(() => new Date(), []);
  const allArticles = useArticles();
  const initialViewDate = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
    [now],
  );
  const [viewDate, setViewDate] = useState(initialViewDate);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [selectedSpecialTag, setSelectedSpecialTag] = useState(null);
  const [specialMenuOpen, setSpecialMenuOpen] = useState(false);
  const specialMenuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!specialMenuRef.current) return;
      if (!specialMenuRef.current.contains(event.target)) {
        setSpecialMenuOpen(false);
      }
    }

    if (specialMenuOpen) {
      window.addEventListener("pointerdown", handlePointerDown);
      return () => window.removeEventListener("pointerdown", handlePointerDown);
    }
    return undefined;
  }, [specialMenuOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const displayMatrix = useMemo(() => {
    return getMonthMatrix(viewYear, viewMonth);
  }, [viewMonth, viewYear]);
  const weekCount = displayMatrix.length;
  const sharedPanelHeight = 180 + weekCount * 44;
  const combinedPanelHeight = sharedPanelHeight * 2 + 16;

  const monthArticles = useMemo(() => {
    return allArticles.filter((article) => {
      const dt = parsePublishedDate(article.date);
      return dt && dt.getFullYear() === viewYear && dt.getMonth() === viewMonth;
    });
  }, [allArticles, viewMonth, viewYear]);

  const categoryFilteredMonthArticles = useMemo(() => {
    if (selectedCategory === "All") return monthArticles;
    return monthArticles.filter(
      (article) => article.category === selectedCategory,
    );
  }, [monthArticles, selectedCategory]);

  const tagFilteredMonthArticles = useMemo(() => {
    if (!selectedSpecialTag) return categoryFilteredMonthArticles;
    return categoryFilteredMonthArticles.filter((article) =>
      (article.tags || []).includes(selectedSpecialTag),
    );
  }, [categoryFilteredMonthArticles, selectedSpecialTag]);

  const eventsByDate = useMemo(() => {
    const byDate = {};
    tagFilteredMonthArticles.forEach((article) => {
      const dt = parsePublishedDate(article.date);
      if (!dt) return;
      const key = toDateKey(dt);
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(article);
    });
    return byDate;
  }, [tagFilteredMonthArticles]);

  const dayCategoryPresence = useMemo(() => {
    const byDate = {};
    tagFilteredMonthArticles.forEach((article) => {
      const dt = parsePublishedDate(article.date);
      if (!dt) return;
      const key = toDateKey(dt);
      if (!byDate[key]) byDate[key] = new Set();
      byDate[key].add(article.category);
    });
    return byDate;
  }, [tagFilteredMonthArticles]);

  const categoryDotOrder = useMemo(
    () => ARTICLE_CATEGORY_FILTERS.filter((category) => category !== "All"),
    [],
  );

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;
  const eventsInSelectedDay = eventsByDate[selectedDateKey] || [];
  const selectedEvent =
    eventsInSelectedDay.find((eventItem) => eventItem.id === selectedEventId) ||
    eventsInSelectedDay[0] ||
    null;

  const [activeMediaIndex, setActiveMediaIndex] = useState(-1);

  function openMedia(index) {
    setActiveMediaIndex(index);
  }

  function closeMedia() {
    setActiveMediaIndex(-1);
  }

  function showPrevMedia() {
    setActiveMediaIndex((prev) =>
      prev <= 0 ? (selectedEvent?.media?.length || 0) - 1 : prev - 1,
    );
  }

  function showNextMedia() {
    setActiveMediaIndex((prev) =>
      prev >= (selectedEvent?.media?.length || 0) - 1 ? 0 : prev + 1,
    );
  }

  function MediaFrame({ item, className = "" }) {
    return (
      <div className={`w-full h-full bg-black/10 ${className}`}>
        {item.type === "video" ? (
          <video
            controls
            preload="metadata"
            className="w-full h-full object-cover"
          >
            <source src={item.src} type="video/mp4" />
          </video>
        ) : (
          <img
            src={item.src}
            alt={item.caption}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        )}
      </div>
    );
  }

  function MediaCollage({ media, onOpen }) {
    const preview = (media || []).slice(0, 3);
    const remaining = Math.max(0, (media || []).length - 3);

    if (!preview.length) return null;

    if (preview.length < 3) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {preview.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(index)}
              className="rounded-xl overflow-hidden relative h-40 md:h-44 cursor-pointer"
            >
              <MediaFrame item={item} />
            </button>
          ))}
        </div>
      );
    }

    return (
      <div
        className="grid grid-cols-2 grid-rows-2 gap-1.5 md:gap-2 h-[130px] sm:h-[170px] md:h-[250px]"
        aria-label="Event media collage"
      >
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="row-span-2 rounded-xl overflow-hidden relative cursor-pointer"
        >
          <MediaFrame item={preview[0]} />
        </button>

        <button
          type="button"
          onClick={() => onOpen(1)}
          className="rounded-xl overflow-hidden relative cursor-pointer"
        >
          <MediaFrame item={preview[1]} />
        </button>

        <button
          type="button"
          onClick={() => onOpen(2)}
          className="rounded-xl overflow-hidden relative cursor-pointer"
        >
          <MediaFrame item={preview[2]} />
          <div className="absolute inset-0 bg-black/45" />
          <span className="absolute inset-0 flex items-center justify-center text-white text-3xl font-semibold">
            +{remaining}
          </span>
        </button>
      </div>
    );
  }

  function MediaOverlay({ media, activeIndex, onClose, onPrev, onNext }) {
    const touchStartXRef = useRef(null);

    if (activeIndex < 0 || activeIndex >= (media || []).length) return null;

    const item = media[activeIndex];
    const countLabel = `${activeIndex + 1}/${media.length}`;

    return (
      <div
        className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Media viewer"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
          aria-label="Close media viewer"
        >
          <X size={18} />
        </button>

        <div
          className="w-full max-w-5xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className="relative max-h-[85vh] rounded-2xl overflow-hidden"
            onTouchStart={(event) => {
              touchStartXRef.current = event.touches[0].clientX;
            }}
            onTouchEnd={(event) => {
              if (touchStartXRef.current === null) return;
              const delta =
                event.changedTouches[0].clientX - touchStartXRef.current;
              if (Math.abs(delta) > 44) {
                if (delta > 0) onPrev();
                else onNext();
              }
              touchStartXRef.current = null;
            }}
          >
            <span
              className="absolute top-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full text-xs text-white z-10"
              style={{
                background: "rgba(55,65,81,0.55)",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              {countLabel}
            </span>

            <MediaFrame item={item} className="max-h-[75vh]" />
            <div
              className="px-4 py-3 text-white/95 text-sm"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.35))",
              }}
            >
              {item.caption}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onPrev}
              className="w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center"
              aria-label="Previous media"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center"
              aria-label="Next media"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const holidayKeys = useMemo(() => {
    const monthStr = String(viewMonth + 1).padStart(2, "0");
    return new Set([
      `${viewYear}-${monthStr}-01`,
      `${viewYear}-${monthStr}-21`,
    ]);
  }, [viewMonth, viewYear]);

  function goPrevMonth() {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
    setSelectedDate(null);
    setSelectedEventId(null);
  }

  function goNextMonth() {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
    setSelectedDate(null);
    setSelectedEventId(null);
  }

  function applyMonthYear(monthIndex, yearValue) {
    setViewDate(new Date(yearValue, monthIndex, 1));
    setSelectedDate(null);
    setSelectedEventId(null);
    setShowMonthPicker(false);
  }

  function getLinkMeta(url) {
    const lower = String(url || "").toLowerCase();
    if (lower.includes("facebook.com") || lower.includes("fb.com")) {
      return { label: "Facebook", Icon: Facebook };
    }
    if (lower.includes("instagram.com")) {
      return { label: "Instagram", Icon: Instagram };
    }
    return { label: "Link", Icon: Link2 };
  }

  return (
    <>
      <Navbar />
      <style>
        {`
          .events-day:hover,
          .events-day:focus-visible {
            transform: translateY(-2px);
            box-shadow:
              0 10px 14px rgba(11,18,32,0.3),
              0 2px 5px rgba(11,18,32,0.12);
          }
          .events-day.events-day-selected .events-day-bubble {
            background: transparent;
            color: inherit;
          }
          .events-day.events-day-today .events-day-bubble {
            background: color-mix(in srgb, var(--theme-blue) 14%, white);
          }
          .events-day.events-day-selected {
            box-shadow:
              0 10px 14px rgba(11,18,32,0.3),
              0 2px 5px rgba(11,18,32,0.12);
          }
          .events-days-grid {
            gap: 4px;
          }
          .event-row:hover .event-title,
          .event-row:focus-visible .event-title {
            color: var(--event-accent);
          }
          @media (min-width: 768px) {
            .events-days-grid {
              gap: 8px;
            }
          }
        `}
      </style>

      <main className="pb-2 flex flex-col items-center">
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
            <h2 className="text-2xl sm:text-3xl md:text-6xl font-semibold">
              ZRC Events
            </h2>
            <p className="mt-3 text-[0.72rem] sm:text-sm md:text-xl opacity-95 max-w-3xl mx-auto">
              The past, present, and future of ZRC
            </p>
          </div>
        </div>

        <div
          className="w-full max-w-[85vw] px-3 md:px-6 lg:px-0 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start reveal-on-scroll gpu-animate"
          data-reveal
        >
          <div className="w-full lg:col-span-6">
            <div
              className="rounded-3xl w-full overflow-hidden"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "var(--glass-backdrop)",
                WebkitBackdropFilter: "var(--glass-backdrop)",
                boxShadow: "var(--glass-shadow)",
                color: "var(--glass-text)",
                padding: "1rem",
                minHeight: `${combinedPanelHeight}px`,
                height: `${combinedPanelHeight}px`,
                display: "flex",
                flexDirection: "column",
              }}
            >
            <div className="relative flex items-center justify-start mb-4">
              <button
                onClick={goPrevMonth}
                className="px-3 py-1 rounded hover:opacity-90"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => setShowMonthPicker((prev) => !prev)}
                className="font-semibold px-2 py-1 rounded hover:bg-black/5"
                aria-label="Choose month and year"
              >
                {MONTH_NAMES[viewMonth]} {viewYear}
              </button>

              <button
                onClick={goNextMonth}
                className="px-3 py-1 rounded hover:opacity-90"
              >
                <ChevronRight size={16} />
              </button>

              {showMonthPicker && (
                <div
                  className="absolute z-20 top-full left-0 mt-2 rounded-xl p-3 w-[290px]"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--glass-shadow)",
                    backdropFilter: "var(--glass-backdrop)",
                    WebkitBackdropFilter: "var(--glass-backdrop)",
                  }}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {MONTH_NAMES.map((monthLabel, monthIndex) => (
                      <button
                        key={monthLabel}
                        type="button"
                        onClick={() => applyMonthYear(monthIndex, viewYear)}
                        className="px-2 py-1 rounded text-xs hover:bg-black/5"
                      >
                        {monthLabel.slice(0, 3)}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    {PICKABLE_YEARS.map((yearValue) => (
                      <button
                        key={yearValue}
                        type="button"
                        onClick={() => applyMonthYear(viewMonth, yearValue)}
                        className={`px-3 py-1 rounded text-xs border ${
                          yearValue === viewYear ? "bg-black/10" : ""
                        }`}
                        style={{ borderColor: "rgba(0,0,0,0.15)" }}
                      >
                        {yearValue}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="grid grid-cols-7 gap-2 text-center mb-2"
              style={{ height: "32px" }}
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (dayLabel) => (
                  <div key={dayLabel} className="font-medium text-sm">
                    {dayLabel}
                  </div>
                ),
              )}
            </div>

            <div
              className="events-days-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                minHeight: `${weekCount * 60}px`,
              }}
            >
              {displayMatrix.map((week, weekIndex) =>
                week.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${weekIndex}-${dayIndex}`}
                        className="mx-auto w-full min-w-0 h-[46px] md:w-[62px] md:h-[62px] rounded-lg"
                      />
                    );
                  }

                  const key = toDateKey(day);
                  const categoriesOnDay = dayCategoryPresence[key] || new Set();
                  const hasEvents = categoriesOnDay.size > 0;
                  const isHoliday = holidayKeys.has(key);
                  const isToday = day.toDateString() === now.toDateString();
                  const isSelected =
                    Boolean(selectedDate) &&
                    day.toDateString() === selectedDate.toDateString();

                  return (
                    <button
                      key={`day-${weekIndex}-${dayIndex}`}
                      onClick={() => {
                        setSelectedDate(day);
                        setSelectedEventId(null);
                      }}
                      className={`events-day relative mx-auto w-full min-w-0 h-[44px] md:w-[58px] md:h-[58px] rounded-lg transition-all duration-300 flex flex-col items-center justify-center ${
                        isSelected ? "events-day-selected" : ""
                      } ${isToday ? "events-day-today" : ""}`}
                      style={{
                        background: "transparent",
                        color: "inherit",
                        border: "1px solid transparent",
                      }}
                    >
                      {isHoliday && (
                        <Star
                          size={12}
                          strokeWidth={2}
                          className="absolute top-1.5 right-1.5"
                          style={{ color: "#dc2626", fill: "#dc2626" }}
                          aria-label="Holiday"
                        />
                      )}
                      <div className="events-day-bubble mx-auto w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-colors duration-200 text-[10px] sm:text-xs">
                        {day.getDate()}
                      </div>
                      {hasEvents && (
                        <div className="mt-0.5 md:mt-1 h-[8px] md:h-[10px] grid grid-cols-3 gap-[2px] place-items-center">
                          {Array.from({ length: 6 }, (_, dotIndex) => {
                            const dotCategory =
                              categoryDotOrder[dotIndex] || null;
                            const dotColor = dotCategory
                              ? getCategoryColor(dotCategory)
                              : "rgba(148, 163, 184, 0.45)";
                            const dotIsActive =
                              Boolean(dotCategory) &&
                              categoriesOnDay.has(dotCategory) &&
                              (selectedCategory === "All" ||
                                selectedCategory === dotCategory);

                            return (
                              <span
                                key={`${key}-dot-${dotIndex + 1}`}
                                className="block w-[4px] h-[4px] rounded-full"
                                style={{
                                  background: dotIsActive
                                    ? dotColor
                                    : "rgba(148, 163, 184, 0.45)",
                                  boxShadow: dotIsActive
                                    ? `0 0 0.5px ${dotColor}`
                                    : "none",
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </button>
                  );
                }),
              )}
            </div>

            <div className="mt-4 w-full flex flex-wrap gap-1.5 md:gap-2">
              {ARTICLE_CATEGORY_FILTERS.map((category) => {
                const categoryColor = getCategoryColor(category);
                const Icon = ARTICLE_CATEGORY_ICONS[category];
                const isActive = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedEventId(null);
                    }}
                    className="relative overflow-hidden px-2 py-1 rounded-full text-[9px] md:text-[10px] whitespace-nowrap transition-transform duration-200 hover:scale-105 focus-visible:scale-105"
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
                    <span className="relative z-10 flex items-center gap-1.5 md:gap-2">
                      {category === "SHC announcements" ? (
                        <span
                          className="inline-block w-4 h-4 bg-center bg-contain bg-no-repeat"
                          style={{ backgroundImage: "var(--shc-logo)" }}
                          aria-hidden="true"
                        />
                      ) : (
                        <Icon size={11} strokeWidth={2} />
                      )}
                      {category}
                    </span>
                  </button>
                );
              })}

              <div className="relative" ref={specialMenuRef}>
                <button
                  type="button"
                  onClick={() => setSpecialMenuOpen((prev) => !prev)}
                  className="relative overflow-hidden px-2 py-1 rounded-full text-[9px] md:text-[10px] whitespace-nowrap transition-transform duration-200 hover:scale-105 focus-visible:scale-105"
                  style={{
                    border: "1.5px solid var(--theme-violet)",
                    background: selectedSpecialTag
                      ? "color-mix(in srgb, var(--theme-violet) 12%, white)"
                      : "var(--pill-glass-bg)",
                    color: "var(--theme-violet)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    boxShadow: "var(--pill-glass-shadow)",
                  }}
                  aria-haspopup="menu"
                  aria-expanded={specialMenuOpen}
                >
                  <span className="relative z-10 flex items-center gap-1.5 md:gap-2">
                    <Sparkles size={11} strokeWidth={2} />
                    {selectedSpecialTag ? `Special: ${selectedSpecialTag}` : "Special Tags"}
                  </span>
                </button>

                {specialMenuOpen && (
                  <div
                    className="absolute z-20 mt-2 left-0 min-w-[220px] rounded-xl p-2"
                    role="menu"
                    style={{
                      background: "var(--glass-bg)",
                      border: "1px solid var(--glass-border)",
                      boxShadow: "var(--glass-shadow)",
                      backdropFilter: "var(--glass-backdrop)",
                      WebkitBackdropFilter: "var(--glass-backdrop)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpecialTag(null);
                        setSelectedEventId(null);
                        setSpecialMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-black/5"
                    >
                      All Special Tags
                    </button>
                    {SPECIAL_TAGS.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setSelectedSpecialTag(tag.label);
                          setSelectedEventId(null);
                          setSpecialMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-black/5 ${
                          selectedSpecialTag === tag.label ? "bg-black/5" : ""
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-sm opacity-90">
              {selectedDate
                ? `Events for ${formatPublishedDate(selectedDate)}`
                : "Events for selected day"}
            </div>

            <div
              className="mt-3 flex-1 space-y-3 overflow-y-auto px-2 py-2 -mx-2"
              style={{
                background: "transparent",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0, black 18px, black calc(100% - 22px), transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0, black 18px, black calc(100% - 22px), transparent 100%)",
              }}
            >
              {eventsInSelectedDay.length ? (
                eventsInSelectedDay.map((eventItem) => {
                  const itemColor = getCategoryColor(eventItem.category);
                  const isSelected = selectedEvent?.id === eventItem.id;
                  const isHovered = hoveredEventId === eventItem.id;
                  const rowBg = isSelected
                    ? "color-mix(in srgb, var(--glass-bg) 95%, white)"
                    : "var(--glass-bg)";

                  const ListCategoryIcon =
                    ARTICLE_CATEGORY_ICONS[eventItem.category];
                  return (
                    <button
                      key={eventItem.id}
                      type="button"
                      onClick={() => setSelectedEventId(eventItem.id)}
                      onMouseEnter={() => setHoveredEventId(eventItem.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                      className="event-row group relative w-full text-left p-3 rounded-2xl transition-all duration-200 flex gap-4 items-center"
                      style={{
                        background: rowBg,
                        border: "1px solid var(--glass-border)",
                        boxShadow: isSelected
                          ? "0 12px 16px rgba(11,18,32,0.30), 0 2px 5px rgba(11,18,32,0.12)"
                          : isHovered
                            ? "0 10px 14px rgba(11,18,32,0.28), 0 2px 5px rgba(11,18,32,0.11)"
                            : "0 8px 12px rgba(11,18,32,0.24), 0 1px 4px rgba(11,18,32,0.10)",
                        transform:
                          isSelected || isHovered
                            ? "translateY(-2px)"
                            : undefined,
                        "--event-row-bg": rowBg,
                        "--event-accent": itemColor,
                      }}
                    >
                      <span
                        className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold z-10"
                        style={{
                          border: `1.5px solid ${itemColor}`,
                          color: itemColor,
                          background: `color-mix(in srgb, ${itemColor} 8%, white)`,
                          backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                        }}
                      >
                        {eventItem.category === "SHC announcements" ? (
                          <span
                            className="inline-block w-3 h-3 bg-center bg-contain bg-no-repeat"
                            style={{ backgroundImage: "var(--shc-logo)" }}
                            aria-hidden="true"
                          />
                        ) : ListCategoryIcon ? (
                          <ListCategoryIcon size={10} strokeWidth={2} />
                        ) : null}
                        <span className="hidden sm:inline">
                          {eventItem.category}
                        </span>
                      </span>
                      <div
                        className="flex-shrink-0 w-16 h-16 rounded-[18px] overflow-hidden"
                        style={{
                          boxShadow:
                            "0 8px 10px rgba(11,18,32,0.24), 0 1px 3px rgba(11,18,32,0.10)",
                        }}
                      >
                        <img
                          src={eventItem.image}
                          alt={eventItem.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <div
                            className="event-title font-semibold text-sm overflow-hidden transition-colors duration-200"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {eventItem.title}
                          </div>
                          <span
                            className="pointer-events-none absolute inset-y-0 right-0 w-10"
                            style={{
                              background:
                                "linear-gradient(90deg, rgba(255,255,255,0), var(--event-row-bg))",
                            }}
                          />
                        </div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          {eventItem.author}
                        </div>
                        <div className="relative mt-1">
                          <p
                            className="text-xs opacity-85 leading-snug overflow-hidden"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {eventItem.description}
                          </p>
                          <span
                            className="pointer-events-none absolute left-0 right-0 bottom-0 h-4"
                            style={{
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0), var(--glass-bg))",
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-sm opacity-80">
                  No events for this day.
                </div>
              )}
            </div>
            </div>
          </div>

          <section
            className="w-full lg:col-span-6 rounded-3xl p-4 overflow-y-auto"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              backdropFilter: "var(--glass-backdrop)",
              WebkitBackdropFilter: "var(--glass-backdrop)",
              boxShadow: "var(--glass-shadow)",
              color: "var(--glass-text)",
              height: `${combinedPanelHeight}px`,
              maxHeight: `${combinedPanelHeight}px`,
            }}
          >
            <h3 className="text-lg font-semibold mb-2">Event Details</h3>
            {selectedEvent ? (
              <div>
                <button
                  type="button"
                  onClick={() => openMedia(0)}
                  className="w-full overflow-hidden rounded-2xl mb-5 block cursor-pointer relative"
                  aria-label="Open cover media"
                >
                  <img
                    src={selectedEvent.image}
                    alt={selectedEvent.title}
                    className="w-full h-[24vh] md:h-[30vh] object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 hover:bg-black/15" />
                </button>

                <article
                  className="relative rounded-2xl p-3 sm:p-4 md:p-6"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--glass-shadow)",
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-xs sm:text-sm md:text-lg font-semibold leading-tight">
                      {selectedEvent.title}
                    </h4>
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[8px] sm:text-[10px] md:text-xs font-semibold"
                      style={{
                        border: `1.5px solid ${getCategoryColor(selectedEvent.category)}`,
                        color: getCategoryColor(selectedEvent.category),
                        background: `color-mix(in srgb, ${getCategoryColor(selectedEvent.category)} 10%, white)`,
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                      }}
                    >
                      {selectedEvent.category === "SHC announcements" ? (
                        <span
                          className="inline-block w-4 h-4 bg-center bg-contain bg-no-repeat"
                          style={{ backgroundImage: "var(--shc-logo)" }}
                          aria-hidden="true"
                        />
                      ) : (
                        (() => {
                          const Icon =
                            ARTICLE_CATEGORY_ICONS[selectedEvent.category];
                          return Icon ? (
                            <Icon size={14} strokeWidth={2.2} />
                          ) : null;
                        })()
                      )}
                      {selectedEvent.category}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-[10px] md:text-xs opacity-85">
                    <div className="flex items-center gap-2">
                      <UserRound size={15} />
                      {selectedEvent.author}
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={15} />
                      {formatPublishedDate(selectedEvent.date)}
                    </div>
                  </div>

                  <p className="mt-4 text-xs md:text-sm leading-5 md:leading-6 text-justify">
                    {selectedEvent.description}
                  </p>

                  {(selectedEvent.media?.length ||
                    selectedEvent.links?.length) && (
                    <div className="mt-6 space-y-5">
                      {selectedEvent.media?.length ? (
                        <div>
                          <h4 className="text-sm md:text-base font-semibold mb-3">
                            Media
                          </h4>
                          <MediaCollage
                            media={selectedEvent.media}
                            onOpen={openMedia}
                          />
                        </div>
                      ) : null}

                      {selectedEvent.links?.length ? (
                        <div>
                          <h4 className="text-sm md:text-base font-semibold mb-3">
                            Links
                          </h4>
                          <div className="flex flex-wrap items-center gap-3">
                            {selectedEvent.links.map((link, index) => {
                              const { label, Icon } = getLinkMeta(link);
                              return (
                                <a
                                  key={`${selectedEvent.id}-link-${index + 1}`}
                                  href={link}
                                  className="w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                                  style={{
                                    borderColor: "rgba(124, 58, 237, 0.35)",
                                    color: "var(--theme-violet)",
                                    background:
                                      "color-mix(in srgb, var(--theme-violet) 10%, white)",
                                    boxShadow:
                                      "0 10px 20px rgba(11,18,32,0.15)",
                                  }}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={label}
                                  title={label}
                                >
                                  <Icon size={16} strokeWidth={2} />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-5 space-y-2">
                    {(selectedEvent.paragraphs || []).map((paragraph, idx) => (
                      <p
                        key={`${selectedEvent.id}-detail-${idx + 1}`}
                        className="text-xs md:text-sm leading-5 md:leading-6 text-justify indent-4 md:indent-6 opacity-90"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              </div>
            ) : (
              <div className="text-sm opacity-80">
                Select an event from the list to view exact details.
              </div>
            )}
          </section>
        </div>

        {selectedEvent?.media && (
          <MediaOverlay
            media={selectedEvent.media}
            activeIndex={activeMediaIndex}
            onClose={closeMedia}
            onPrev={showPrevMedia}
            onNext={showNextMedia}
          />
        )}

        <div className="w-full mt-8 md:mt-10">
          <Footer />
        </div>
      </main>
    </>
  );
}
