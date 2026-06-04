import React from "react";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  Building2,
  CircleHelp,
  Link2,
  Mail,
} from "lucide-react";

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "Gallery", to: "/gallery" },
  { label: "Events", to: "/events" },
  { label: "Announcements", to: "/gallery" },
  { label: "Competition Results", to: "/gallery" },
  { label: "Policies & Memorandums", to: "/gallery" },
];

const RESOURCES = [
  "Student Handbook",
  "Academic Calendar",
  "Policies & Guidelines",
  "Privacy Notice",
  "Terms of Use",
];

export default function Footer() {
  return (
    <footer className="w-full mt-10 pb-4 md:pb-6" aria-label="Site footer">
      <div
        className="w-[95vw] mx-auto rounded-[16px] px-4 py-3 md:px-5 md:py-4"
        style={{
          background: "color-mix(in srgb, var(--category-school) 10%, white)",
          boxShadow: "0 14px 34px rgba(37, 99, 235, 0.2)",
          backdropFilter: "blur(16px) saturate(115%)",
          WebkitBackdropFilter: "blur(16px) saturate(115%)",
          color: "var(--category-school)",
          border: "1.5px solid var(--category-school)",
          fontSize: "0.725rem",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:repeat(5,max-content)] gap-y-5 md:gap-y-6 gap-x-3 md:gap-x-4 leading-relaxed items-start justify-center">
          <section className="min-w-0 w-full text-left">
            <h2 className="text-[0.64rem] md:text-[0.68rem] font-semibold mb-1.5 inline-flex items-center justify-start gap-1.5 w-full">
              <CircleHelp size={14} />
              <span>About The Platform</span>
            </h2>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              CS ALP's Project, Q3 of SY 2025-2026
            </p>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              Developed for internal school use.
            </p>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              Centralizes announcements and events.
            </p>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              Built with React + Tailwind CSS.
            </p>
            <p className="opacity-85 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
              Version v1.0.0
            </p>
          </section>

          <section className="min-w-0 w-full text-left">
            <h2 className="text-[0.64rem] md:text-[0.68rem] font-semibold mb-1.5 inline-flex items-center justify-start gap-1.5 w-full">
              <Link2 size={14} />
              <span>Quick Links</span>
            </h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 justify-items-start">
              {QUICK_LINKS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="opacity-90 hover:opacity-100 underline-offset-2 hover:underline whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="min-w-0 w-full text-left">
            <h2 className="text-[0.64rem] md:text-[0.68rem] font-semibold mb-1.5 inline-flex items-center justify-start gap-1.5 w-full">
              <BookOpenCheck size={14} />
              <span>Resources</span>
            </h2>
            <div className="grid grid-cols-1 gap-y-0.5 justify-items-start">
              {RESOURCES.map((item) => (
                <span
                  key={item}
                  className="opacity-90 whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="min-w-0 w-full text-left">
            <h2 className="text-[0.64rem] md:text-[0.68rem] font-semibold mb-1.5 inline-flex items-center justify-start gap-1.5 w-full">
              <Mail size={14} />
              <span>Contact And Support</span>
            </h2>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              Official School Email: ocd@zrc.pshs.edu.ph
            </p>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              School Office Contact: +63 65 000 0000
            </p>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              Office Hours: Mon-Fri, 8:00 AM - 5:00 PM
            </p>
            <a
              href="mailto:csclub@pshs-zrc.edu.ph?subject=Issue%20Report%20-%20School%20Event%20Tracker"
              className="inline-block mt-1 opacity-95 hover:underline underline-offset-2 whitespace-nowrap overflow-hidden text-ellipsis"
            >
              Report an Issue
            </a>
          </section>

          <section className="min-w-0 w-full text-left">
            <h2 className="text-[0.64rem] md:text-[0.68rem] font-semibold mb-1.5 inline-flex items-center justify-start gap-1.5 w-full">
              <Building2 size={14} />
              <span>School, Legal, And Credits</span>
            </h2>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              Philippine Science High School - ZRC in Dipolog City
            </p>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              Brgy. Cogon, Dipolog City, Zamboanga del Norte
            </p>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              School Year: 2025-2026
            </p>
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              Accessibility: Support for multiple platforms and browsers
            </p>
            <p className="mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
              Developed by: CS ALP 2025-2026
            </p>
            <p className="opacity-85 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
              For informational purposes only; not a replacement for official
              memorandums.
            </p>
          </section>
        </div>
      </div>
    </footer>
  );
}
