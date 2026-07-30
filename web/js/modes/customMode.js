import { Renderer2D } from '../engine/renderer2d.js';

export class CustomMode {
  constructor(onConfigChanged, onNewMazeRequest, onResetRequest) {
    this.onConfigChanged = onConfigChanged;
    this.onNewMazeRequest = onNewMazeRequest;
    this.onResetRequest = onResetRequest;

    this.shape = 'square';
    this.angle = '90';
    this.size = 8;
    this.seed = '1266974';

    this.initUI();
  }

  generateRandomSeed() {
    return Math.floor(Math.random() * 899999 + 100000).toString();
  }

  initUI() {
    // Shape picker
    const shapeBtns = document.querySelectorAll('#shapePicker .picker-btn');
    shapeBtns.forEach(btn => {
      if (btn.dataset.shape === 'star') {
        btn.classList.add('disabled');
        btn.title = 'Star mazes under construction (Coming Soon!)';
      }

      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled')) return;
        shapeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.shape = btn.dataset.shape;
        this.autoSelectAngleForShape(this.shape);
        this.updateDifficulty();
        this.triggerChange();
      });
    });

    // Angle picker
    const angleBtns = document.querySelectorAll('#anglePicker .picker-btn');
    angleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.style.opacity === '0.4') return;
        angleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.angle = btn.dataset.angle;
        this.triggerChange();
      });
    });

    // Complexity slider
    const slider = document.getElementById('complexitySlider');
    const valLabel = document.getElementById('complexityValue');

    slider.addEventListener('input', (e) => {
      this.size = parseInt(e.target.value);
      valLabel.textContent = `${this.size}x${this.size}`;
      this.updateDifficulty();
      this.triggerChange();
    });

    // Seed input
    const seedInput = document.getElementById('mazeSeedInput');
    const randSeedBtn = document.getElementById('btnRandomSeed');

    seedInput.value = this.seed;
    seedInput.addEventListener('change', (e) => {
      this.seed = e.target.value.trim() || '1266974';
      this.triggerChange();
    });

    randSeedBtn.addEventListener('click', () => {
      this.seed = this.generateRandomSeed();
      seedInput.value = this.seed;
      this.triggerChange();
    });

    // "✨ New Maze" button ALWAYS randomizes seed!
    document.getElementById('btnGenerate').addEventListener('click', () => {
      this.seed = this.generateRandomSeed();
      seedInput.value = this.seed;
      this.triggerChange();
      if (this.onNewMazeRequest) this.onNewMazeRequest();
    });

    document.getElementById('btnReset').addEventListener('click', () => {
      if (this.onResetRequest) this.onResetRequest();
    });

    this.autoSelectAngleForShape(this.shape);
    this.updateDifficulty();
  }

  autoSelectAngleForShape(shape) {
    const angleBtns = document.querySelectorAll('#anglePicker .picker-btn');

    angleBtns.forEach(btn => {
      const a = btn.dataset.angle;
      let allowed = false;

      if (shape === 'square' || shape === 'rectangle') {
        allowed = (a === '90');
      } else if (shape === 'circle') {
        allowed = (a === '90' || a === 'rounded');
      } else if (shape === 'star' || shape === 'triangle') {
        allowed = (a === 'triangle');
      } else if (shape === 'hexagon') {
        allowed = (a === 'hexagonal');
      }

      if (allowed) {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      } else {
        btn.style.opacity = '0.4';
        btn.style.cursor = 'not-allowed';
      }
    });

    let isCurrentAllowed = false;
    angleBtns.forEach(btn => {
      if (btn.dataset.angle === this.angle && btn.style.opacity === '1') {
        isCurrentAllowed = true;
      }
    });

    if (!isCurrentAllowed) {
      angleBtns.forEach(btn => {
        if (!isCurrentAllowed && btn.style.opacity === '1') {
          this.angle = btn.dataset.angle;
          isCurrentAllowed = true;
        }
      });
    }

    angleBtns.forEach(btn => {
      if (btn.dataset.angle === this.angle) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  updateDifficulty() {
    const { score, label } = Renderer2D.calcDifficulty(this.size, this.shape);
    const bar = document.getElementById('difficultyBar');
    const labelEl = document.getElementById('difficultyLabel');

    if (bar) {
      bar.style.setProperty('--diff-fill', `${score}%`);
    }
    if (labelEl) {
      labelEl.textContent = `${label} (${score}%)`;
    }
  }

  triggerChange() {
    if (this.onConfigChanged) {
      this.onConfigChanged({
        shape: this.shape,
        angle: this.angle,
        size: this.size,
        seed: this.seed
      });
    }
  }
}
