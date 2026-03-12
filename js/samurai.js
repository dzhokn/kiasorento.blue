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

    // Dismiss when hero loads OR after 3s, whichever first
    Promise.race([heroLoad, timeout]).then(() => {
      preloader.classList.add('preloader--hidden');
      document.body.classList.add('loaded');
      preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
    });
  }

  // ── Scroll Reveal ──────────────────────────────────────────
  function initScrollReveal() {
    if (prefersReducedMotion) {
      // Show everything immediately
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // ── Hero Parallax ─────────────────────────────────────────
  function initParallax() {
    if (prefersReducedMotion || isTouchDevice) return;

    const hero = document.querySelector('.hero');
    const heroImg = document.querySelector('.hero__img');
    if (!hero || !heroImg) return;

    let ticking = false;

    function updateParallax() {
      const scrollY = window.scrollY;
      const heroH = hero.offsetHeight;
      if (scrollY < heroH) {
        heroImg.style.transform = `translate3d(0, ${scrollY * 0.3}px, 0) scale(1.05)`;
      }
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
  }

  // ── Image Blur-Up (Lazy Load) ─────────────────────────────
  function initBlurUp() {
    const images = document.querySelectorAll('.blur-up');

    if (prefersReducedMotion) {
      images.forEach(img => { img.style.opacity = '1'; });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            // The actual src/srcset is already set via <picture>; loading="lazy" handles it.
            // We just handle the opacity transition when it loads.
            if (img.complete) {
              img.classList.add('loaded');
            } else {
              img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
              img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
            }
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '200px' }
    );

    images.forEach(img => observer.observe(img));
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

    let touchStartY = 0;

    function openLightbox(src, alt) {
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
    }

    // Click on gallery images
    document.querySelectorAll('[data-lightbox]').forEach(el => {
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', () => {
        const fullSrc = el.dataset.lightbox;
        const alt = el.querySelector('img')?.alt || el.alt || '';
        openLightbox(fullSrc, alt);
      });
    });

    // Close handlers
    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });

    // Swipe-down to close on touch
    lightbox.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      if (deltaY > 80) closeLightbox();
    }, { passive: true });
  }

  // ── Scroll indicator hide ─────────────────────────────────
  function initScrollIndicator() {
    const indicator = document.querySelector('.hero__scroll');
    if (!indicator) return;

    let hidden = false;
    window.addEventListener('scroll', () => {
      if (!hidden && window.scrollY > 100) {
        indicator.style.opacity = '0';
        hidden = true;
      }
    }, { passive: true });
  }

  // ── Init ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initScrollReveal();
    initParallax();
    initBlurUp();
    initLightbox();
    initScrollIndicator();
  });
})();
