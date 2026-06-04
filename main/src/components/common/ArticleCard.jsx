import React, { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import { formatPublishedDate } from "../../utils/date";

function ArticleCard({
  id,
  image,
  title,
  description,
  date,
  author,
  to,
  categoryColor,
  categoryLabel,
  categoryIcon: CategoryIcon,
  status,
}) {
  const href = to || (id ? `/articles/${id}` : "#");

  const normalizedStatus = String(status || "Done").toLowerCase();
  const statusLabel =
    normalizedStatus === "ongoing"
      ? "Ongoing"
      : normalizedStatus === "upcoming"
        ? "Upcoming"
        : "Done";
  const statusColor =
    statusLabel === "Done"
      ? "#16a34a"
      : statusLabel === "Upcoming"
        ? "#f97316"
        : "#ef4444";
  const displayDate = formatPublishedDate(date);

  return (
    <Link
      to={href}
      aria-label={title}
      className="group block h-full reveal-on-scroll gpu-animate"
      data-reveal
    >
      <article
        role="article"
        className="overflow-hidden h-[240px] sm:h-[280px] md:h-full rounded-xl md:rounded-2xl relative transform transition-all duration-300 group-hover:-translate-y-1.5 shadow-[0_6px_14px_rgba(11,18,32,0.18)] md:shadow-[0_10px_24px_rgba(11,18,32,0.18)] group-hover:shadow-[0_12px_24px_rgba(11,18,32,0.24)] md:group-hover:shadow-[0_18px_36px_rgba(11,18,32,0.24)] flex flex-col"
        style={{
          border: "none",
        }}
      >
        {CategoryIcon && categoryLabel && (
          <div
            className="absolute top-1.5 md:top-3 right-1.5 md:right-3 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full z-10 flex items-center gap-1 md:gap-1.5 text-[8px] md:text-[11px] font-medium"
            style={{
              background: categoryColor
                ? `color-mix(in srgb, ${categoryColor} 7.5%, white)`
                : "var(--card-pill-fallback-bg)",
              border: categoryColor
                ? `1.5px solid ${categoryColor}`
                : "1.5px solid var(--card-pill-fallback-border)",
              color: categoryColor || "var(--card-pill-text)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.24)",
            }}
            aria-label={`${categoryLabel} category`}
            title={categoryLabel}
          >
            {categoryLabel === "SHC announcements" ? (
              <span
                className="inline-block w-3 h-3 md:w-4.5 md:h-4.5 bg-center bg-contain bg-no-repeat"
                style={{ backgroundImage: "var(--shc-logo)" }}
                aria-hidden="true"
              />
            ) : (
              <CategoryIcon size={10} strokeWidth={2.2} />
            )}
            <span className="hidden sm:inline">{categoryLabel}</span>
          </div>
        )}

        <div className="relative overflow-hidden h-20 sm:h-28 md:h-48">
          <img
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/45" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent, var(--card-image-overlay))",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="flex items-center gap-1 text-white text-[10px] md:text-sm font-semibold opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
              View article <ArrowRight size={16} />
            </span>
          </div>
        </div>

        <div
          className="p-2 sm:p-3 md:p-4 rounded-xl md:rounded-2xl flex-1 flex flex-col"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
            color: "var(--glass-text)",
          }}
        >
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] md:text-xs mb-1.5 md:mb-2">
            <span className="flex items-center gap-1 opacity-85">
              <CalendarDays size={10} />
              {displayDate}
            </span>
            <span
              className="px-1.5 md:px-2 py-0.5 rounded-full font-semibold"
              style={{
                color: statusColor,
                background: `color-mix(in srgb, ${statusColor} 16%, white)`,
                border: `1px solid color-mix(in srgb, ${statusColor} 44%, transparent)`,
              }}
            >
              {statusLabel}
            </span>
          </div>

          <h3
            className="text-[11px] sm:text-sm md:text-lg font-semibold leading-tight transition-colors duration-300 group-hover:[color:var(--card-category-color)]"
            style={{
              "--card-category-color": categoryColor || "var(--glass-text)",
              color: "var(--glass-text)",
            }}
          >
            {title}
          </h3>
          <p className="text-[9px] sm:text-[10px] md:text-xs italic opacity-85 mt-1 mb-1.5 md:mb-3">
            {author}
          </p>

          <div className="relative mb-1.5 md:mb-3 mt-1">
            <p
              className="text-[10px] sm:text-xs md:text-sm text-[color:var(--glass-text)] overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                minHeight: "2.6rem",
              }}
            >
              {description}
            </p>
            <div
              className="pointer-events-none absolute left-0 right-0 bottom-0 h-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0), var(--glass-bg))",
              }}
            />
          </div>
        </div>
      </article>
    </Link>
  );
}

export default memo(ArticleCard);




