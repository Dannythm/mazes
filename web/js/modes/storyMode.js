export class StoryMode {
  constructor(onLevelSelected, onResetRequest) {
    this.onLevelSelected = onLevelSelected;
    this.onResetRequest = onResetRequest;

    this.currentChapter = 1;
    this.currentLevel = 1;
    this.activeProfile = null;

    this.initUI();
  }

  setProfile(profile) {
    this.activeProfile = profile;
    if (profile && profile.story_progress) {
      this.currentChapter = profile.story_progress.unlocked_chapter || 1;
    }
    this.renderLevelGrid();
  }

  initUI() {
    document.getElementById('btnResetStory').addEventListener('click', () => {
      if (this.onResetRequest) this.onResetRequest();
    });
  }

  renderLevelGrid() {
    const gridEl = document.getElementById('levelGrid');
    const titleEl = document.getElementById('storyWorldTitle');
    const gateEl = document.getElementById('storyGateInfo');

    if (!gridEl) return;
    gridEl.innerHTML = '';

    const worldNames = {
      1: 'World 1: Magic Forest 🌲',
      2: 'World 2: Crystal Cavern 💎',
      3: 'World 3: Cosmic Galaxy 🚀'
    };

    if (titleEl) {
      titleEl.textContent = worldNames[this.currentChapter] || `World ${this.currentChapter}`;
    }

    const totalStars = this.activeProfile?.story_progress?.total_stars || 0;
    const reqStars = this.currentChapter * 25;
    if (gateEl) {
      gateEl.textContent = `Gather 25 ⭐ to unlock World ${this.currentChapter + 1} (Current: ${totalStars}/${reqStars} ⭐)`;
    }

    const unlockedLvl = this.activeProfile?.story_progress?.unlocked_level || 1;
    const levelStarsMap = this.activeProfile?.story_progress?.level_stars || {};

    for (let i = 1; i <= 10; i++) {
      const card = document.createElement('div');
      const levelKey = `ch${this.currentChapter}_lvl${i}`;
      const starsEarned = levelStarsMap[levelKey] || 0;
      const isUnlocked = i <= unlockedLvl;

      card.className = `level-card ${!isUnlocked ? 'locked' : ''} ${i === this.currentLevel ? 'active' : ''}`;

      let starStr = '☆☆☆';
      if (starsEarned === 3) starStr = '⭐⭐⭐';
      else if (starsEarned === 2) starStr = '⭐⭐☆';
      else if (starsEarned === 1) starStr = '⭐☆☆';

      card.innerHTML = `
        <div class="level-num">Maze ${i}</div>
        <div class="level-stars-mini">${isUnlocked ? starStr : '🔒 Locked'}</div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.currentLevel = i;
          this.renderLevelGrid();
          if (this.onLevelSelected) {
            // Stable seed 1266974 for deterministic story mazes
            const seedStr = `1266974_ch${this.currentChapter}_lvl${i}`;
            this.onLevelSelected({
              chapter: this.currentChapter,
              level: i,
              size: 4 + i * 2,
              itemCount: Math.min(5, Math.floor(i / 2) + 1),
              seed: seedStr
            });
          }
        });
      }

      gridEl.appendChild(card);
    }
  }
}
