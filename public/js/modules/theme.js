const ThemeManager = (() => {
  const STORAGE_KEY = 'nolida_theme';
  const ACCENT_STORAGE_KEY = 'nolida_accent';
  const HTML_ATTR = 'data-theme';
  const ACCENT_ATTR = 'data-accent';
  const CLASS_LOADING = 'theme-loading';

  const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  };

  const ACCENT_THEMES = {
    DEFAULT: 'default',
    NEON_GREEN: 'neon-green',
    SUNSET: 'sunset',
    CYAN: 'cyan',
    SAGE: 'sage',
    BURGUNDY: 'burgundy',
  };

  let currentTheme = THEMES.SYSTEM;
  let currentAccent = ACCENT_THEMES.DEFAULT;
  let serverSyncEnabled = true;

  const getSystemTheme = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return THEMES.LIGHT;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
  };

  const getEffectiveTheme = () => {
    if (currentTheme === THEMES.SYSTEM) {
      return getSystemTheme();
    }
    return currentTheme;
  };

  const applyTheme = (theme) => {
    const effective = theme === THEMES.SYSTEM ? getSystemTheme() : theme;
    document.documentElement.setAttribute(HTML_ATTR, effective);
  };

  const applyAccent = (accent) => {
    document.documentElement.setAttribute(ACCENT_ATTR, accent);
  };

  const savePreference = (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Theme preference not saved:', e);
    }
  };

  const saveAccentPreference = (accent) => {
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    } catch (e) {
      console.warn('Accent preference not saved:', e);
    }
  };

  const loadPreference = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  };

  const loadAccentPreference = () => {
    try {
      return localStorage.getItem(ACCENT_STORAGE_KEY);
    } catch (e) {
      return null;
    }
  };

  const syncWithServer = async (theme, accent) => {
    if (!serverSyncEnabled) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const body = { theme };
      if (accent) {
        body.accent = accent;
      }

      await fetch('/api/v1/users/theme', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.warn('Theme sync failed:', e);
    }
  };

  const loadFromServer = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;

      const response = await fetch('/api/v1/users/theme', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.data || null;
      }
    } catch (e) {
      console.warn('Theme load from server failed:', e);
    }
    return null;
  };

  const init = async () => {
    document.documentElement.classList.add(CLASS_LOADING);

    const savedLocal = loadPreference();
    const savedAccentLocal = loadAccentPreference();
    const savedServer = await loadFromServer();

    if (savedLocal && [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM].includes(savedLocal)) {
      currentTheme = savedLocal;
    } else if (savedServer?.theme && [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM].includes(savedServer.theme)) {
      currentTheme = savedServer.theme;
      savePreference(savedServer.theme);
    } else {
      currentTheme = THEMES.SYSTEM;
      savePreference(THEMES.SYSTEM);
    }

    if (savedAccentLocal && Object.values(ACCENT_THEMES).includes(savedAccentLocal)) {
      currentAccent = savedAccentLocal;
    } else if (savedServer?.accent && Object.values(ACCENT_THEMES).includes(savedServer.accent)) {
      currentAccent = savedServer.accent;
      saveAccentPreference(savedServer.accent);
    } else {
      currentAccent = ACCENT_THEMES.DEFAULT;
      saveAccentPreference(ACCENT_THEMES.DEFAULT);
    }

    applyTheme(currentTheme);
    applyAccent(currentAccent);

    requestAnimationFrame(() => {
      document.documentElement.classList.remove(CLASS_LOADING);
    });
  };

  const setTheme = async (theme) => {
    if (![THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM].includes(theme)) {
      throw new Error(`Invalid theme: ${theme}`);
    }

    currentTheme = theme;
    savePreference(theme);
    applyTheme(theme);
    await syncWithServer(theme, currentAccent);
  };

  const setAccent = async (accent) => {
    if (!Object.values(ACCENT_THEMES).includes(accent)) {
      throw new Error(`Invalid accent: ${accent}`);
    }

    currentAccent = accent;
    saveAccentPreference(accent);
    applyAccent(accent);
    await syncWithServer(currentTheme, accent);
  };

  const getTheme = () => currentTheme;
  const getAccent = () => currentAccent;

  const getAvailableThemes = () => [
    { value: THEMES.LIGHT, label: 'Light', icon: '☀️' },
    { value: THEMES.DARK, label: 'Dark', icon: '🌙' },
    { value: THEMES.SYSTEM, label: 'System Default', icon: '💻' },
  ];

  const getAvailableAccents = () => [
    { value: ACCENT_THEMES.DEFAULT, label: 'Neon Blue/Purple', gradient: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)', default: true },
    { value: ACCENT_THEMES.NEON_GREEN, label: 'Neon Green', gradient: 'linear-gradient(135deg, #08B878 0%, #98E808 100%)', premium: true },
    { value: ACCENT_THEMES.SUNSET, label: 'Sunset', gradient: 'linear-gradient(135deg, #F87808 0%, #F82898 100%)', premium: true },
    { value: ACCENT_THEMES.CYAN, label: 'Cyan', gradient: 'linear-gradient(135deg, #0878F8 0%, #08E8F8 100%)', premium: true },
    { value: ACCENT_THEMES.SAGE, label: 'Sage', gradient: 'linear-gradient(135deg, #485848 0%, #889888 100%)', premium: true },
    { value: ACCENT_THEMES.BURGUNDY, label: 'Burgundy', gradient: 'linear-gradient(135deg, #480818 0%, #A80818 100%)', premium: true },
  ];

  const setupSystemListener = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (currentTheme === THEMES.SYSTEM) {
        applyTheme(THEMES.SYSTEM);
      }
    });
  };

  const getThemeLabel = () => {
    const themes = getAvailableThemes();
    return themes.find(t => t.value === currentTheme)?.label || 'System Default';
  };

  const getThemeIcon = () => {
    if (currentTheme === THEMES.SYSTEM) {
      return getSystemTheme() === THEMES.DARK ? '🌙' : '☀️';
    }
    return currentTheme === THEMES.DARK ? '🌙' : '☀️';
  };

  return {
    THEMES,
    ACCENT_THEMES,
    init,
    setTheme,
    setAccent,
    getTheme,
    getAccent,
    getEffectiveTheme,
    getSystemTheme,
    getAvailableThemes,
    getAvailableAccents,
    getThemeLabel,
    getThemeIcon,
    setupSystemListener,
  };
})();

if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
}

export { ThemeManager };