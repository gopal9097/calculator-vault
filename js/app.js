import { StorageService } from './core/storage.js';
import { CryptoEngine } from './core/crypto.js';
import { CalcEngine } from './core/calc-engine.js';
import { ThemeManager } from './ui/theme-manager.js';
import { SoundEffects } from './ui/sound-effects.js';
import { ModalManager } from './ui/modal-manager.js';
import { CalculatorUI } from './ui/calculator-ui.js';
import { VaultUI } from './ui/vault-ui.js';

class App {
  constructor() {
    this.storage = new StorageService();
    this.crypto = new CryptoEngine();
    this.calcEngine = new CalcEngine();
    this.sound = new SoundEffects();
    this.theme = new ThemeManager(this.storage);
    this.modal = new ModalManager(this.storage, this.crypto, this.sound, this.theme);

    this.header = null;
    this.settings = null;
    this.idleTimer = null;
    this.isFileDialogActive = false;
    this.currentView = null; // 'setup' | 'calc' | 'vault'

    // DOM Elements
    this.appRoot = document.getElementById('app-root');
    this.calcView = document.getElementById('calc-view');
    this.setupView = document.getElementById('setup-view');
    this.vaultView = document.getElementById('vault-view');

    // Setup screen elements
    this.setupPin1 = document.getElementById('setup-pin1');
    this.setupPin2 = document.getElementById('setup-pin2');
    this.setupToggle1 = document.getElementById('setup-toggle1');
    this.setupToggle2 = document.getElementById('setup-toggle2');
    this.setupStrengthBar = document.getElementById('setup-strength-bar');
    this.setupStrengthText = document.getElementById('setup-strength-text');
    this.setupMsg = document.getElementById('setup-msg');
    this.setupSubmitBtn = document.getElementById('setup-submit-btn');
  }

  async init() {
    // 1. Initialize Theme (Sync with System Night/Day Mode)
    await this.theme.init();

    // 2. Initialize Settings & Sound
    this.settings = await this.storage.getSettings();
    this.sound.init(this.settings.sound !== false);

    // 3. Initialize Calculator UI
    this.calculatorUI = new CalculatorUI(
      this.calcEngine,
      this.sound,
      (passcode) => this.handleUnlockAttempt(passcode)
    );

    // 4. Initialize Vault UI
    this.vaultUI = new VaultUI(
      this.storage,
      this.crypto,
      this.modal,
      this.sound,
      () => this.lockVault(),
      (active) => this.setFileDialogActive(active)
    );

    // 5. Connect Vault settings button
    const settingsBtn = document.getElementById('vault-settings-btn');
    if (settingsBtn) {
      settingsBtn.onclick = () => {
        this.modal.openSettingsModal(
          (updated) => {
            this.settings = updated;
            this.resetIdleTimer();
          },
          () => this.promptChangePasscode(),
          () => this.nuclearReset()
        );
      };
    }

    // 6. Setup setup screen listeners
    this.initSetupView();

    // 7. Session Inactivity & Security Listeners
    this.initSecurityListeners();

    // 8. Check existing database vault header
    this.header = await this.storage.getHeader();
    if (this.header) {
      this.showView('calc');
    } else {
      this.showView('setup');
    }
  }

  showView(viewName) {
    this.currentView = viewName;
    if (this.calcView) this.calcView.classList.toggle('hidden', viewName !== 'calc');
    if (this.setupView) this.setupView.classList.toggle('hidden', viewName !== 'setup');
    if (this.vaultView) this.vaultView.classList.toggle('hidden', viewName !== 'vault');

    if (this.appRoot) {
      this.appRoot.classList.toggle('vault-mode', viewName === 'vault');
    }
  }

  initSetupView() {
    if (!this.setupSubmitBtn) return;

    // Toggle pin visibility
    const setupToggle = (btn, input) => {
      if (!btn || !input) return;
      btn.onclick = () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? '🙈' : '👁️';
      };
    };
    setupToggle(this.setupToggle1, this.setupPin1);
    setupToggle(this.setupToggle2, this.setupPin2);

    // Strength validation
    const updateStrength = () => {
      const val = this.setupPin1.value;
      let score = 0;
      let msg = '';

      if (!val) {
        score = 0;
        msg = 'Enter 6 to 12 digits';
      } else if (!/^\d+$/.test(val)) {
        score = 10;
        msg = 'Only digits 0-9 allowed';
      } else if (val.length < 6) {
        score = 30;
        msg = `Too short (${val.length}/6 min digits)`;
      } else if (val.length >= 6 && val.length < 8) {
        score = 65;
        msg = 'Acceptable (8+ digits recommended)';
      } else {
        score = 100;
        msg = 'Strong passcode';
      }

      if (this.setupStrengthBar) {
        this.setupStrengthBar.style.width = `${score}%`;
        this.setupStrengthBar.style.backgroundColor =
          score < 50 ? 'var(--accent-danger)' : score < 80 ? 'var(--accent-orange)' : 'var(--accent-green)';
      }
      if (this.setupStrengthText) {
        this.setupStrengthText.textContent = msg;
      }
    };

    if (this.setupPin1) this.setupPin1.oninput = updateStrength;

