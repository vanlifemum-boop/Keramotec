const header = document.querySelector("[data-header]");
const progress = document.querySelector(".scroll-progress span");
const hero = document.querySelector(".hero");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".main-nav");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const cinematic = document.documentElement.classList.contains("js-cinematic");

let ticking = false;

function updateScrollEffects() {
  const scrollTop = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? Math.min(scrollTop / scrollable, 1) : 0;

  header?.classList.toggle("is-scrolled", scrollTop > 28);

  if (progress) {
    progress.style.transform = `scaleX(${ratio})`;
  }

  // Der Parallax gilt nur dem CSS-Hintergrundbild. Laeuft die Cinematic-Engine,
  // zeichnet das Canvas die Kamerafahrt und das Backdrop ist ausgeblendet.
  if (
    hero &&
    !cinematic &&
    !reducedMotion.matches &&
    scrollTop < window.innerHeight * 1.2
  ) {
    hero.style.setProperty("--hero-shift", `${Math.min(scrollTop * 0.16, 110)}px`);
  }

  ticking = false;
}

function requestScrollUpdate() {
  if (!ticking) {
    requestAnimationFrame(updateScrollEffects);
    ticking = true;
  }
}

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate, { passive: true });
updateScrollEffects();

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -7%" },
);

document.querySelectorAll("[data-reveal]").forEach((element) => {
  if (reducedMotion.matches) {
    element.classList.add("is-visible");
  } else {
    revealObserver.observe(element);
  }
});

function closeNavigation() {
  if (!navToggle || !nav) return;
  navToggle.setAttribute("aria-expanded", "false");
  nav.classList.remove("is-open");
  document.body.classList.remove("nav-open");
}

navToggle?.addEventListener("click", () => {
  const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
  navToggle.setAttribute("aria-expanded", String(willOpen));
  nav?.classList.toggle("is-open", willOpen);
  document.body.classList.toggle("nav-open", willOpen);
});

nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNavigation));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavigation();
});

document.querySelectorAll(".price-group").forEach((group) => {
  group.addEventListener("toggle", () => {
    if (!group.open || window.innerWidth < 680) return;
    document.querySelectorAll(".price-group[open]").forEach((other) => {
      if (other !== group) other.removeAttribute("open");
    });
  });
});

document.querySelectorAll("[data-year]").forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});
