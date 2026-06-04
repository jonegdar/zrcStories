import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function getScrollableParent(node) {
  let current = node;
  while (current && current !== document.body) {
    const styles = window.getComputedStyle(current);
    const overflowY = styles.overflowY;
    const canScroll =
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight;
    if (canScroll) return current;
    current = current.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

export default function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const offset = 80;

    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        const scroller = getScrollableParent(el);
        const scrollerRect = scroller.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const top = scroller.scrollTop + (elRect.top - scrollerRect.top) - offset;
        scroller.scrollTo({
          top: Math.max(0, top),
          behavior: prefersReduced ? "auto" : "smooth",
        });
      }
    }
  }, [location]);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const observerByRoot = new Map();
    const observedNodes = new WeakSet();

    function getResolvedRoot(node) {
      const root = getScrollableParent(node);
      if (
        !root ||
        root === document.body ||
        root === document.documentElement ||
        root === document.scrollingElement
      ) {
        return null;
      }
      return root;
    }

    function getObserver(root) {
      if (observerByRoot.has(root)) return observerByRoot.get(root);
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            // One-time reveal avoids flicker/invisible regressions.
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        {
          root,
          threshold: 0.1,
          rootMargin: "0px 0px -6% 0px",
        },
      );
      observerByRoot.set(root, observer);
      return observer;
    }

    function observeRevealNode(node) {
      if (!(node instanceof Element)) return;
      if (!node.matches("[data-reveal]")) return;
      if (observedNodes.has(node)) return;

      observedNodes.add(node);
      const root = getResolvedRoot(node);
      const observer = getObserver(root);
      observer.observe(node);
    }

    function observeCurrentTargets() {
      document.querySelectorAll("[data-reveal]").forEach((node) => {
        observeRevealNode(node);
      });
    }

    if (prefersReduced) {
      observeCurrentTargets();
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        el.classList.add("is-visible");
      });
      return () => {
        observerByRoot.forEach((observer) => observer.disconnect());
      };
    }

    // Observe existing nodes now.
    observeCurrentTargets();

    // Re-run once after paint to catch lazy-loaded route content on first load/refresh.
    const rafId = window.requestAnimationFrame(() => {
      observeCurrentTargets();
    });

    // Track newly added reveal nodes so they never stay hidden.
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          observeRevealNode(node);
          node.querySelectorAll?.("[data-reveal]").forEach((child) => {
            observeRevealNode(child);
          });
        });
      });
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      mutationObserver.disconnect();
      observerByRoot.forEach((observer) => observer.disconnect());
    };
  }, [location.pathname]);

  return null;
}
