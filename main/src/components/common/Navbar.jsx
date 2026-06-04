import React, { useEffect, useRef, useState } from "react";
import pshsLogo from "../../assets/icons/pshs.png";
import {
  ArrowRight,
  House,
  Images,
  CalendarDays,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MobileMenu from "./MobileMenu";
import SearchBar from "./SearchBar";
import { useAdminAuth } from "../../features/admin/auth/useAdminAuth";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAdminAuth();
  const isHome = location.pathname === "/";
  const isGallery =
    location.pathname === "/gallery" || location.pathname.startsWith("/articles");
  const isEvents = location.pathname === "/events";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const scrolledRef = useRef(false);

  useEffect(() => {
    let frameId = null;

    function onScroll(e) {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        const target = e?.target;
        const y =
          target && typeof target.scrollTop === "number"
            ? target.scrollTop
            : window.scrollY;
        const nextScrolled = y > 8;
        if (scrolledRef.current !== nextScrolled) {
          scrolledRef.current = nextScrolled;
          setScrolled(nextScrolled);
        }
        frameId = null;
      });
    }
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  function toggleMobileSearch() {
    setMobileSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setMenuOpen(false);
      }
      return next;
    });
  }

  function handleMobileSearchSubmit(event) {
    event.preventDefault();
    const next = mobileSearchQuery.trim();
    if (next) {
      navigate(`/search?q=${encodeURIComponent(next)}`);
    } else {
      navigate("/search");
    }
  }

  return (
    <>
      <style>
        {`
          @keyframes mobileSearchRoulette {
            0% {
              transform: translateY(0);
              opacity: 1;
            }
            42% {
              transform: translateY(-10px);
              opacity: 0;
            }
            43% {
              transform: translateY(10px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          .mobile-search-trigger:hover .search-icon-roulette {
            animation: mobileSearchRoulette 340ms ease;
          }
          .mobile-search-trigger:focus-visible .search-icon-roulette,
          .mobile-search-trigger:active .search-icon-roulette {
            animation: mobileSearchRoulette 340ms ease;
          }
          .account-trigger:hover .search-icon-roulette,
          .account-trigger:focus-visible .search-icon-roulette,
          .account-trigger:active .search-icon-roulette {
            animation: mobileSearchRoulette 340ms ease;
          }
        `}
      </style>
      <nav
        className="fixed left-1/2 -translate-x-1/2 top-3 md:top-[2.5vh] w-[95vw] h-14 md:h-[8.75vh] z-50 flex items-center justify-center pointer-events-auto"
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          className={`w-full h-full flex justify-between items-center px-3 sm:px-4 md:px-5 rounded-[12px] bg-white/90 backdrop-blur-lg transform-gpu transition-shadow duration-300 ${scrolled ? "shadow-lg" : "shadow-md"}`}
          style={{
            border: "1px solid rgba(255,255,255,0.98)",
            WebkitBackdropFilter: "blur(16px)",
            color: "var(--glass-text, #0b1220)",
          }}
        >
          <div className="flex items-center gap-2 md:gap-3 text-left">
            <img
              src={pshsLogo}
              alt="PSHS logo"
              className="w-auto object-contain h-6 md:h-8"
            />

            <div className="flex flex-col leading-tight">
              <div
                className="text-[0.48rem] md:text-[0.72rem] opacity-90"
                style={{ fontFamily: "var(--font-main-extrabold)" }}
              >
                Department of Science and Technology
              </div>
              <div
                className="text-[0.64rem] md:text-[0.95rem]"
                style={{ fontFamily: "var(--font-main-semibold)" }}
              >
                PHILIPPINE SCIENCE HIGH SCHOOL
              </div>
              <div
                className="text-[0.48rem] md:text-[0.72rem] opacity-90"
                style={{ fontFamily: "var(--font-main-regular)" }}
              >
                <span className="md:hidden">ZRC IN DIPOLOG CITY</span>
                <span className="hidden md:inline">
                  ZAMBOANGA PENINSULA REGION CAMPUS IN DIPOLOG CITY
                </span>
              </div>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-1">
            <button
              type="button"
              aria-label="Find articles"
              className="mobile-search-trigger w-8 h-8 rounded-full flex items-center justify-center border overflow-hidden"
              onClick={toggleMobileSearch}
              style={{
                background: "rgba(255,255,255,0.75)",
                borderColor: "rgba(255,255,255,0.92)",
                boxShadow: "0 8px 18px rgba(11,18,32,0.18)",
              }}
            >
              <Search size={17} className="search-icon-roulette block" />
            </button>
            <Link
              to={isAuthenticated ? "/admin" : "/admin/login?next=%2Fadmin%2Farticles%2Fnew"}
              aria-label="Admin login"
              className="account-trigger w-8 h-8 rounded-full flex items-center justify-center border overflow-hidden"
              style={{
                background: isAuthenticated ? "var(--theme-orange)" : "rgba(255,255,255,0.75)",
                borderColor: isAuthenticated ? "transparent" : "rgba(255,255,255,0.92)",
                boxShadow: isAuthenticated
                  ? "0 10px 22px rgba(234, 88, 12, 0.28)"
                  : "0 8px 18px rgba(11,18,32,0.18)",
                color: isAuthenticated ? "#0b1220" : "var(--glass-text)",
              }}
            >
              <UserRound size={17} className="search-icon-roulette block" />
            </Link>
            <button
              type="button"
              className="w-9 h-9 rounded-full flex items-center justify-center relative"
              aria-label="Open navigation menu"
              onClick={() => {
                setMobileSearchOpen(false);
                setMenuOpen((prev) => !prev);
              }}
            >
              <Menu
                size={20}
                className={`absolute transition-all duration-250 ${menuOpen ? "opacity-0 rotate-90 scale-90" : "opacity-100 rotate-0 scale-100"}`}
              />
              <X
                size={20}
                className={`absolute transition-all duration-250 ${menuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-90"}`}
              />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ul className="flex gap-4 list-none m-0 p-0 items-center">
              <li>
                <Link
                  to="/"
                  aria-label="Home"
                  className="nav-link theme-blue group flex items-center gap-2 text-sm px-2 py-1 rounded transition"
                  style={{ color: isHome ? "var(--theme-blue)" : undefined }}
                >
                  <span className="relative w-5 h-5 inline-flex items-center justify-center overflow-hidden">
                    <House
                      size={20}
                      strokeWidth={1.75}
                      className="text-current absolute transition-all duration-300 group-hover:opacity-0 group-hover:translate-x-1"
                    />
                    <ArrowRight
                      size={20}
                      strokeWidth={1.75}
                      className="text-current absolute opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                    />
                  </span>
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/gallery"
                  aria-label="Gallery"
                  className="nav-link theme-orange group flex items-center gap-2 text-sm px-2 py-1 rounded transition"
                  style={{ color: isGallery ? "var(--theme-orange)" : undefined }}
                >
                  <span className="relative w-5 h-5 inline-flex items-center justify-center overflow-hidden">
                    <Images
                      size={20}
                      strokeWidth={1.75}
                      className="text-current absolute transition-all duration-300 group-hover:opacity-0 group-hover:translate-x-1"
                    />
                    <ArrowRight
                      size={20}
                      strokeWidth={1.75}
                      className="text-current absolute opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                    />
                  </span>
                  <span>Gallery</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/events"
                  aria-label="Events"
                  className="nav-link theme-violet group flex items-center gap-2 text-sm px-2 py-1 rounded transition"
                  style={{ color: isEvents ? "var(--theme-violet)" : undefined }}
                >
                  <span className="relative w-5 h-5 inline-flex items-center justify-center overflow-hidden">
                    <CalendarDays
                      size={20}
                      strokeWidth={1.75}
                      className="text-current absolute transition-all duration-300 group-hover:opacity-0 group-hover:translate-x-1"
                    />
                    <ArrowRight
                      size={20}
                      strokeWidth={1.75}
                      className="text-current absolute opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                    />
                  </span>
                  <span>Events</span>
                </Link>
              </li>
            </ul>
            <SearchBar />
            <Link
              to={isAuthenticated ? "/admin" : "/admin/login?next=%2Fadmin%2Farticles%2Fnew"}
              aria-label="Admin login"
              className="account-trigger w-10 h-10 rounded-full flex items-center justify-center border transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                background: isAuthenticated ? "var(--theme-orange)" : "rgba(255,255,255,0.78)",
                borderColor: isAuthenticated ? "transparent" : "rgba(255,255,255,0.92)",
                boxShadow: isAuthenticated
                  ? "0 12px 26px rgba(234, 88, 12, 0.30)"
                  : "0 10px 24px rgba(11,18,32,0.2)",
                color: isAuthenticated ? "#0b1220" : "var(--glass-text)",
              }}
            >
              <UserRound size={18} strokeWidth={1.75} className="search-icon-roulette" />
            </Link>
          </div>
        </div>
      </nav>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        pathname={location.pathname}
      />

      <div
        className={`fixed inset-0 z-[68] md:hidden transition-opacity duration-250 ${mobileSearchOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <button
          type="button"
          onClick={() => setMobileSearchOpen(false)}
          className="absolute inset-0 bg-black/30"
          aria-label="Close mobile search"
        />

        <div
          className={`absolute top-[4.2rem] right-3 w-[70vw] max-w-[280px] rounded-2xl p-3 transition-all duration-250 ease-out ${mobileSearchOpen ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0"}`}
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
            backdropFilter: "var(--glass-backdrop)",
            WebkitBackdropFilter: "var(--glass-backdrop)",
          }}
        >
          <form onSubmit={handleMobileSearchSubmit}>
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-transform duration-200 hover:-translate-y-0.5 focus-within:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.78)",
                border: "1.5px solid rgba(255,255,255,0.92)",
                boxShadow: "0 10px 24px rgba(11,18,32,0.2)",
              }}
            >
              <input
                type="text"
                value={mobileSearchQuery}
                onChange={(event) => {
                  setMobileSearchQuery(event.target.value);
                }}
                placeholder="Find..."
                className="w-full bg-transparent outline-none text-sm placeholder:opacity-70"
                style={{ color: "var(--glass-text)" }}
              />
              <button
                type="submit"
                aria-label="Search articles"
                className="w-7 h-7 rounded-full flex items-center justify-center"
              >
                <Search size={15} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}