    // Setup Continue button
    this.setupSubmitBtn.onclick = async () => {
      const p1 = this.setupPin1.value.trim();
      const p2 = this.setupPin2.value.trim();

      if (!/^\d{6,12}$/.test(p1)) {
        this.setupMsg.textContent = 'Please use between 6 and 12 digits (0–9).';
        this.setupMsg.style.color = 'var(--accent-danger)';
        return;
      }

      if (p1 !== p2) {
        this.setupMsg.textContent = 'Passcodes do not match. Please verify.';
        this.setupMsg.style.color = 'var(--accent-danger)';
        return;
      }

      this.setupMsg.textContent = 'Encrypting and initializing vault keys...';
      this.setupMsg.style.color = 'var(--accent-primary)';
      this.setupSubmitBtn.disabled = true;

      try {
        const header = await this.crypto.setupPasscode(p1);
        await this.storage.saveHeader(header);
        this.header = header;

        this.setupPin1.value = '';
        this.setupPin2.value = '';
        this.setupSubmitBtn.disabled = false;

        this.modal.showToast('Vault created! Type your passcode and press = to unlock.', 'success', 5000);
        this.showView('calc');
      } catch (err) {
        this.setupMsg.textContent = `Setup failed: ${err.message}`;
        this.setupSubmitBtn.disabled = false;
      }
    };
  }

  async handleUnlockAttempt(passcode) {
    if (!this.header) return false;

    const ok = await this.crypto.unlock(passcode, this.header);
    if (!ok) {
      return false; // Wrong passcode: proceed as regular calculator
    }

    // Success! Play chime and animate transition
    this.sound.playUnlockChime();
    if (this.calcView) {
      this.calcView.classList.add('unlocking');
    }

    setTimeout(async () => {
      if (this.calcView) this.calcView.classList.remove('unlocking');
      this.showView('vault');
      await this.vaultUI.loadVault();
      this.modal.showToast('Vault Unlocked', 'success');
      this.resetIdleTimer();
    }, 350);

    return true;
  }

  setFileDialogActive(active) {
    this.isFileDialogActive = Boolean(active);
    if (active) {
      clearTimeout(this.idleTimer);
    } else {
      this.resetIdleTimer();
    }
  }

  lockVault() {
    // If native file chooser dialog is currently open, do not prematurely lock
    if (this.isFileDialogActive) {
      return;
    }

    clearTimeout(this.idleTimer);
    this.idleTimer = null;

    this.crypto.lock();
    this.vaultUI.cleanupOnLock();
    this.modal.closeLightbox();
    this.calculatorUI.reset();

    const wasVault = this.currentView === 'vault';
    this.showView('calc');

    if (wasVault) {
      this.modal.showToast('Vault locked', 'info');
    }
  }

  resetIdleTimer() {
    clearTimeout(this.idleTimer);
    if (!this.crypto.isUnlocked() || this.currentView !== 'vault' || this.isFileDialogActive) {
      return;
    }

    const timeoutSec = (this.settings && this.settings.idleTimeout) || 60;
    this.idleTimer = setTimeout(() => {
      this.lockVault();
    }, timeoutSec * 1000);
  }

  initSecurityListeners() {
    // Activity events reset idle timer
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((ev) => {
      document.addEventListener(
        ev,
        () => {
          if (this.crypto.isUnlocked() && !this.isFileDialogActive) {
            this.resetIdleTimer();
          }
        },
        { passive: true }
      );
    });

    // Lock immediately when tab is switched or minimized
    // (Bypassed if native file picker dialog is currently open)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.crypto.isUnlocked() && !this.isFileDialogActive) {
        this.lockVault();
      }
    });

    // Lock on Escape key (unless a lightbox or settings modal is open)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.crypto.isUnlocked() && !this.isFileDialogActive) {
        if (document.getElementById('active-lightbox') || document.getElementById('settings-modal')) {
          return;
        }
        this.lockVault();
      }
    });
  }

  async promptChangePasscode() {
    const current = prompt('Enter your current passcode:');
    if (!current) return;

    const ok = await this.crypto.unlock(current, this.header);
    if (!ok) {
      this.modal.showToast('Current passcode incorrect', 'error');
      return;
    }

    const newPin1 = prompt('Enter NEW 6-12 digit passcode:');
    if (!newPin1 || !/^\d{6,12}$/.test(newPin1)) {
      this.modal.showToast('Invalid new passcode. Must be 6-12 digits.', 'error');
      return;
    }

    const newPin2 = prompt('Confirm NEW passcode:');
    if (newPin1 !== newPin2) {
      this.modal.showToast('New passcodes did not match.', 'error');
      return;
    }

    // Re-encrypt master key with new passcode
    try {
      const salt = this.crypto.randomBytes(16);
      const it = 600000;
      const kek = await this.crypto.deriveKEK(newPin1, salt, it);
      
      // Export current master key to wrap with new KEK
      const rawMK = await window.crypto.subtle.exportKey('raw', this.crypto.masterKey);
      const wrappedMK = await this.crypto.encryptBuffer(kek, rawMK);
      new Uint8Array(rawMK).fill(0);

      this.header = {
        salt,
        it,
        w: wrappedMK,
        updatedAt: Date.now()
      };

      await this.storage.saveHeader(this.header);
      this.modal.showToast('Passcode changed successfully!', 'success');
    } catch (err) {
      this.modal.showToast(`Passcode update failed: ${err.message}`, 'error');
    }
  }

  async nuclearReset() {
    await this.storage.clearAll();
    this.header = null;
    this.lockVault();
    this.showView('setup');
    this.modal.showToast('All vault data wiped successfully', 'info');
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch((err) => console.error('Initialization error:', err));
});
