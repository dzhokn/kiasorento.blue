/**
 * The Blue Samurai - Kia Sorento Samurai Edition
 * Scroll effects, lazy loading blur-up, lightbox, preloader
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(hover: none)').matches;

  // ── Preloader ──────────────────────────────────────────────
  function initPreloader() {
    const preloader = document.querySelector('.preloader');
    if (!preloader) return;

    const heroImg = document.querySelector('.hero__img');
    const timeout = new Promise(resolve => setTimeout(resolve, 3000));
    const heroLoad = heroImg
      ? new Promise(resolve => {
          if (heroImg.complete) resolve();
          else {
            heroImg.addEventListener('load', resolve, { once: true });
            heroImg.addEventListener('error', resolve, { once: true });
          }
        })
      : Promise.resolve();

    Promise.race([heroLoad, timeout]).then(() => {
      preloader.classList.add('preloader--hidden');
      document.body.classList.add('loaded');
      preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
    });
  }

  // ── Scroll Reveal + Blur-Up (shared observer) ─────────────
  function initScrollReveal() {
    if (prefersReducedMotion) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      document.querySelectorAll('.blur-up').forEach(img => img.classList.add('loaded'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;

          if (el.classList.contains('reveal')) {
            el.classList.add('visible');
          }

          if (el.classList.contains('blur-up')) {
            if (el.complete) {
              el.classList.add('loaded');
            } else {
              el.addEventListener('load', () => el.classList.add('loaded'), { once: true });
              el.addEventListener('error', () => el.classList.add('loaded'), { once: true });
            }
          }

          observer.unobserve(el);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal, .blur-up').forEach(el => observer.observe(el));
  }

  // ── Scroll Effects (parallax + indicator, single listener) ─
  function initScrollEffects() {
    const hero = document.querySelector('.hero');
    const heroImg = (!prefersReducedMotion && !isTouchDevice) ? document.querySelector('.hero__img-wrap--desktop .hero__img') : null;
    const indicator = document.querySelector('.hero__scroll');
    if (!hero && !indicator) return;

    const heroH = hero ? hero.offsetHeight : 0;
    let indicatorHidden = false;
    let ticking = false;

    function onScroll() {
      const scrollY = window.scrollY;

      if (heroImg && scrollY < heroH) {
        heroImg.style.transform = `translate3d(0, ${scrollY * 0.3}px, 0) scale(1.05)`;
      }

      if (indicator && !indicatorHidden && scrollY > 100) {
        indicator.style.opacity = '0';
        indicatorHidden = true;
      }

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });
  }

  // ── Lightbox ──────────────────────────────────────────────
  function initLightbox() {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-label', 'Image viewer');
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.innerHTML = `
      <button class="lightbox__close" aria-label="Close image viewer">&times;</button>
      <img class="lightbox__img" alt="" />
    `;
    document.body.appendChild(lightbox);

    const lbImg = lightbox.querySelector('.lightbox__img');
    const closeBtn = lightbox.querySelector('.lightbox__close');
    let lastTrigger = null;
    let touchStartY = 0;

    function openLightbox(src, alt, trigger) {
      lastTrigger = trigger;
      lbImg.src = src;
      lbImg.alt = alt;
      lightbox.classList.add('active');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('active');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lbImg.src = '';
      if (lastTrigger) {
        lastTrigger.focus();
        lastTrigger = null;
      }
    }

    // Gallery triggers - add keyboard accessibility
    document.querySelectorAll('[data-lightbox]').forEach(el => {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', (el.querySelector('img')?.alt || '') + ' - click to enlarge');

      function activate() {
        openLightbox(el.dataset.lightbox, el.querySelector('img')?.alt || '', el);
      }

      el.addEventListener('click', activate);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });

    lightbox.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      if (deltaY > 80) closeLightbox();
    }, { passive: true });
  }

  // ── Init ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initScrollReveal();
    initScrollEffects();
    initLightbox();
  });
})();
