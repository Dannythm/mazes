import { APIClient } from './api.js';

export class ProfileManager {
  constructor(onProfileChanged, onOpenMainMenu) {
    this.onProfileChanged = onProfileChanged;
    this.onOpenMainMenu = onOpenMainMenu;
    this.profiles = [];
    this.activeProfile = null;

    this.initUI();
  }

  async init() {
    this.profiles = await APIClient.getProfiles();
    if (this.profiles.length > 0) {
      this.activeProfile = this.profiles[0];
    } else {
      this.activeProfile = {
        id: 'default',
        name: 'Explorer',
        avatar: 'unicorn',
        theme: 'magic',
        story_progress: { total_stars: 0, unlocked_chapter: 1, unlocked_level: 1, level_stars: {} }
      };
      this.profiles = [this.activeProfile];
    }

    this.renderProfilesList();
    this.renderMainMenuProfiles();
    this.updateHeader();
    if (this.onProfileChanged) this.onProfileChanged(this.activeProfile);
  }

  initUI() {
    this.badgeEl = document.getElementById('profileBadge');
    this.modalEl = document.getElementById('profileModal');
    this.closeBtn = document.getElementById('btnCloseProfileModal');
    this.createBtn = document.getElementById('btnCreateProfile');
    this.nameInput = document.getElementById('newProfileName');
    this.avatarPicker = document.getElementById('avatarPicker');

    // Edit Modal Elements
    this.editModal = document.getElementById('editProfileModal');
    this.closeEditBtn = document.getElementById('btnCloseEditModal');
    this.saveEditBtn = document.getElementById('btnSaveEditProfile');
    this.editNameInput = document.getElementById('editProfileName');
    this.editAvatarPicker = document.getElementById('editAvatarPicker');

    this.selectedAvatar = 'unicorn';
    this.selectedTheme = 'magic';
    this.editSelectedAvatar = 'unicorn';
    this.editSelectedTheme = 'magic';

    this.badgeEl.addEventListener('click', () => this.openEditModal());
    this.closeBtn.addEventListener('click', () => this.closeModal());
    this.closeEditBtn.addEventListener('click', () => this.closeEditModal());

    // Main Menu Trigger
    document.getElementById('btnHome').addEventListener('click', () => {
      if (this.onOpenMainMenu) this.onOpenMainMenu();
    });

    document.getElementById('btnMenuNewProfile').addEventListener('click', () => {
      document.getElementById('mainMenu').classList.add('hidden');
      this.openModal();
    });

    // New Avatar selector
    this.avatarPicker.querySelectorAll('.avatar-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        this.avatarPicker.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedAvatar = btn.dataset.avatar;
        this.selectedTheme = btn.dataset.theme;
      });
    });

    // Edit Avatar selector
    this.editAvatarPicker.querySelectorAll('.avatar-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editAvatarPicker.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.editSelectedAvatar = btn.dataset.avatar;
        this.editSelectedTheme = btn.dataset.theme;
      });
    });

    this.createBtn.addEventListener('click', () => this.handleCreate());
    this.saveEditBtn.addEventListener('click', () => this.handleSaveEdit());
  }

  openModal() {
    this.renderProfilesList();
    this.modalEl.classList.remove('hidden');
  }

  closeModal() {
    this.modalEl.classList.add('hidden');
  }

  openEditModal() {
    if (!this.activeProfile) return;
    this.editNameInput.value = this.activeProfile.name;
    this.editSelectedAvatar = this.activeProfile.avatar;
    this.editSelectedTheme = this.activeProfile.theme;

    this.editAvatarPicker.querySelectorAll('.avatar-opt').forEach(btn => {
      if (btn.dataset.avatar === this.activeProfile.avatar) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.editModal.classList.remove('hidden');
  }

  closeEditModal() {
    this.editModal.classList.add('hidden');
  }

  async handleSaveEdit() {
    const newName = this.editNameInput.value.trim();
    if (!newName || !this.activeProfile) return;

    const updated = await APIClient.updateProfile(
      this.activeProfile.id,
      newName,
      this.editSelectedAvatar,
      this.editSelectedTheme
    );

    if (updated) {
      this.activeProfile = updated;
      const idx = this.profiles.findIndex(p => p.id === updated.id);
      if (idx !== -1) this.profiles[idx] = updated;
    } else {
      this.activeProfile.name = newName;
      this.activeProfile.avatar = this.editSelectedAvatar;
      this.activeProfile.theme = this.editSelectedTheme;
    }

    this.closeEditModal();
    this.updateHeader();
    this.renderProfilesList();
    this.renderMainMenuProfiles();
    if (this.onProfileChanged) this.onProfileChanged(this.activeProfile);
  }

  async handleCreate() {
    const name = this.nameInput.value.trim();
    if (!name) return;

    const newProf = await APIClient.createProfile(name, this.selectedAvatar, this.selectedTheme);
    if (newProf) {
      this.profiles.push(newProf);
      this.activeProfile = newProf;
    } else {
      const localProf = {
        id: 'prof_' + Date.now(),
        name,
        avatar: this.selectedAvatar,
        theme: this.selectedTheme,
        story_progress: { total_stars: 0, unlocked_chapter: 1, unlocked_level: 1, level_stars: {} }
      };
      this.profiles.push(localProf);
      this.activeProfile = localProf;
    }

    this.nameInput.value = '';
    this.renderProfilesList();
    this.renderMainMenuProfiles();
    this.updateHeader();
    this.closeModal();
    if (this.onProfileChanged) this.onProfileChanged(this.activeProfile);
  }

  renderProfilesList() {
    const container = document.getElementById('profilesList');
    if (!container) return;
    container.innerHTML = '';

    const avatarIcons = {
      unicorn: '🦄', fairy: '🧚', magic_wand: '🪄',
      rocket: '🚀', dino: '🦖', car: '🏎️'
    };

    this.profiles.forEach(p => {
      const card = document.createElement('div');
      card.className = `profile-card ${p.id === this.activeProfile?.id ? 'active' : ''}`;
      
      const totalStars = p.story_progress?.total_stars || 0;
      const solved = p.total_solved || 0;

      card.innerHTML = `
        <div class="profile-card-left">
          <span class="avatar-icon">${avatarIcons[p.avatar] || '🦄'}</span>
          <div>
            <div class="profile-card-name">${p.name}</div>
            <div class="profile-card-stats">⭐ ${totalStars} Stars | 🧩 ${solved} Solved</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm">Select</button>
      `;

      card.addEventListener('click', () => {
        this.activeProfile = p;
        this.renderProfilesList();
        this.updateHeader();
        this.closeModal();
        if (this.onProfileChanged) this.onProfileChanged(this.activeProfile);
      });

      container.appendChild(card);
    });
  }

  renderMainMenuProfiles() {
    const container = document.getElementById('menuProfilesList');
    if (!container) return;
    container.innerHTML = '';

    const avatarIcons = {
      unicorn: '🦄', fairy: '🧚', magic_wand: '🪄',
      rocket: '🚀', dino: '🦖', car: '🏎️'
    };

    this.profiles.forEach(p => {
      const item = document.createElement('div');
      item.className = 'menu-profile-item';

      const totalStars = p.story_progress?.total_stars || 0;
      const solved = p.total_solved || 0;

      item.innerHTML = `
        <div class="menu-profile-left">
          <span class="avatar-icon" style="font-size:2rem;">${avatarIcons[p.avatar] || '🦄'}</span>
          <div style="text-align:left;">
            <div class="menu-profile-name">${p.name}</div>
            <div class="menu-profile-stats">⭐ ${totalStars} Stars | 🧩 ${solved} Solved</div>
          </div>
        </div>
        <button class="btn btn-primary">Play ▶️</button>
      `;

      item.addEventListener('click', () => {
        this.activeProfile = p;
        document.getElementById('mainMenu').classList.add('hidden');
        this.updateHeader();
        if (this.onProfileChanged) this.onProfileChanged(this.activeProfile);
      });

      container.appendChild(item);
    });
  }

  updateHeader() {
    if (!this.activeProfile) return;

    const avatarIcons = {
      unicorn: '🦄', fairy: '🧚', magic_wand: '🪄',
      rocket: '🚀', dino: '🦖', car: '🏎️'
    };

    document.getElementById('headerAvatar').textContent = avatarIcons[this.activeProfile.avatar] || '🦄';
    document.getElementById('headerName').textContent = this.activeProfile.name;
    document.getElementById('headerStars').textContent = this.activeProfile.story_progress?.total_stars || 0;

    document.body.className = `theme-${this.activeProfile.theme || 'magic'}`;
  }
}
