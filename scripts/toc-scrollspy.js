(function () {
  function decodeHash(hash) {
    try {
      return decodeURIComponent(hash.replace(/^#/, ''));
    } catch (error) {
      return hash.replace(/^#/, '');
    }
  }

  function getHeading(link) {
    const href = link.getAttribute('href') || '';
    const hashIndex = href.indexOf('#');
    if (hashIndex === -1) {
      return null;
    }
    return document.getElementById(decodeHash(href.slice(hashIndex)));
  }

  function createScrollSpy() {
    const toc = document.querySelector('.toc-sidebar');
    if (!toc) {
      return;
    }

    const toggle = document.querySelector('.toc-toggle');
    const storageKey = 'tufte-note:toc-hidden';

    function setHidden(hidden) {
      document.body.classList.toggle('toc-hidden', hidden);
      if (toggle) {
        toggle.setAttribute('aria-expanded', String(!hidden));
        toggle.textContent = hidden ? 'Contents' : 'Hide';
      }
      try {
        window.localStorage.setItem(storageKey, hidden ? '1' : '0');
      } catch (error) {
        // Ignore storage failures; the in-page toggle still works.
      }
    }

    let shouldHide = false;
    try {
      shouldHide = window.localStorage.getItem(storageKey) === '1';
    } catch (error) {
      shouldHide = false;
    }
    setHidden(shouldHide);

    if (toggle) {
      toggle.addEventListener('click', () => {
        setHidden(!document.body.classList.contains('toc-hidden'));
      });
    }

    const links = Array.from(toc.querySelectorAll('a[href*="#"]'));
    const pairs = links
      .map((link) => ({ link, heading: getHeading(link) }))
      .filter((pair) => pair.heading);

    if (!pairs.length) {
      return;
    }

    let ticking = false;

    function setActive(activeLink) {
      links.forEach((link) => {
        link.classList.toggle('is-active', link === activeLink);
      });
    }

    function update() {
      const offset = 120;
      let active = pairs[0];

      for (const pair of pairs) {
        if (pair.heading.getBoundingClientRect().top <= offset) {
          active = pair;
        } else {
          break;
        }
      }

      setActive(active.link);
      ticking = false;
    }

    function requestUpdate() {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('hashchange', requestUpdate);
  }

  document.addEventListener('DOMContentLoaded', createScrollSpy);
})();
