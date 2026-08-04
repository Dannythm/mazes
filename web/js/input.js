// Angle-Aware & Continuous Drag Input Handler for iPad & PC
export class InputHandler {
  constructor(canvas, onDirectionCallback, onPointerDragCallback) {
    this.canvas = canvas;
    this.onDirection = onDirectionCallback;
    this.onPointerDrag = onPointerDragCallback;

    this.isDragging = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.mouseStartX = 0;
    this.mouseStartY = 0;
    this.minSwipeDist = 14;

    this.initListeners();
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  initListeners() {
    // Touch Events for iPad / Mobile
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        const coords = this.getCanvasCoords(e);
        if (this.onPointerDrag) this.onPointerDrag(coords.x, coords.y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.isDragging && e.touches.length > 0) {
        const coords = this.getCanvasCoords(e);
        if (this.onPointerDrag) this.onPointerDrag(coords.x, coords.y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      this.isDragging = false;
      if (e.changedTouches.length > 0) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        this.handleSwipe(this.touchStartX, this.touchStartY, endX, endY);
      }
    }, { passive: false });

    // Mouse Drag Events for PC
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.mouseStartX = e.clientX;
      this.mouseStartY = e.clientY;
      const coords = this.getCanvasCoords(e);
      if (this.onPointerDrag) this.onPointerDrag(coords.x, coords.y);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const coords = this.getCanvasCoords(e);
        if (this.onPointerDrag) this.onPointerDrag(coords.x, coords.y);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.handleSwipe(this.mouseStartX, this.mouseStartY, e.clientX, e.clientY);
      }
    });

    // Keyboard Events for PC
    window.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      let dir = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          dir = 'up';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          dir = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          dir = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          dir = 'right';
          break;
        case 'e':
        case 'E':
          dir = 'up-right';
          break;
        case 'q':
        case 'Q':
          dir = 'up-left';
          break;
        case 'c':
        case 'C':
          dir = 'down-right';
          break;
        case 'z':
        case 'Z':
          dir = 'down-left';
          break;
      }

      if (dir && this.onDirection) {
        e.preventDefault();
        this.onDirection(dir, null);
      }
    });
  }

  handleSwipe(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.hypot(dx, dy);

    if (dist < this.minSwipeDist) return;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    let cardinalDir = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      cardinalDir = dx > 0 ? 'right' : 'left';
    } else {
      cardinalDir = dy > 0 ? 'down' : 'up';
    }

    let hexDir = 'right';
    if (angle >= -30 && angle < 30) hexDir = 'right';
    else if (angle >= 30 && angle < 90) hexDir = 'down-right';
    else if (angle >= 90 && angle < 150) hexDir = 'down-left';
    else if (angle >= 150 || angle < -150) hexDir = 'left';
    else if (angle >= -150 && angle < -90) hexDir = 'up-left';
    else if (angle >= -90 && angle < -30) hexDir = 'up-right';

    if (this.onDirection) {
      this.onDirection(cardinalDir, hexDir);
    }
  }
}
