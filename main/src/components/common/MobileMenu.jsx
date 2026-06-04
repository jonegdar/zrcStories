import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, House, Images, X } from "lucide-react";

const LINKS = [
  { to: "/", label: "Home", color: "var(--theme-blue)", Icon: House },
  { to: "/gallery", label: "Gallery", color: "var(--theme-orange)", Icon: Images },
  { to: "/events", label: "Events", color: "var(--theme-violet)", Icon: CalendarDays },
];

export default function MobileMenu({ open, onClose, pathname }) {
  return (
    <div
      className={`fixed inset-0 z-[70] md:hidden transition-opacity duration-250 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 transition-opacity duration-250"
        aria-label="Close navigation menu"
      />

      <div
        className={`absolute top-[4.2rem] right-3 w-[58vw] max-w-[230px] rounded-2xl p-3 transition-all duration-250 ease-out ${open ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0"}`}
        style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          backdropFilter: "var(--glass-backdrop)",
          WebkitBackdropFilter: "var(--glass-backdrop)",
        }}
      >
        <div className="flex justify-end mb-1">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="space-y-1 list-none m-0 p-0">
          {LINKS.map(({ to, label, color, Icon }) => {
            const isActive =
              to === "/gallery"
                ? pathname.startsWith("/gallery") || pathname.startsWith("/articles")
                : pathname === to;

            return (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{
                    color: isActive ? color : "var(--glass-text)",
                    background: isActive
                      ? `color-mix(in srgb, ${color} 14%, white)`
                      : "transparent",
                  }}
                >
                  <Icon size={18} />
                  <span className="text-sm">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
