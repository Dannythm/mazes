import { Grid } from './engine/grid.js';
import { MazeGenerator } from './engine/generator.js';
import { Renderer2D } from './engine/renderer2d.js';
import { InputHandler } from './input.js';
import { sound } from './audio.js';
import { ProfileManager } from './profiles.js';
import { CustomMode } from './modes/customMode.js';
import { StoryMode } from './modes/storyMode.js';
import { APIClient } from './api.js';

class App {
  constructor() {
    this.mode = 'custom';
    this.activeProfile = null;
    this.gameStarted = false;

    this.grid = null;
    this.playerCell = null;
    this.pathHistory = [];
    
    this.moves = 0;
    this.startTime = null;
    this.elapsedTime = 0;
    this.resets = 0;
    this.timerInterval = null;

    this.itemsGot = 0;
    this.itemsTotal = 0;

    this.storyConfig = { chapter: 1, level: 1, size: 6, itemCount: 1, seed: '1266974_ch1_lvl1' };
    this.customConfig = { shape: 'square', angle: '90', size: 8, seed: '1266974' };

    this.initCanvas();
    this.initProfileManager();
    this.initModes();
    this.initNavigation();
    this.initVictoryModal();
    this.initStartOverlay();

    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.render();
    });
  }

  initCanvas() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer2D(this.canvas);
    this.renderer.resize();

    this.input = new InputHandler(
      this.canvas,
      (cardinalDir, hexDir) => this.handleDirection(cardinalDir, hexDir),
      (pointerX, pointerY) => this.handlePointerDrag(pointerX, pointerY)
    );
  }

  initProfileManager() {
    this.profileMgr = new ProfileManager(
      (p) => {
        this.activeProfile = p;
        if (p) {
          this.renderer.setTheme(p.theme || 'magic');
          this.renderer.setAvatar(p.avatar || 'unicorn');
          this.storyMode.setProfile(p);
        }
        this.render();
      },
      () => {
        document.getElementById('mainMenu').classList.remove('hidden');
        this.profileMgr.renderMainMenuProfiles();
      }
    );
    this.profileMgr.init();
  }

  initModes() {
    this.customMode = new CustomMode(
      (cfg) => {
        this.customConfig = cfg;
        this.renderer.setAngleStyle(cfg.angle);
        if (this.mode === 'custom') this.startNewMaze();
      },
      () => this.startNewMaze(),
      () => this.resetMaze()
    );

    this.storyMode = new StoryMode(
      (storyCfg) => {
        this.storyConfig = storyCfg;
        if (this.mode === 'story') this.startNewMaze();
      },
      () => this.resetMaze()
    );

    setTimeout(() => this.startNewMaze(), 100);
  }

  initNavigation() {
    const btnCustom = document.getElementById('btnCustomMode');
    const btnStory = document.getElementById('btnStoryMode');
    const panelCustom = document.getElementById('customControls');
    const panelStory = document.getElementById('storyControls');

    btnCustom.addEventListener('click', () => {
      this.mode = 'custom';
      btnCustom.classList.add('active');
      btnStory.classList.remove('active');
      panelCustom.classList.remove('hidden');
      panelStory.classList.add('hidden');
      document.getElementById('hudItemsContainer').style.display = 'none';
      this.startNewMaze();
    });

    btnStory.addEventListener('click', () => {
      this.mode = 'story';
      btnStory.classList.add('active');
      btnCustom.classList.remove('active');
      panelStory.classList.remove('hidden');
      panelCustom.classList.add('hidden');
      document.getElementById('hudItemsContainer').style.display = 'block';
      this.startNewMaze();
    });

    document.getElementById('btnSoundToggle').addEventListener('click', (e) => {
      const enabled = sound.toggle();
      e.target.textContent = enabled ? '🔊' : '🔇';
    });

    document.getElementById('btnPauseTimer').addEventListener('click', () => {
      this.togglePauseTimer();
    });

    document.getElementById('btnResumeTimer').addEventListener('click', () => {
      if (this.isPaused) this.togglePauseTimer();
    });

    document.getElementById('btnThemeToggle').addEventListener('click', () => {
      if (!this.activeProfile) return;
      const newTheme = this.activeProfile.theme === 'magic' ? 'space' : 'magic';
      this.activeProfile.theme = newTheme;
      document.body.className = `theme-${newTheme}`;
      this.renderer.setTheme(newTheme);
      this.render();
    });
  }

  initStartOverlay() {
    const overlay = document.getElementById('startOverlay');
    const btnStart = document.getElementById('btnStartMaze');

    const handleStart = (e) => {
      if (e) e.stopPropagation();
      overlay.classList.add('hidden');
      this.gameStarted = true;
      this.isPaused = false;
      this.startTimer();
    };

    if (btnStart) btnStart.addEventListener('click', handleStart);
    if (overlay) overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('.start-box')) {
        handleStart(e);
      }
    });
  }

  startNewMaze() {
    let shape = 'square';
    let size = 8;
    let items = 0;
    let seed = '1266974';

    if (this.mode === 'custom') {
      shape = this.customConfig.shape;
      size = this.customConfig.size;
      items = 0;
      seed = this.customConfig.seed;
    } else {
      shape = 'square';
      size = this.storyConfig.size;
      items = this.storyConfig.itemCount;
      seed = this.storyConfig.seed;
    }

    this.grid = new Grid(shape, size);
    MazeGenerator.generate(this.grid, items, seed);

    this.playerCell = this.grid.startCell;
    this.pathHistory = [this.playerCell];
    this.moves = 0;
    this.resets = 0;
    this.itemsGot = 0;
    this.itemsTotal = items;

    this.gameStarted = false;
    clearInterval(this.timerInterval);
    this.elapsedTime = 0;
    this.isPaused = false;
    document.getElementById('hudTime').textContent = '0.0s';
    const btnPause = document.getElementById('btnPauseTimer');
    if (btnPause) btnPause.textContent = '⏸️';
    document.getElementById('startOverlay').classList.remove('hidden');
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');

    this.updateHUD();
    this.renderer.resize();
    this.render();
  }

  resetMaze() {
    if (!this.grid) return;
    sound.playReset();
    this.playerCell = this.grid.startCell;
    this.pathHistory = [this.playerCell];
    this.moves = 0;
    this.resets++;

    this.gameStarted = false;
    clearInterval(this.timerInterval);
    this.elapsedTime = 0;
    this.isPaused = false;
    document.getElementById('hudTime').textContent = '0.0s';
    document.getElementById('btnPauseTimer').textContent = '⏸️';
    document.getElementById('startOverlay').classList.remove('hidden');
    document.getElementById('pauseOverlay').classList.add('hidden');

    this.updateHUD();
    this.render();
  }

  togglePauseTimer() {
    this.isPaused = !this.isPaused;
    const btnPause = document.getElementById('btnPauseTimer');
    const overlay = document.getElementById('pauseOverlay');

    if (this.isPaused) {
      clearInterval(this.timerInterval);
      if (btnPause) btnPause.textContent = '▶️';
      if (overlay) overlay.classList.remove('hidden');
    } else {
      if (overlay) overlay.classList.add('hidden');
      if (btnPause) btnPause.textContent = '⏸️';
      if (this.gameStarted) {
        this.startTime = Date.now() - (this.elapsedTime * 1000);
        this.timerInterval = setInterval(() => {
          if (this.startTime && this.gameStarted && !this.isPaused) {
            this.elapsedTime = (Date.now() - this.startTime) / 1000;
            document.getElementById('hudTime').textContent = `${this.elapsedTime.toFixed(1)}s`;
          }
        }, 100);
      }
    }
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.isPaused = false;
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      if (this.startTime && this.gameStarted && !this.isPaused) {
        this.elapsedTime = (Date.now() - this.startTime) / 1000;
        document.getElementById('hudTime').textContent = `${this.elapsedTime.toFixed(1)}s`;
      }
    }, 100);
  }

  handlePointerDrag(pointerX, pointerY) {
    if (!this.gameStarted || this.isPaused || !this.grid || !this.playerCell) return;

    let stepCount = 0;
    const maxStepsPerFrame = 4;

    while (stepCount < maxStepsPerFrame) {
      const currentPos = this.renderer.getCellScreenPos(this.playerCell, this.grid);
      const currDist = Math.hypot(pointerX - currentPos.x, pointerY - currentPos.y);

      if (currDist < 10) break;

      let bestNeighbor = null;
      let bestDist = currDist;

      for (let [dir, neighbor] of this.playerCell.neighbors.entries()) {
        if (neighbor && this.playerCell.walls.get(dir) === false) {
          const pos = this.renderer.getCellScreenPos(neighbor, this.grid);
          const dist = Math.hypot(pointerX - pos.x, pointerY - pos.y);
          if (dist < bestDist - 2) {
            bestDist = dist;
            bestNeighbor = neighbor;
          }
        }
      }

      if (bestNeighbor) {
        this.moveToCell(bestNeighbor);
        stepCount++;
      } else {
        break;
      }
    }
  }

  handleDirection(rawDir, hexDir) {
    if (!this.gameStarted || this.isPaused || !this.grid || !this.playerCell) return;

    let targetVec = { x: 0, y: 0 };
    switch (rawDir) {
      case 'up': targetVec = { x: 0, y: -1 }; break;
      case 'down': targetVec = { x: 0, y: 1 }; break;
      case 'left': targetVec = { x: -1, y: 0 }; break;
      case 'right': targetVec = { x: 1, y: 0 }; break;
      case 'up-left': targetVec = { x: -0.707, y: -0.707 }; break;
      case 'up-right': targetVec = { x: 0.707, y: -0.707 }; break;
      case 'down-left': targetVec = { x: -0.707, y: 0.707 }; break;
      case 'down-right': targetVec = { x: 0.707, y: 0.707 }; break;
    }

    if (this.grid.shape === 'square' || this.grid.shape === 'rectangle') {
      if (this.playerCell.walls.get(rawDir) === false) {
        const neighbor = this.playerCell.neighbors.get(rawDir);
        if (neighbor) {
          this.moveToCell(neighbor);
          return;
        }
      }
    }

    const currentPos = this.renderer.getCellScreenPos(this.playerCell, this.grid);
    const openNeighbors = [];

    for (let [dir, neighbor] of this.playerCell.neighbors.entries()) {
      if (neighbor && this.playerCell.walls.get(dir) === false) {
        const neighborPos = this.renderer.getCellScreenPos(neighbor, this.grid);
        const vx = neighborPos.x - currentPos.x;
        const vy = neighborPos.y - currentPos.y;
        const len = Math.hypot(vx, vy);
        if (len > 0) {
          const nx = vx / len;
          const ny = vy / len;
          const dot = nx * targetVec.x + ny * targetVec.y;
          openNeighbors.push({ neighbor, dot, isPrev: (this.pathHistory.length >= 2 && neighbor === this.pathHistory[this.pathHistory.length - 2]) });
        }
      }
    }

    let bestNeighbor = null;
    let maxDot = -Infinity;

    for (let item of openNeighbors) {
      if (item.dot > 0.10 && item.dot > maxDot) {
        maxDot = item.dot;
        bestNeighbor = item.neighbor;
      }
    }

    if (!bestNeighbor) {
      const nonBackNeighbors = openNeighbors.filter(n => !n.isPrev);
      if (nonBackNeighbors.length === 1 && nonBackNeighbors[0].dot > -0.5) {
        bestNeighbor = nonBackNeighbors[0].neighbor;
      }
    }

    if (bestNeighbor) {
      this.moveToCell(bestNeighbor);
    }
  }

  moveToCell(cell) {
    this.playerCell = cell;

    // Immediate backtrack check: pop last cell if returning to immediate previous cell
    if (this.pathHistory.length >= 2 && cell === this.pathHistory[this.pathHistory.length - 2]) {
      this.pathHistory.pop();
    } else if (this.pathHistory[this.pathHistory.length - 1] !== cell) {
      this.pathHistory.push(cell);
    }

    this.moves++;
    sound.playStep();

    if (cell.hasItem) {
      cell.hasItem = false;
      this.itemsGot++;
      sound.playPickup();
    }

    this.updateHUD();
    this.render();

    if (cell === this.grid.endCell) {
      this.handleVictory();
    }
  }

  updateHUD() {
    document.getElementById('hudMoves').textContent = this.moves;
    document.getElementById('hudItems').textContent = `${this.itemsGot}/${this.itemsTotal}`;
  }

  async handleVictory() {
    this.gameStarted = false;
    clearInterval(this.timerInterval);
    sound.playVictory();

    const modal = document.getElementById('victoryModal');
    document.getElementById('vicMoves').textContent = this.moves;
    document.getElementById('vicTime').textContent = `${this.elapsedTime.toFixed(1)}s`;
    
    const itemsRow = document.getElementById('vicItemsRow');
    if (this.mode === 'story' && this.itemsTotal > 0) {
      itemsRow.style.display = 'block';
      document.getElementById('vicItems').textContent = `${this.itemsGot}/${this.itemsTotal}`;
    } else {
      itemsRow.style.display = 'none';
    }

    let stars = 3;
    if (this.mode === 'story' && this.itemsTotal > 0) {
      const ratio = this.itemsGot / this.itemsTotal;
      stars = ratio >= 1.0 ? 3 : (ratio >= 0.5 ? 2 : 1);
    }

    const starContainer = document.getElementById('victoryStars');
    starContainer.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const span = document.createElement('span');
      span.className = `star ${i <= stars ? 'lit' : ''}`;
      span.textContent = '⭐';
      starContainer.appendChild(span);
    }

    modal.classList.remove('hidden');

    if (this.activeProfile) {
      const payload = {
        profile_id: this.activeProfile.id,
        maze_id: `${this.grid.shape}_${this.grid.size}_${this.customConfig.seed}`,
        mode: this.mode,
        chapter: this.storyConfig.chapter,
        level: this.storyConfig.level,
        moves: this.moves,
        time_sec: this.elapsedTime,
        resets: this.resets,
        items_got: this.itemsGot,
        items_total: this.itemsTotal
      };

      const updatedProf = await APIClient.recordSolve(payload);
      if (updatedProf) {
        this.activeProfile = updatedProf;
        this.profileMgr.updateHeader();
        this.storyMode.setProfile(updatedProf);
      }
    }
  }

  initVictoryModal() {
    const modal = document.getElementById('victoryModal');

    // "Next Maze" -> RANDOMIZE SEED in Custom Mode
    document.getElementById('btnNextMaze').addEventListener('click', () => {
      modal.classList.add('hidden');
      if (this.mode === 'story') {
        this.storyConfig.level = Math.min(10, this.storyConfig.level + 1);
        this.storyMode.currentLevel = this.storyConfig.level;
        this.storyMode.renderLevelGrid();
      } else {
        this.customConfig.seed = this.customMode.generateRandomSeed();
        document.getElementById('mazeSeedInput').value = this.customConfig.seed;
      }
      this.startNewMaze();
    });

    // "Play Again" -> KEEP SAME SEED
    document.getElementById('btnPlayAgain').addEventListener('click', () => {
      modal.classList.add('hidden');
      this.startNewMaze();
    });
  }

  render() {
    if (this.renderer && this.grid) {
      this.renderer.render(this.grid, this.playerCell, this.pathHistory);
    }
  }
}

function startApp() {
  window.app = new App();
  window.gameApp = window.app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
