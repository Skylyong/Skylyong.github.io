(function () {
  const storageKey = 'tufte-note:theme';
  const icons = {
    sun: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm8,24a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,64ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"></path></svg>',
    moon: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M235.54,150.21a104.84,104.84,0,0,1-37,52.91A104,104,0,0,1,32,120,103.09,103.09,0,0,1,52.88,57.48a104.84,104.84,0,0,1,52.91-37,8,8,0,0,1,10,10,88.08,88.08,0,0,0,109.8,109.8,8,8,0,0,1,10,10Z"></path></svg>',
  };

  function getStoredTheme() {
    try {
      return window.sessionStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      window.sessionStorage.setItem(storageKey, theme);
    } catch (error) {}
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getCurrentTheme() {
    return getStoredTheme() || getSystemTheme();
  }

  function updateButton(theme) {
    const button = document.getElementById('theme-toggle');
    if (!button) {
      return;
    }
    button.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
    button.classList.toggle('is-dark', theme === 'dark');
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    button.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateButton(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    setStoredTheme(next);
    applyTheme(next);
  }

  function initScrollVisibility() {
    let ticking = false;

    function sync() {
      document.body.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    }

    function requestSync() {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(sync);
    }

    sync();
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);
  }

  function init() {
    applyTheme(getCurrentTheme());
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.addEventListener('click', toggleTheme);
    }
    initScrollVisibility();

    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event) => {
      if (!getStoredTheme()) {
        applyTheme(event.matches ? 'dark' : 'light');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
