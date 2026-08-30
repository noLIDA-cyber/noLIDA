const ThemeManager = (() => {
  const STORAGE_KEY = 'nolida_theme';
  const HTML_ATTR = 'data-theme';
  const CLASS_LOADING = 'theme-loading';

  const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  };

  let currentTheme = THEMES.SYSTEM;
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

  const savePreference = (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Theme preference not saved:', e);
    }
  };

  const loadPreference = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  };

  const syncWithServer = async (theme) => {
    if (!serverSyncEnabled) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await fetch('/api/v1/users/theme', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme }),
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
        return data.data?.theme || null;
      }
    } catch (e) {
      console.warn('Theme load from server failed:', e);
    }
    return null;
  };

  const init = async () => {
    document.documentElement.classList.add(CLASS_LOADING);

    const savedLocal = loadPreference();
    const savedServer = await loadFromServer();

    if (savedLocal && [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM].includes(savedLocal)) {
      currentTheme = savedLocal;
    } else if (savedServer && [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM].includes(savedServer)) {
      currentTheme = savedServer;
      savePreference(savedServer);
    } else {
      currentTheme = THEMES.SYSTEM;
      savePreference(THEMES.SYSTEM);
    }

    applyTheme(currentTheme);

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
    await syncWithServer(theme);
  };

  const getTheme = () => currentTheme;

  const getAvailableThemes = () => [
    { value: THEMES.LIGHT, label: 'Light', icon: '☀️' },
    { value: THEMES.DARK, label: 'Dark', icon: '🌙' },
    { value: THEMES.SYSTEM, label: 'System Default', icon: '💻' },
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
    init,
    setTheme,
    getTheme,
    getEffectiveTheme,
    getSystemTheme,
    getAvailableThemes,
    getThemeLabel,
    getThemeIcon,
    setupSystemListener,
  };
})();

if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
}