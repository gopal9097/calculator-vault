export class ModalManager {
  constructor(storageService, cryptoEngine, soundEffects, themeManager) {
    this.storage = storageService;
    this.crypto = cryptoEngine;
    this.sound = soundEffects;
    this.theme = themeManager;
    this.activeLightboxUrls = []; // Track to revoke object URLs
  }

  showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';

    toast.innerHTML = `<span style="font-weight:700;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 260);
    }, duration);
  }

  async openLightbox(fileItems, startIndex, onExport, onDelete) {
    let currentIndex = startIndex;

    // Remove any existing lightbox
    this.closeLightbox();

    const overlay = document.createElement('div');
    overlay.className = 'lightbox-modal';
    overlay.id = 'active-lightbox';

    const renderCurrent = async () => {
      const item = fileItems[currentIndex];
      if (!item) return;

      overlay.innerHTML = `
        <div class="lightbox-header">
          <div class="lightbox-title" title="${item.m.name}">${item.m.name}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:12px;opacity:0.75;">${currentIndex + 1} of ${fileItems.length}</span>
            <button id="lb-close" class="modal-close-btn" style="color:#fff;background:rgba(255,255,255,0.2);">✕</button>
          </div>
        </div>
        <div class="lightbox-body" id="lb-content">
          <div style="color:#fff;display:flex;align-items:center;gap:8px;">
            <span class="spinner"></span> Decrypting media preview...
          </div>
        </div>
        <div class="lightbox-footer">
          <button id="lb-prev" class="secondary-btn" ${currentIndex === 0 ? 'disabled' : ''}>← Previous</button>
          <button id="lb-export" class="primary-btn">Export / Download</button>
          <button id="lb-delete" class="danger-btn">Delete</button>
          <button id="lb-next" class="secondary-btn" ${currentIndex === fileItems.length - 1 ? 'disabled' : ''}>Next →</button>
        </div>
      `;

      // Wire header close
      overlay.querySelector('#lb-close').onclick = () => this.closeLightbox();
      overlay.querySelector('#lb-prev').onclick = () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderCurrent();
        }
      };
      overlay.querySelector('#lb-next').onclick = () => {
        if (currentIndex < fileItems.length - 1) {
          currentIndex++;
          renderCurrent();
        }
      };
      overlay.querySelector('#lb-export').onclick = () => onExport(item.f, item.m);
      overlay.querySelector('#lb-delete').onclick = () => {
        if (confirm(`Are you sure you want to permanently delete "${item.m.name}"?`)) {
          this.closeLightbox();
          onDelete(item.f.id);
        }
      };

      // Decrypt and display file
      try {
        const decryptedBuffer = await this.crypto.decryptFileData(item.f.d);
        const blob = new Blob([decryptedBuffer], { type: item.m.type || 'application/octet-stream' });
        const objectUrl = URL.createObjectURL(blob);
        this.activeLightboxUrls.push(objectUrl);

        const contentArea = overlay.querySelector('#lb-content');
        contentArea.innerHTML = '';

        const type = (item.m.type || '').toLowerCase();
        const name = (item.m.name || '').toLowerCase();

        if (type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|svg)$/.test(name)) {
          const img = document.createElement('img');
          img.className = 'lightbox-media';
          img.src = objectUrl;
          img.alt = item.m.name;
          contentArea.appendChild(img);
        } else if (type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/.test(name)) {
          const video = document.createElement('video');
          video.className = 'lightbox-media';
          video.src = objectUrl;
          video.controls = true;
          video.autoplay = true;
          contentArea.appendChild(video);
        } else if (type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/.test(name)) {
          const wrap = document.createElement('div');
          wrap.style.textAlign = 'center';
          wrap.style.color = '#fff';
          wrap.innerHTML = `<div style="font-size:56px;margin-bottom:16px;">🎵</div><h3>${item.m.name}</h3>`;
          const audio = document.createElement('audio');
          audio.src = objectUrl;
          audio.controls = true;
          audio.autoplay = true;
          audio.style.marginTop = '16px';
          wrap.appendChild(audio);
          contentArea.appendChild(wrap);
        } else if (type === 'application/pdf' || name.endsWith('.pdf')) {
          const iframe = document.createElement('iframe');
          iframe.src = objectUrl;
          iframe.style.width = '90%';
          iframe.style.height = '80vh';
          iframe.style.border = 'none';
          iframe.style.borderRadius = '12px';
          contentArea.appendChild(iframe);
        } else if (type.startsWith('text/') || /\.(txt|md|csv|json|js|html|css|py)$/.test(name)) {
          const text = new TextDecoder().decode(decryptedBuffer);
          const pre = document.createElement('pre');
          pre.className = 'selectable';
          pre.style.maxWidth = '85%';
          pre.style.maxHeight = '75vh';
          pre.style.overflow = 'auto';
          pre.style.padding = '18px';
          pre.style.background = 'rgba(0,0,0,0.7)';
          pre.style.color = '#e2e8f0';
          pre.style.borderRadius = '12px';
          pre.style.fontFamily = 'monospace';
          pre.style.fontSize = '14px';
          pre.textContent = text;
          contentArea.appendChild(pre);
        } else {
          contentArea.innerHTML = `
            <div style="text-align:center;color:#fff;">
              <div style="font-size:64px;margin-bottom:16px;">📄</div>
              <h3>${item.m.name}</h3>
              <p style="opacity:0.75;font-size:14px;margin-top:8px;">Direct preview not supported for this file type.</p>
              <p style="opacity:0.6;font-size:12px;">Click "Export / Download" to open with your device application.</p>
            </div>
          `;
        }
      } catch (err) {
        overlay.querySelector('#lb-content').innerHTML = `
          <div style="color:#ff6961;text-align:center;">
            <h3>Decryption failed</h3>
            <p style="font-size:13px;margin-top:8px;">File might be corrupted or key mismatch.</p>
          </div>
        `;
      }
    };

    document.body.appendChild(overlay);
    renderCurrent();

    // Key handlers for lightbox
    const keyHandler = (e) => {
      if (e.key === 'Escape') this.closeLightbox();
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        currentIndex--;
        renderCurrent();
      }
      if (e.key === 'ArrowRight' && currentIndex < fileItems.length - 1) {
        currentIndex++;
        renderCurrent();
      }
    };
    window.addEventListener('keydown', keyHandler);
    overlay._keyHandler = keyHandler;
  }

  closeLightbox() {
    const active = document.getElementById('active-lightbox');
    if (active) {
      if (active._keyHandler) {
        window.removeEventListener('keydown', active._keyHandler);
      }
      active.remove();
    }
    // Revoke all temporary object URLs
    this.activeLightboxUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    this.activeLightboxUrls = [];
  }

  async openSettingsModal(onSave, onChangePasscode, onWipeData) {
    const settings = await this.storage.getSettings();
    const storageEst = await this.storage.estimateStorageUsage();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'settings-modal';

    const usedMb = (storageEst.usage / (1024 * 1024)).toFixed(2);

    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="assets/logo.svg" alt="Logo" style="width:26px;height:26px;border-radius:7px;box-shadow:0 2px 6px rgba(0,0,0,0.2);">
            <h3>Vault Settings</h3>
          </div>
          <button class="modal-close-btn" id="st-close">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label style="font-size:13px;font-weight:600;color:var(--text-primary);">Theme Appearance</label>
            <select id="st-theme" class="vault-select-control">
              <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>Auto (Follow System Night/Day)</option>
              <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Always Dark (OLED Black)</option>
              <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Always Light</option>
            </select>
            <span style="font-size:11px;color:var(--text-tertiary);">Auto automatically syncs with your device's day/night schedule.</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px;">
            <label style="font-size:13px;font-weight:600;color:var(--text-primary);">Auto-Lock Timer</label>
            <select id="st-timeout" class="vault-select-control">
              <option value="30" ${settings.idleTimeout === 30 ? 'selected' : ''}>30 seconds of inactivity</option>
              <option value="60" ${settings.idleTimeout === 60 ? 'selected' : ''}>1 minute of inactivity</option>
              <option value="300" ${settings.idleTimeout === 300 ? 'selected' : ''}>5 minutes of inactivity</option>
              <option value="900" ${settings.idleTimeout === 900 ? 'selected' : ''}>15 minutes of inactivity</option>
            </select>
            <span style="font-size:11px;color:var(--text-tertiary);">Vault also locks instantly when you switch browser tabs.</span>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--text-primary);">Keypad Sound & Haptic Click</div>
              <div style="font-size:12px;color:var(--text-tertiary);">Play subtle tactile click sound when typing</div>
            </div>
            <input type="checkbox" id="st-sound" ${settings.sound !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent-primary);">
          </div>

          <div style="padding:12px;background:var(--bg-surface-subtle);border-radius:var(--radius-md);border:1px solid var(--border-light);font-size:12px;display:flex;justify-content:space-between;">
            <span>Browser Storage Used:</span>
            <span style="font-weight:600;color:var(--text-primary);">${usedMb} MB</span>
          </div>

          <hr style="border:none;border-top:1px solid var(--border-light);">

          <div style="display:flex;flex-direction:column;gap:10px;">
            <button id="st-change-pin" class="secondary-btn" style="justify-content:flex-start;">🔑 Change Secret Passcode</button>
            <button id="st-nuclear-wipe" class="danger-btn" style="justify-content:flex-start;background:transparent;color:var(--accent-danger);border:1px solid var(--accent-danger);">⚠️ Emergency Reset / Delete All Data</button>
          </div>
        </div>
        <div class="modal-footer">
          <button id="st-cancel" class="secondary-btn">Cancel</button>
          <button id="st-save" class="primary-btn">Save Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('#st-close').onclick = closeModal;
    overlay.querySelector('#st-cancel').onclick = closeModal;

    overlay.querySelector('#st-change-pin').onclick = () => {
      closeModal();
      onChangePasscode();
    };

    overlay.querySelector('#st-nuclear-wipe').onclick = () => {
      if (confirm('CRITICAL WARNING: This will permanently wipe all encrypted vault files, keys, and settings. Are you absolutely sure?')) {
        closeModal();
        onWipeData();
      }
    };

    overlay.querySelector('#st-save').onclick = async () => {
      const themeChoice = overlay.querySelector('#st-theme').value;
      const timeoutChoice = parseInt(overlay.querySelector('#st-timeout').value, 10);
      const soundChoice = overlay.querySelector('#st-sound').checked;

      settings.theme = themeChoice;
      settings.idleTimeout = timeoutChoice;
      settings.sound = soundChoice;

      await this.storage.saveSettings(settings);
      this.theme.setTheme(themeChoice);
      this.sound.setEnabled(soundChoice);

      closeModal();
      this.showToast('Settings saved successfully', 'success');
      if (onSave) onSave(settings);
    };
  }
}
