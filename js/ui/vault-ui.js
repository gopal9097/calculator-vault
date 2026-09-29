export class VaultUI {
  constructor(storageService, cryptoEngine, modalManager, soundEffects, onLockRequested, onFileDialogStateChange) {
    this.storage = storageService;
    this.crypto = cryptoEngine;
    this.modal = modalManager;
    this.sound = soundEffects;
    this.onLockRequested = onLockRequested;
    this.onFileDialogStateChange = onFileDialogStateChange;

    this.items = []; // [{ f: record, m: metadata, c: category, thumbUrl: string|null }]
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'date-desc';
    this.viewMode = 'grid'; // 'grid' | 'list'
    this.selectedIds = new Set();
    this.isSelectionMode = false;
    this.activeThumbUrls = []; // Track to revoke on lock

    this.initElements();
    this.initListeners();
  }

  setFileDialogActive(active) {
    if (this.onFileDialogStateChange) {
      this.onFileDialogStateChange(active);
    }
  }

  initElements() {
    this.fileInput = document.getElementById('vault-file-input');
    this.dropzone = document.getElementById('vault-dropzone');
    this.categoryTabs = document.getElementById('vault-category-tabs');
    this.fileGrid = document.getElementById('vault-file-grid');
    this.fileList = document.getElementById('vault-file-list');
    this.searchInput = document.getElementById('vault-search-input');
    this.sortSelect = document.getElementById('vault-sort-select');
    this.viewGridBtn = document.getElementById('vault-view-grid-btn');
    this.viewListBtn = document.getElementById('vault-view-list-btn');
    this.batchBar = document.getElementById('vault-batch-bar');
    this.batchCount = document.getElementById('vault-batch-count');
    this.storageBadge = document.getElementById('vault-storage-badge');
    this.lockBtn = document.getElementById('vault-lock-btn');
    this.panicBtn = document.getElementById('vault-panic-btn');
    this.settingsBtn = document.getElementById('vault-settings-btn');
  }

  initListeners() {
    // Lock & Panic buttons
    if (this.lockBtn) {
      this.lockBtn.onclick = () => {
        this.sound.playLockClick();
        this.onLockRequested();
      };
    }
    if (this.panicBtn) {
      this.panicBtn.onclick = () => {
        this.sound.playLockClick();
        this.onLockRequested();
      };
    }

    // File Input & Dropzone
    if (this.dropzone && this.fileInput) {
      // Prevent clicking the file input itself from bubbling back to the dropzone
      this.fileInput.onclick = (e) => {
        e.stopPropagation();
        this.setFileDialogActive(true);
      };

      this.dropzone.onclick = () => {
        this.setFileDialogActive(true);
        this.fileInput.click();
      };

      this.dropzone.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.setFileDialogActive(true);
          this.fileInput.click();
        }
      };

      this.dropzone.ondragover = (e) => {
        e.preventDefault();
        this.dropzone.classList.add('drag-over');
      };

      this.dropzone.ondragleave = () => {
        this.dropzone.classList.remove('drag-over');
      };

      this.dropzone.ondrop = (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files.length) {
          this.handleFileUpload(e.dataTransfer.files);
        }
      };

      this.fileInput.onchange = (e) => {
        this.setFileDialogActive(false);
        if (e.target.files && e.target.files.length) {
          this.handleFileUpload(e.target.files);
        }
      };

      this.fileInput.oncancel = () => {
        this.setFileDialogActive(false);
      };

      // When the native file chooser closes, focus returns to the window
      window.addEventListener('focus', () => {
        setTimeout(() => {
          this.setFileDialogActive(false);
        }, 500);
      });
    }

    // Global dragover & drop prevention so dragging files outside dropzone doesn't navigate away
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);

    // Search & Sort
    if (this.searchInput) {
      this.searchInput.oninput = (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderGallery();
      };
    }

    if (this.sortSelect) {
      this.sortSelect.onchange = (e) => {
        this.sortBy = e.target.value;
        this.renderGallery();
      };
    }

    // View Switcher (Grid vs List)
    if (this.viewGridBtn && this.viewListBtn) {
      this.viewGridBtn.onclick = () => {
        this.viewMode = 'grid';
        this.viewGridBtn.classList.add('active');
        this.viewListBtn.classList.remove('active');
        this.renderGallery();
      };
      this.viewListBtn.onclick = () => {
        this.viewMode = 'list';
        this.viewListBtn.classList.add('active');
        this.viewGridBtn.classList.remove('active');
        this.renderGallery();
      };
    }

    // Batch Actions
    const batchExportBtn = document.getElementById('vault-batch-export');
    const batchDeleteBtn = document.getElementById('vault-batch-delete');
    const batchCancelBtn = document.getElementById('vault-batch-cancel');

    if (batchExportBtn) {
      batchExportBtn.onclick = () => this.handleBatchExport();
    }
    if (batchDeleteBtn) {
      batchDeleteBtn.onclick = () => this.handleBatchDelete();
    }
    if (batchCancelBtn) {
      batchCancelBtn.onclick = () => {
        this.selectedIds.clear();
        this.updateBatchBar();
        this.renderGallery();
      };
    }
  }

  classifyCategory(metadata) {
    const type = (metadata.type || '').toLowerCase();
    const name = (metadata.name || '').toLowerCase();

    if (type.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|bmp|svg)$/.test(name)) {
      return 'photo';
    }
    if (type.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v)$/.test(name)) {
      return 'video';
    }
    if (type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(name)) {
      return 'audio';
    }
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return 'pdf';
    }
    if (
      type.startsWith('text/') ||
      type.includes('officedocument') ||
      type === 'application/msword' ||
      /\.(docx?|xlsx?|pptx?|txt|md|csv|rtf|odt|pages|numbers|key)$/.test(name)
    ) {
      return 'doc';
    }
    return 'other';
  }

  async loadVault() {
    this.revokeThumbUrls();
    this.items = [];
    let corruptCount = 0;

    try {
      const records = await this.storage.getAllFiles();

      for (const record of records) {
        try {
          const metadata = await this.crypto.decryptMetadata(record.m);
          const category = this.classifyCategory(metadata);
          this.items.push({
            f: record,
            m: metadata,
            c: category,
            thumbUrl: null
          });
        } catch {
          corruptCount++;
        }
      }

      if (corruptCount > 0) {
        this.modal.showToast(`${corruptCount} file(s) could not be verified`, 'error');
      }

      this.renderCategoryTabs();
      this.renderGallery();
      this.updateStorageStats();
    } catch (err) {
      this.modal.showToast('Failed to load vault items', 'error');
    }
  }

  async handleFileUpload(files) {
    if (!files || !files.length) return;
    this.setFileDialogActive(false);

    this.modal.showToast(`Encrypting ${files.length} file(s)...`, 'info', 2000);
    let successCount = 0;

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const id = Array.from(this.crypto.randomBytes(16))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        const metadata = {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          lastModified: file.lastModified || Date.now(),
          addedAt: Date.now()
        };

        const encMeta = await this.crypto.encryptMetadata(metadata);
        const encData = await this.crypto.encryptFileData(buffer);

        await this.storage.saveFile(id, encMeta, encData);
        successCount++;
      } catch (err) {
        console.error('File upload error:', err);
      }
    }

    if (this.fileInput) this.fileInput.value = '';

    if (successCount > 0) {
      this.modal.showToast(`Successfully encrypted and saved ${successCount} file(s)`, 'success');
      await this.loadVault();
    } else {
      this.modal.showToast('Could not save files. Check storage limits.', 'error');
    }
  }

  renderCategoryTabs() {
    if (!this.categoryTabs) return;

    const categories = [
      { id: 'all', label: 'All' },
      { id: 'photo', label: 'Photos' },
      { id: 'video', label: 'Videos' },
      { id: 'audio', label: 'Audio' },
      { id: 'pdf', label: 'PDFs' },
      { id: 'doc', label: 'Documents' },
      { id: 'other', label: 'Other' }
    ];

    this.categoryTabs.innerHTML = '';

    categories.forEach((cat) => {
      const count = cat.id === 'all'
        ? this.items.length
        : this.items.filter((i) => i.c === cat.id).length;

      const btn = document.createElement('button');
      btn.className = `tab-btn ${this.currentCategory === cat.id ? 'active' : ''}`;
      btn.innerHTML = `${cat.label} <span class="tab-counter">${count}</span>`;
      btn.onclick = () => {
        this.currentCategory = cat.id;
        this.renderCategoryTabs();
        this.renderGallery();
      };
      this.categoryTabs.appendChild(btn);
    });
  }

  getVisibleItems() {
    let list = [...this.items];

    // Category filter
    if (this.currentCategory !== 'all') {
      list = list.filter((i) => i.c === this.currentCategory);
    }

    // Search query filter
    if (this.searchQuery) {
      list = list.filter((i) => i.m.name.toLowerCase().includes(this.searchQuery));
    }

    // Sort
    list.sort((a, b) => {
      if (this.sortBy === 'date-desc') return (b.m.addedAt || 0) - (a.m.addedAt || 0);
      if (this.sortBy === 'date-asc') return (a.m.addedAt || 0) - (b.m.addedAt || 0);
      if (this.sortBy === 'name-asc') return a.m.name.localeCompare(b.m.name);
      if (this.sortBy === 'name-desc') return b.m.name.localeCompare(a.m.name);
      if (this.sortBy === 'size-desc') return (b.m.size || 0) - (a.m.size || 0);
      if (this.sortBy === 'size-asc') return (a.m.size || 0) - (b.m.size || 0);
      return 0;
    });

    return list;
  }

  renderGallery() {
    const visible = this.getVisibleItems();

    if (this.viewMode === 'grid') {
      if (this.fileGrid) this.fileGrid.classList.remove('hidden');
      if (this.fileList) this.fileList.classList.add('hidden');
      this.renderGridView(visible);
    } else {
      if (this.fileGrid) this.fileGrid.classList.add('hidden');
      if (this.fileList) this.fileList.classList.remove('hidden');
      this.renderListView(visible);
    }

    this.updateBatchBar();
  }

  renderGridView(items) {
    if (!this.fileGrid) return;
    this.fileGrid.innerHTML = '';

    if (items.length === 0) {
      this.fileGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">📁</div>
          <h3>${this.items.length === 0 ? 'Your Vault is Empty' : 'No matching files found'}</h3>
          <p>${this.items.length === 0 ? 'Drag & drop files above to encrypt and protect them.' : 'Try adjusting your search or category filter.'}</p>
        </div>
      `;
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement('div');
      const isSelected = this.selectedIds.has(item.f.id);
      card.className = `file-card ${isSelected ? 'selected' : ''}`;

      const ext = item.m.name.split('.').pop() || '';
      const sizeStr = this.formatBytes(item.m.size);

      // Icon placeholder
      let icon = '📄';
      if (item.c === 'photo') icon = '🖼️';
      if (item.c === 'video') icon = '🎬';
      if (item.c === 'audio') icon = '🎵';
      if (item.c === 'pdf') icon = '📑';
      if (item.c === 'doc') icon = '📝';

      card.innerHTML = `
        <input type="checkbox" class="file-select-checkbox" ${isSelected ? 'checked' : ''}>
        <div class="file-thumbnail-container" id="thumb-${item.f.id}">
          <div class="file-type-icon">${icon}</div>
          <span class="file-ext-badge">${ext}</span>
        </div>
        <div class="file-info">
          <div class="file-title" title="${item.m.name}">${item.m.name}</div>
          <div class="file-meta">
            <span>${sizeStr}</span>
            <span>${item.c.toUpperCase()}</span>
          </div>
        </div>
        <div class="file-card-actions">
          <button class="file-action-btn view-btn" title="Preview">👁️</button>
          <button class="file-action-btn export-btn" title="Export / Download">⬇️</button>
          <button class="file-action-btn delete-btn" title="Delete">🗑️</button>
        </div>
      `;

      // Checkbox listener
      const checkbox = card.querySelector('.file-select-checkbox');
      checkbox.onclick = (e) => {
        e.stopPropagation();
        if (checkbox.checked) {
          this.selectedIds.add(item.f.id);
        } else {
          this.selectedIds.delete(item.f.id);
        }
        card.classList.toggle('selected', checkbox.checked);
        this.updateBatchBar();
      };

      // Card click opens preview
      card.onclick = (e) => {
        if (e.target.closest('.file-action-btn') || e.target.closest('.file-select-checkbox')) return;
        this.modal.openLightbox(items, index, (f, m) => this.exportFile(f, m), (id) => this.deleteFile(id));
      };

      // Action buttons
      card.querySelector('.view-btn').onclick = (e) => {
        e.stopPropagation();
        this.modal.openLightbox(items, index, (f, m) => this.exportFile(f, m), (id) => this.deleteFile(id));
      };
      card.querySelector('.export-btn').onclick = (e) => {
        e.stopPropagation();
        this.exportFile(item.f, item.m);
      };
      card.querySelector('.delete-btn').onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${item.m.name}"?`)) {
          this.deleteFile(item.f.id);
        }
      };

      this.fileGrid.appendChild(card);

      // Lazy load image thumbnail for photo items
      if (item.c === 'photo') {
        this.loadThumbnail(item, card.querySelector(`#thumb-${item.f.id}`));
      }
    });
  }

  renderListView(items) {
    if (!this.fileList) return;
    this.fileList.innerHTML = '';

    if (items.length === 0) {
      this.fileList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3>${this.items.length === 0 ? 'Your Vault is Empty' : 'No matching files found'}</h3>
          <p>Drag & drop files above to encrypt and protect them.</p>
        </div>
      `;
      return;
    }

    items.forEach((item, index) => {
      const row = document.createElement('div');
      const isSelected = this.selectedIds.has(item.f.id);
      row.className = 'file-row';

      const sizeStr = this.formatBytes(item.m.size);
      const dateStr = new Date(item.m.addedAt || item.m.lastModified || Date.now()).toLocaleDateString();

      let icon = '📄';
      if (item.c === 'photo') icon = '🖼️';
      if (item.c === 'video') icon = '🎬';
      if (item.c === 'audio') icon = '🎵';
      if (item.c === 'pdf') icon = '📑';
      if (item.c === 'doc') icon = '📝';

      row.innerHTML = `
        <input type="checkbox" class="file-select-checkbox" style="position:static;" ${isSelected ? 'checked' : ''}>
        <div class="file-row-thumb" id="list-thumb-${item.f.id}">
          <span style="font-size:20px;">${icon}</span>
        </div>
        <div class="file-row-title-wrap">
          <div class="file-row-title" title="${item.m.name}">${item.m.name}</div>
          <div class="file-row-meta">
            <span>${sizeStr}</span>
            <span>•</span>
            <span>${item.c.toUpperCase()}</span>
            <span>•</span>
            <span>${dateStr}</span>
          </div>
        </div>
        <div class="file-row-actions">
          <button class="file-action-btn view-btn" title="Preview">👁️</button>
          <button class="file-action-btn export-btn" title="Export">⬇️</button>
          <button class="file-action-btn delete-btn" title="Delete">🗑️</button>
        </div>
      `;

      const checkbox = row.querySelector('.file-select-checkbox');
      checkbox.onclick = (e) => {
        e.stopPropagation();
        if (checkbox.checked) {
          this.selectedIds.add(item.f.id);
        } else {
          this.selectedIds.delete(item.f.id);
        }
        this.updateBatchBar();
      };

      row.onclick = (e) => {
        if (e.target.closest('.file-action-btn') || e.target.closest('.file-select-checkbox')) return;
        this.modal.openLightbox(items, index, (f, m) => this.exportFile(f, m), (id) => this.deleteFile(id));
      };

      row.querySelector('.view-btn').onclick = (e) => {
        e.stopPropagation();
        this.modal.openLightbox(items, index, (f, m) => this.exportFile(f, m), (id) => this.deleteFile(id));
      };
      row.querySelector('.export-btn').onclick = (e) => {
        e.stopPropagation();
        this.exportFile(item.f, item.m);
      };
      row.querySelector('.delete-btn').onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${item.m.name}"?`)) {
          this.deleteFile(item.f.id);
        }
      };

      this.fileList.appendChild(row);
    });
  }

  async loadThumbnail(item, thumbContainer) {
    if (!thumbContainer) return;
    try {
      const decrypted = await this.crypto.decryptFileData(item.f.d);
      const blob = new Blob([decrypted], { type: item.m.type || 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      this.activeThumbUrls.push(url);

      const img = document.createElement('img');
      img.className = 'file-thumbnail-img';
      img.src = url;
      img.alt = item.m.name;

      thumbContainer.innerHTML = '';
      thumbContainer.appendChild(img);

      const ext = item.m.name.split('.').pop() || '';
      const badge = document.createElement('span');
      badge.className = 'file-ext-badge';
      badge.textContent = ext;
      thumbContainer.appendChild(badge);
    } catch {}
  }

  updateBatchBar() {
    if (!this.batchBar) return;
    const count = this.selectedIds.size;
    if (count > 0) {
      this.batchBar.classList.remove('hidden');
      if (this.batchCount) this.batchCount.textContent = `${count} selected`;
    } else {
      this.batchBar.classList.add('hidden');
    }
  }

  async exportFile(record, metadata) {
    try {
      this.modal.showToast(`Decrypting "${metadata.name}" for download...`, 'info', 1500);
      const decrypted = await this.crypto.decryptFileData(record.d);
      const blob = new Blob([decrypted], { type: metadata.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = metadata.name;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this.modal.showToast(`Exported "${metadata.name}"`, 'success');
    } catch (err) {
      this.modal.showToast(`Failed to export file: ${err.message}`, 'error');
    }
  }

  async deleteFile(id) {
    try {
      await this.storage.deleteFile(id);
      this.selectedIds.delete(id);
      this.modal.showToast('File deleted', 'info');
      await this.loadVault();
    } catch (err) {
      this.modal.showToast('Failed to delete file', 'error');
    }
  }

  async handleBatchExport() {
    const toExport = this.items.filter((i) => this.selectedIds.has(i.f.id));
    if (!toExport.length) return;

    this.modal.showToast(`Exporting ${toExport.length} file(s)...`, 'info');
    for (const item of toExport) {
      await this.exportFile(item.f, item.m);
      await new Promise((r) => setTimeout(r, 200));
    }
    this.selectedIds.clear();
    this.updateBatchBar();
    this.renderGallery();
  }

  async handleBatchDelete() {
    const count = this.selectedIds.size;
    if (confirm(`Permanently delete ${count} selected file(s)?`)) {
      await this.storage.deleteMultipleFiles(Array.from(this.selectedIds));
      this.selectedIds.clear();
      this.modal.showToast(`Deleted ${count} files`, 'success');
      await this.loadVault();
    }
  }

  updateStorageStats() {
    if (!this.storageBadge) return;
    const totalBytes = this.items.reduce((acc, curr) => acc + (curr.m.size || 0), 0);
    this.storageBadge.textContent = `${this.items.length} files · ${this.formatBytes(totalBytes)} · AES-256-GCM`;
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  revokeThumbUrls() {
    this.activeThumbUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    this.activeThumbUrls = [];
  }

  cleanupOnLock() {
    this.revokeThumbUrls();
    this.items = [];
    this.selectedIds.clear();
    if (this.fileGrid) this.fileGrid.innerHTML = '';
    if (this.fileList) this.fileList.innerHTML = '';
  }
}
