export class ThemeManager {
  constructor(storageService) {
    this.storage = storageService;
    this.themeMode = 'auto'; // 'auto' | 'dark' | 'light'
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.listeners = new Set();
  }

  async init() {
    // Load stored preference if exists
    try {
      const settings = await this.storage.getSettings();
      if (settings && settings.theme) {
        this.themeMode = settings.theme;
      }
    } catch {
      this.themeMode = 'auto';
    }

    this.applyTheme(this.themeMode);

    // Listen to real-time OS night/day changes
    this.mediaQuery.addEventListener('change', (e) => {
      if (this.themeMode === 'auto') {
        this.applyTheme('auto');
        this.notifyListeners(e.matches ? 'dark' : 'light');
      }
    });
  }

  applyTheme(mode) {
    this.themeMode = mode;
    const root = document.documentElement;

    if (mode === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', mode);
    }

    const currentEffective = this.getEffectiveTheme();
    this.notifyListeners(currentEffective);
  }

  async setTheme(mode) {
    this.applyTheme(mode);
    try {
      const settings = await this.storage.getSettings();
      settings.theme = mode;
      await this.storage.saveSettings(settings);
    } catch (err) {
      console.error('Failed to save theme setting:', err);
    }
  }

  getEffectiveTheme() {
    if (this.themeMode === 'auto') {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return this.themeMode;
  }

  getMode() {
    return this.themeMode;
  }

  onThemeChange(fn) {
    this.listeners.add(fn);
  }

  notifyListeners(effectiveTheme) {
    for (const fn of this.listeners) {
      try {
        fn(effectiveTheme, this.themeMode);
      } catch (err) {
        console.error(err);
      }
    }
  }
}
