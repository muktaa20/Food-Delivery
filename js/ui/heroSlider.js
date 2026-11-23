
import { $, $$ } from "../utils/dom.js";

const IMAGE_MS = 5000;
const VIDEO_MAX_MS = 9000;
const MUSIC_URL = "https://assets.mixkit.co/music/91/91.mp3";
const MUSIC_VOLUME = 0.4;

const clip = (id) => ({
  video: `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`,
  poster: `https://assets.mixkit.co/videos/${id}/${id}-thumb-720-0.jpg`,
});

const SLIDES = [
  { ...clip(47159), alt: "Loaded burger with fries falling beside it" },
  { ...clip(44006), alt: "Hot pepperoni pizza with melted cheese" },
  { ...clip(49059), alt: "Chicken roasting over a charcoal fire" },
  { ...clip(3546), alt: "Baked macaroni with bubbling golden cheese" },
  { ...clip(12171), alt: "Parmesan falling over spaghetti and meatballs" },
  { ...clip(44002), alt: "A slice being lifted from a pepperoni pizza" },
];

const slideHTML = (slide, i) => `
  <div class="hero-slide${i === 0 ? " is-active" : ""}" role="group" aria-roledescription="slide"
    aria-label="${i + 1} of ${SLIDES.length}: ${slide.alt}"${i === 0 ? "" : " aria-hidden=\"true\""}>
    ${
      slide.video
        ? `<video muted playsinline preload="none" poster="${slide.poster}" data-src="${slide.video}" aria-label="${slide.alt}"></video>`
        : `<img src="${slide.image}" alt="${slide.alt}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} />`
    }
  </div>`;

export function initHeroSlider() {
  const root = $("#hero-slider");
  if (!root) return;

  root.innerHTML = `
    <div class="hero-track">${SLIDES.map(slideHTML).join("")}</div>
    <div class="hero-controls">
      <button type="button" data-hero="toggle" aria-label="Pause slideshow"><i class="fa-solid fa-pause" aria-hidden="true"></i></button>
      <button type="button" data-hero="sound" aria-label="Turn sound on" aria-pressed="false"><i class="fa-solid fa-volume-xmark" aria-hidden="true"></i></button>
      <button type="button" data-hero="prev" aria-label="Previous slide"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
      <button type="button" data-hero="next" aria-label="Next slide"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
    </div>
    <div class="hero-dots">
      ${SLIDES.map((s, i) => `<button type="button" data-slide="${i}" aria-label="Go to slide ${i + 1}"${i === 0 ? ' aria-current="true"' : ""}></button>`).join("")}
    </div>`;

  const slides = $$(".hero-slide", root);
  const dots = $$(".hero-dots button", root);
  const toggle = $('[data-hero="toggle"]', root);
  const soundButton = $('[data-hero="sound"]', root);
  const music = new Audio();
  music.loop = true;
  music.preload = "none";
  music.volume = MUSIC_VOLUME;
  const failed = new Set();
  let soundOn = false;
  let musicHeld = false; // the pause button also holds the music
  let index = 0;
  let timer = 0;
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const videoAt = (i) => slides[i].querySelector("video");

  function syncMusic() {
    if (!soundOn || musicHeld || document.hidden) {
      music.pause();
      return;
    }
    if (!music.src) music.src = MUSIC_URL;
    music.play().catch((err) => {
      // AbortError only means a quick pause interrupted play().
      if (err.name !== "AbortError") setSound(false);
    });
  }

  function setSound(value) {
    soundOn = value;
    musicHeld = false;
    soundButton.setAttribute("aria-pressed", String(value));
    soundButton.setAttribute("aria-label", value ? "Turn sound off" : "Turn sound on");
    soundButton.innerHTML = `<i class="fa-solid ${value ? "fa-volume-high" : "fa-volume-xmark"}" aria-hidden="true"></i>`;
    syncMusic();
  }

  function schedule() {
    clearTimeout(timer);
    if (!playing || document.hidden) return;
    timer = setTimeout(() => step(1), videoAt(index) ? VIDEO_MAX_MS : IMAGE_MS);
  }

  function playActive() {
    const video = videoAt(index);
    if (video && playing && !document.hidden) {
      if (!video.src) video.src = video.dataset.src;
      // Blocked autoplay just leaves the poster showing; the timer still advances.
      video.play().catch(() => {});
    }
    syncMusic();
    schedule();
  }

  function show(next) {
    const previous = videoAt(index);
    if (previous) {
      previous.pause();
      if (previous.src) previous.currentTime = 0;
    }
    slides[index].classList.remove("is-active");
    slides[index].setAttribute("aria-hidden", "true");
    dots[index].removeAttribute("aria-current");
    index = next;
    slides[index].classList.add("is-active");
    slides[index].removeAttribute("aria-hidden");
    dots[index].setAttribute("aria-current", "true");
    playActive();
  }

  /** Move by one in `direction`, skipping videos that failed to load. */
  function step(direction) {
    let next = index;
    do {
      next = (next + direction + SLIDES.length) % SLIDES.length;
    } while (failed.has(next) && next !== index);
    show(next);
  }

  function setPlaying(value) {
    playing = value;
    musicHeld = !value;
    toggle.setAttribute("aria-label", value ? "Pause slideshow" : "Play slideshow");
    toggle.innerHTML = `<i class="fa-solid ${value ? "fa-pause" : "fa-play"}" aria-hidden="true"></i>`;
    if (value) playActive();
    else {
      clearTimeout(timer);
      syncMusic();
      videoAt(index)?.pause();
    }
  }

  slides.forEach((slide, i) => {
    const video = slide.querySelector("video");
    if (!video) return;
    video.addEventListener("ended", () => {
      if (i === index && playing) step(1);
    });
    video.addEventListener("error", () => {
      failed.add(i);
      dots[i].hidden = true;
      if (i === index) step(1);
    });
  });

  root.addEventListener("click", (e) => {
    const dot = e.target.closest("[data-slide]");
    if (dot) return show(Number(dot.dataset.slide));
    const action = e.target.closest("[data-hero]")?.dataset.hero;
    if (action === "toggle") setPlaying(!playing);
    if (action === "sound") setSound(!soundOn);
    if (action === "prev") step(-1);
    if (action === "next") step(1);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(timer);
      syncMusic();
      videoAt(index)?.pause();
    } else if (playing) {
      playActive();
    } else {
      syncMusic();
    }
  });

  music.addEventListener("error", () => {
    if (!music.src) return;
    setSound(false);
    soundButton.hidden = true;
  });

  setPlaying(playing);
}
