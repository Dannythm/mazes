// 2D Canvas Renderer with Low-Pass Triangle Path Spline Smoothing & Untouched Square/Rect/Hex Renderers
export class Renderer2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = 'magic';
    this.avatar = 'unicorn';
    this.angleStyle = '90';

    this.playerCell = null;
    this.pathHistory = [];
  }

  setTheme(theme) {
    this.theme = theme;
  }

  setAvatar(avatar) {
    this.avatar = avatar;
  }

  setAngleStyle(style) {
    this.angleStyle = style;
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.scale(dpr, dpr);
  }

  render(grid, playerCell, pathHistory = []) {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;

    this.ctx.clearRect(0, 0, width, height);
    if (!grid || !grid.cells || grid.cells.length === 0) return;

    this.playerCell = playerCell;
    this.pathHistory = pathHistory;

    switch (grid.shape) {
      case 'circle':
        this.renderCircular(grid, width, height);
        break;
      case 'star':
        this.renderStarTriangular(grid, width, height);
        break;
      case 'hexagon':
        this.renderTrueHexagon(grid, width, height);
        break;
      case 'triangle':
        this.renderTrueTriangle(grid, width, height);
        break;
      case 'rectangle':
      case 'square':
      default:
        this.renderSquareOrRect(grid, width, height);
        break;
    }
  }

  // --- Smooth Corridor-Following Felt-Tip Brush Trail for Square/Rect/Hex (UNTOUCHED) ---
  drawSmoothBrushTrail(points, brushWidth) {
    if (!points || points.length < 2) return;

    const pts = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (Math.hypot(points[i].x - pts[pts.length - 1].x, points[i].y - pts[pts.length - 1].y) > 2) {
        pts.push(points[i]);
      }
    }

    if (pts.length < 2) return;

    const drawSplinePath = (ctx) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      if (pts.length === 2) {
        ctx.lineTo(pts[1].x, pts[1].y);
      } else {
        const m0 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        ctx.lineTo(m0.x, m0.y);

        for (let i = 1; i < pts.length - 1; i++) {
          const mi = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mi.x, mi.y);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      }
    };

    // Pass 1: Soft Translucent Outer Glow
    this.ctx.lineWidth = brushWidth * 1.5;
    this.ctx.strokeStyle = this.theme === 'space' ? 'rgba(0, 206, 201, 0.35)' : 'rgba(232, 67, 147, 0.35)';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    drawSplinePath(this.ctx);
    this.ctx.stroke();

    // Pass 2: Solid Felt-Tip Core
    this.ctx.lineWidth = brushWidth;
    this.ctx.strokeStyle = this.theme === 'space' ? '#00cec9' : '#e84393';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    drawSplinePath(this.ctx);
    this.ctx.stroke();
  }

  // --- DEDICATED LOW-PASS SMOOTHED TRIANGLE PATH TRAIL RENDERER ---
  drawTriangleBrushTrail(historyCells, side, centerX, topY, brushWidth) {
    if (!historyCells || historyCells.length < 2) return;

    // 1. Compute raw cell centroid pixel coordinates
    const rawPts = historyCells.map(c => this.getTrueTriCentroid(c.row, c.col, side, centerX, topY));
    if (rawPts.length < 2) return;

    // 2. Filter duplicate positions
    const pts = [rawPts[0]];
    for (let i = 1; i < rawPts.length; i++) {
      if (Math.hypot(rawPts[i].x - pts[pts.length - 1].x, rawPts[i].y - pts[pts.length - 1].y) > 2) {
        pts.push(rawPts[i]);
      }
    }
    if (pts.length < 2) return;

    // 3. Apply 3-Tap Low-Pass Filter to eliminate high-frequency alternating cell teeth
    const smoothed = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const sx = 0.25 * pts[i - 1].x + 0.5 * pts[i].x + 0.25 * pts[i + 1].x;
      const sy = 0.25 * pts[i - 1].y + 0.5 * pts[i].y + 0.25 * pts[i + 1].y;
      smoothed.push({ x: sx, y: sy });
    }
    smoothed.push(pts[pts.length - 1]);

    // 4. Draw continuous midpoint quadratic splines through smoothed coordinates
    const drawTriSpline = (ctx) => {
      ctx.beginPath();
      ctx.moveTo(smoothed[0].x, smoothed[0].y);

      if (smoothed.length === 2) {
        ctx.lineTo(smoothed[1].x, smoothed[1].y);
      } else {
        const m0 = { x: (smoothed[0].x + smoothed[1].x) / 2, y: (smoothed[0].y + smoothed[1].y) / 2 };
        ctx.lineTo(m0.x, m0.y);

        for (let i = 1; i < smoothed.length - 1; i++) {
          const mi = { x: (smoothed[i].x + smoothed[i + 1].x) / 2, y: (smoothed[i].y + smoothed[i + 1].y) / 2 };
          ctx.quadraticCurveTo(smoothed[i].x, smoothed[i].y, mi.x, mi.y);
        }
        ctx.lineTo(smoothed[smoothed.length - 1].x, smoothed[smoothed.length - 1].y);
      }
    };

    // Pass 1: Soft Translucent Outer Glow
    this.ctx.lineWidth = brushWidth * 1.5;
    this.ctx.strokeStyle = this.theme === 'space' ? 'rgba(0, 206, 201, 0.35)' : 'rgba(232, 67, 147, 0.35)';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    drawTriSpline(this.ctx);
    this.ctx.stroke();

    // Pass 2: Solid Felt-Tip Core
    this.ctx.lineWidth = brushWidth;
    this.ctx.strokeStyle = this.theme === 'space' ? '#00cec9' : '#e84393';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    drawTriSpline(this.ctx);
    this.ctx.stroke();
  }

  // --- SQUARE / RECTANGLE (UNTOUCHED) ---
  renderSquareOrRect(grid, width, height) {
    const padding = 36;
    const availWidth = width - padding * 2;
    const availHeight = height - padding * 2;

    const cellWidth = availWidth / grid.cols;
    const cellHeight = availHeight / grid.rows;
    const cellSize = Math.min(cellWidth, cellHeight);

    const offsetX = (width - cellSize * grid.cols) / 2;
    const offsetY = (height - cellSize * grid.rows) / 2;

    this.ctx.beginPath();
    this.ctx.lineWidth = Math.max(6, Math.floor(cellSize * 0.22));
    this.ctx.strokeStyle = this.theme === 'space' ? '#00cec9' : '#9b59b6';
    this.ctx.strokeRect(offsetX, offsetY, cellSize * grid.cols, cellSize * grid.rows);

    const trailPts = this.pathHistory.map(c => ({
      x: offsetX + (c.col + 0.5) * cellSize,
      y: offsetY + (c.row + 0.5) * cellSize
    }));
    this.drawSmoothBrushTrail(trailPts, cellSize * 0.35);

    if (grid.startCell) {
      const sx = offsetX + (grid.startCell.col + 0.5) * cellSize;
      const sy = offsetY + (grid.startCell.row + 0.5) * cellSize;
      this.drawMarker(sx, sy, cellSize * 0.35, '🏁', 'rgba(0, 184, 148, 0.3)');
    }
    if (grid.endCell) {
      const ex = offsetX + (grid.endCell.col + 0.5) * cellSize;
      const ey = offsetY + (grid.endCell.row + 0.5) * cellSize;
      this.drawMarker(ex, ey, cellSize * 0.38, '🏆', 'rgba(255, 118, 117, 0.3)');
    }

    grid.cells.forEach(c => {
      if (c.hasItem) {
        const ix = offsetX + (c.col + 0.5) * cellSize;
        const iy = offsetY + (c.row + 0.5) * cellSize;
        this.drawIcon(ix, iy, cellSize * 0.35, '⭐');
      }
    });

    this.ctx.beginPath();
    this.ctx.lineWidth = Math.max(4, Math.floor(cellSize * 0.14));
    this.ctx.strokeStyle = this.theme === 'space' ? '#81ecec' : '#6c5ce7';
    this.ctx.lineJoin = this.angleStyle === 'rounded' ? 'round' : 'miter';
    this.ctx.lineCap = this.angleStyle === 'rounded' ? 'round' : 'square';

    grid.cells.forEach(c => {
      const x = offsetX + c.col * cellSize;
      const y = offsetY + c.row * cellSize;

      if (c.walls.get('up')) {
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + cellSize, y);
      }
      if (c.walls.get('right')) {
        this.ctx.moveTo(x + cellSize, y);
        this.ctx.lineTo(x + cellSize, y + cellSize);
      }
      if (c.walls.get('down')) {
        this.ctx.moveTo(x, y + cellSize);
        this.ctx.lineTo(x + cellSize, y + cellSize);
      }
      if (c.walls.get('left')) {
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y + cellSize);
      }
    });
    this.ctx.stroke();

    if (this.playerCell) {
      const px = offsetX + (this.playerCell.col + 0.5) * cellSize;
      const py = offsetY + (this.playerCell.row + 0.5) * cellSize;
      this.drawAvatar(px, py, cellSize * 0.42);
    }
  }

  // --- TRUE HEXAGON POLYGON (UNTOUCHED) ---
  renderTrueHexagon(grid, width, height) {
    const padding = 40;
    const R = grid.hexRadius || 2;

    const maxW = (2 * R + 1) * 1.732;
    const maxH = (2 * R + 1) * 1.5;
    const hexR = Math.min((width - padding * 2) / maxW, (height - padding * 2) / maxH);

    const centerX = width / 2;
    const centerY = height / 2;

    this.ctx.beginPath();
    this.ctx.lineWidth = 6;
    this.ctx.strokeStyle = this.theme === 'space' ? '#00cec9' : '#9b59b6';
    const outerRadius = (R + 0.5) * hexR * 1.732;
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * (Math.PI / 180);
      const x = centerX + outerRadius * Math.cos(angle);
      const y = centerY + outerRadius * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.stroke();

    const trailPts = this.pathHistory.map(c => this.getAxialHexCenter(c.q, c.r, hexR, centerX, centerY));
    this.drawSmoothBrushTrail(trailPts, hexR * 0.4);

    this.ctx.lineWidth = Math.max(3, hexR * 0.14);
    this.ctx.strokeStyle = this.theme === 'space' ? '#81ecec' : '#6c5ce7';

    grid.cells.forEach(c => {
      const center = this.getAxialHexCenter(c.q, c.r, hexR, centerX, centerY);
      this.drawAxialHexWalls(center.x, center.y, hexR, c);
    });

    if (grid.startCell) {
      const pt = this.getAxialHexCenter(grid.startCell.q, grid.startCell.r, hexR, centerX, centerY);
      this.drawMarker(pt.x, pt.y, hexR * 0.5, '🏁', 'rgba(0, 184, 148, 0.3)');
    }
    if (grid.endCell) {
      const pt = this.getAxialHexCenter(grid.endCell.q, grid.endCell.r, hexR, centerX, centerY);
      this.drawMarker(pt.x, pt.y, hexR * 0.5, '🏆', 'rgba(255, 118, 117, 0.3)');
    }
    if (this.playerCell) {
      const pt = this.getAxialHexCenter(this.playerCell.q, this.playerCell.r, hexR, centerX, centerY);
      this.drawAvatar(pt.x, pt.y, hexR * 0.5);
    }
  }

  getAxialHexCenter(q, r, hexR, cx, cy) {
    const x = cx + hexR * 1.732 * (q + r / 2);
    const y = cy + hexR * 1.5 * r;
    return { x, y };
  }

  drawAxialHexWalls(cx, cy, radius, cell) {
    const dirs = ['right', 'down-right', 'down-left', 'left', 'up-left', 'up-right'];
    for (let i = 0; i < 6; i++) {
      const dir = dirs[i];
      if (cell.walls.get(dir) !== false) {
        const angle = (i * 60 - 30) * (Math.PI / 180);
        const nextAngle = ((i + 1) * 60 - 30) * (Math.PI / 180);
        const x1 = cx + radius * Math.cos(angle);
        const y1 = cy + radius * Math.sin(angle);
        const x2 = cx + radius * Math.cos(nextAngle);
        const y2 = cy + radius * Math.sin(nextAngle);

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
    }
  }

  // --- TRUE TRIANGLE POLYGON (Low-Pass Smoothed Spline Trail) ---
  renderTrueTriangle(grid, width, height) {
    const padding = 40;
    const numRows = grid.rows || 4;
    const side = Math.min((width - padding * 2) / (numRows * 1.1), (height - padding * 2) / (numRows * 0.866));
    const h = side * 0.866;

    const centerX = width / 2;
    const topY = (height - numRows * h) / 2 + 10;

    // Outer Triangle Boundary Frame
    this.ctx.beginPath();
    this.ctx.lineWidth = 6;
    this.ctx.strokeStyle = this.theme === 'space' ? '#00cec9' : '#9b59b6';
    this.ctx.moveTo(centerX, topY);
    this.ctx.lineTo(centerX + numRows * side * 0.5, topY + numRows * h);
    this.ctx.lineTo(centerX - numRows * side * 0.5, topY + numRows * h);
    this.ctx.closePath();
    this.ctx.stroke();

    // Low-Pass Smoothed Spline Trail Renderer
    this.drawTriangleBrushTrail(this.pathHistory, side, centerX, topY, side * 0.3);

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = this.theme === 'space' ? '#81ecec' : '#6c5ce7';

    grid.cells.forEach(c => {
      const r = c.row;
      const col = c.col;
      const isUpright = c.isUpright;

      const yTop = topY + r * h;
      const yBot = yTop + h;
      const rowLeft = centerX - (r + 1) * side * 0.5;

      this.ctx.beginPath();
      if (isUpright) {
        const k = col / 2;
        const xL = rowLeft + k * side;
        const xR = xL + side;
        const xA = xL + side * 0.5;

        if (c.walls.get('right') !== false) {
          this.ctx.moveTo(xA, yTop);
          this.ctx.lineTo(xR, yBot);
        }
        if (c.walls.get('down') !== false) {
          this.ctx.moveTo(xL, yBot);
          this.ctx.lineTo(xR, yBot);
        }
        if (c.walls.get('left') !== false) {
          this.ctx.moveTo(xL, yBot);
          this.ctx.lineTo(xA, yTop);
        }
      } else {
        const k = (col - 1) / 2;
        const xTL = rowLeft + (k + 0.5) * side;
        const xTR = xTL + side;
        const xBA = xTL + side * 0.5;

        if (c.walls.get('right') !== false) {
          this.ctx.moveTo(xTR, yTop);
          this.ctx.lineTo(xBA, yBot);
        }
        if (c.walls.get('up') !== false) {
          this.ctx.moveTo(xTL, yTop);
          this.ctx.lineTo(xTR, yTop);
        }
        if (c.walls.get('left') !== false) {
          this.ctx.moveTo(xTL, yTop);
          this.ctx.lineTo(xBA, yBot);
        }
      }
      this.ctx.stroke();
    });

    if (grid.startCell) {
      const pt = this.getTrueTriCentroid(grid.startCell.row, grid.startCell.col, side, centerX, topY);
      this.drawMarker(pt.x, pt.y, side * 0.35, '🏁', 'rgba(0, 184, 148, 0.3)');
    }
    if (grid.endCell) {
      const pt = this.getTrueTriCentroid(grid.endCell.row, grid.endCell.col, side, centerX, topY);
      this.drawMarker(pt.x, pt.y, side * 0.38, '🏆', 'rgba(255, 118, 117, 0.3)');
    }
    if (this.playerCell) {
      const pt = this.getTrueTriCentroid(this.playerCell.row, this.playerCell.col, side, centerX, topY);
      this.drawAvatar(pt.x, pt.y, side * 0.35);
    }
  }

  // Exact Triangle Cell Corridor Centroid
  getTrueTriCentroid(row, col, side, centerX, topY) {
    const h = side * 0.866;
    const y = topY + (row + 0.5) * h;
    const x = centerX + (col - row) * side * 0.5;
    return { x, y };
  }

  getStarRadius(angle, outerR) {
    const innerR = outerR * 0.5;
    const alpha = Math.PI / 5; // 36 degrees
    const sectorAngle = (2 * Math.PI) / 5; // 72 degrees

    const normAngle = (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const shiftedAngle = (normAngle + Math.PI / 2) % (2 * Math.PI);
    const localAngle = shiftedAngle % sectorAngle;
    const phi = localAngle <= alpha ? localAngle : sectorAngle - localAngle;

    const numerator = outerR * innerR * Math.sin(alpha);
    const denominator = innerR * Math.sin(alpha - phi) + outerR * Math.sin(phi);
    if (denominator === 0) return outerR;
    return numerator / denominator;
  }

  getStarCoords(c, cx, cy, totalRings, outerR) {
    if (!c || c.row === 0) return { x: cx, y: cy };
    const numS = c.numSectors || 1;
    const angle = ((c.col + 0.5) / numS) * 2 * Math.PI - Math.PI / 2;
    const starR = this.getStarRadius(angle, outerR);
    const r = ((c.row + 0.5) / totalRings) * starR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  drawPolarTrail(pathHistory, grid, centerX, centerY, outerR) {
    if (!pathHistory || pathHistory.length < 2) return;

    const totalRings = grid.rings || 4;
    const isStar = grid.shape === 'star';

    const getCellAngle = (c) => {
      if (c.row === 0) return -Math.PI / 2;
      const numS = c.numSectors || 1;
      return ((c.col + 0.5) / numS) * 2 * Math.PI - Math.PI / 2;
    };

    const getCellRadiusRatio = (c) => {
      if (c.row === 0) return 0;
      return (c.row + 0.5) / totalRings;
    };

    const getPointAt = (rRatio, angle) => {
      const R = isStar ? this.getStarRadius(angle, outerR) : outerR;
      const r = rRatio * R;
      return {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle)
      };
    };

    const tracePath = (ctx) => {
      ctx.beginPath();
      const startPt = getPointAt(getCellRadiusRatio(pathHistory[0]), getCellAngle(pathHistory[0]));
      ctx.moveTo(startPt.x, startPt.y);

      for (let i = 0; i < pathHistory.length - 1; i++) {
        const cCurr = pathHistory[i];
        const cNext = pathHistory[i + 1];

        const r1 = getCellRadiusRatio(cCurr);
        const r2 = getCellRadiusRatio(cNext);
        const a1 = getCellAngle(cCurr);
        const a2 = getCellAngle(cNext);

        if (cCurr.row === cNext.row && cCurr.row > 0) {
          let dAngle = a2 - a1;
          while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
          while (dAngle < -Math.PI) dAngle += 2 * Math.PI;

          const steps = Math.max(4, Math.ceil(Math.abs(dAngle) / (Math.PI / 18)));
          for (let s = 1; s <= steps; s++) {
            const a = a1 + (s / steps) * dAngle;
            const pt = getPointAt(r1, a);
            ctx.lineTo(pt.x, pt.y);
          }
        } else {
          const pt2 = getPointAt(r2, a2);
          ctx.lineTo(pt2.x, pt2.y);
        }
      }
    };

    const brushWidth = Math.max(6, (outerR / totalRings) * 0.35);

    // Pass 1: Soft Translucent Outer Glow
    this.ctx.lineWidth = brushWidth * 1.4;
    this.ctx.strokeStyle = this.theme === 'space' ? 'rgba(0, 206, 201, 0.35)' : 'rgba(232, 67, 147, 0.35)';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    tracePath(this.ctx);
    this.ctx.stroke();

    // Pass 2: Solid Core
    this.ctx.lineWidth = brushWidth;
    this.ctx.strokeStyle = this.theme === 'space' ? '#00cec9' : '#e84393';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    tracePath(this.ctx);
    this.ctx.stroke();
  }

  // --- 5-POINT STAR CONCENTRIC POLAR RENDERER ---
  renderStarTriangular(grid, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const outerR = Math.min(width, height) / 2 - 36;
    const totalRings = grid.rings || 4;

    this.ctx.beginPath();
    this.ctx.lineWidth = 6;
    this.ctx.strokeStyle = this.theme === 'space' ? '#00cec9' : '#9b59b6';
    this.drawStarBoundary(centerX, centerY, outerR, 5);
    this.ctx.stroke();

    this.drawPolarTrail(this.pathHistory, grid, centerX, centerY, outerR);

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = this.theme === 'space' ? '#81ecec' : '#6c5ce7';

    grid.cells.forEach(c => {
      if (c.row === 0) return;

      const r = c.row;
      const s = c.col;
      const numS = c.numSectors || 1;
      const startAngle = (s / numS) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((s + 1) / numS) * 2 * Math.PI - Math.PI / 2;

      const starREnd = this.getStarRadius(endAngle, outerR);
      const rInnerEnd = (r / totalRings) * starREnd;
      const rOuterEnd = ((r + 1) / totalRings) * starREnd;

      // Draw Inner Star Contour Arc Wall
      if (c.walls.get('in') !== false) {
        this.ctx.beginPath();
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
          const a = startAngle + (i / steps) * (endAngle - startAngle);
          const rad = (r / totalRings) * this.getStarRadius(a, outerR);
          const px = centerX + rad * Math.cos(a);
          const py = centerY + rad * Math.sin(a);
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.stroke();
      }

      // Draw Clockwise Radial Wall
      if (c.walls.get('cw') !== false) {
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + rInnerEnd * Math.cos(endAngle), centerY + rInnerEnd * Math.sin(endAngle));
        this.ctx.lineTo(centerX + rOuterEnd * Math.cos(endAngle), centerY + rOuterEnd * Math.sin(endAngle));
        this.ctx.stroke();
      }
    });

    if (grid.startCell) {
      const sPt = this.getStarCoords(grid.startCell, centerX, centerY, totalRings, outerR);
      this.drawMarker(sPt.x, sPt.y, (outerR / totalRings) * 0.4, '🏁', 'rgba(0, 184, 148, 0.3)');
    }
    if (grid.endCell) {
      const ePt = this.getStarCoords(grid.endCell, centerX, centerY, totalRings, outerR);
      this.drawMarker(ePt.x, ePt.y, (outerR / totalRings) * 0.4, '🏆', 'rgba(255, 234, 167, 0.4)');
    }

    if (this.playerCell) {
      const pPt = this.getStarCoords(this.playerCell, centerX, centerY, totalRings, outerR);
      this.drawAvatar(pPt.x, pPt.y, (outerR / totalRings) * 0.45);
    }
  }

  // --- CIRCULAR POLAR ---
  renderCircular(grid, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 36;
    const ringSpacing = maxRadius / (grid.rings || 4);

    this.ctx.beginPath();
    this.ctx.lineWidth = 6;
    this.ctx.strokeStyle = this.theme === 'space' ? '#00cec9' : '#9b59b6';
    this.ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.drawPolarTrail(this.pathHistory, grid, centerX, centerY, maxRadius);

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = this.theme === 'space' ? '#81ecec' : '#6c5ce7';

    grid.cells.forEach(c => {
      if (c.row === 0) return;

      const r = c.row;
      const s = c.col;
      const numS = c.numSectors || 1;
      const rInner = r * ringSpacing;
      const rOuter = (r + 1) * ringSpacing;
      const startAngle = (s / numS) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((s + 1) / numS) * 2 * Math.PI - Math.PI / 2;

      // Draw Inner Arc Wall at radius rInner
      if (c.walls.get('in') !== false) {
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, rInner, startAngle, endAngle);
        this.ctx.stroke();
      }

      // Draw Clockwise Radial Wall at angle endAngle
      if (c.walls.get('cw') !== false) {
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + rInner * Math.cos(endAngle), centerY + rInner * Math.sin(endAngle));
        this.ctx.lineTo(centerX + rOuter * Math.cos(endAngle), centerY + rOuter * Math.sin(endAngle));
        this.ctx.stroke();
      }
    });

    if (grid.startCell) {
      const sPt = this.getPolarCoords(grid.startCell, centerX, centerY, ringSpacing);
      this.drawMarker(sPt.x, sPt.y, ringSpacing * 0.4, '🏁', 'rgba(0, 184, 148, 0.3)');
    }
    if (grid.endCell) {
      const ePt = this.getPolarCoords(grid.endCell, centerX, centerY, ringSpacing);
      this.drawMarker(ePt.x, ePt.y, ringSpacing * 0.4, '🏆', 'rgba(255, 234, 167, 0.4)');
    }

    if (this.playerCell) {
      const pPt = this.getPolarCoords(this.playerCell, centerX, centerY, ringSpacing);
      this.drawAvatar(pPt.x, pPt.y, ringSpacing * 0.45);
    }
  }

  drawStarBoundary(cx, cy, outerR, points = 5) {
    const innerR = outerR * 0.5;
    for (let i = 0; i < points * 2; i++) {
      const r = (i % 2 === 0) ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
  }

  getPolarCoords(c, cx, cy, ringSpacing) {
    if (c.row === 0) return { x: cx, y: cy };
    const r = (c.row + 0.5) * ringSpacing;
    const numS = c.numSectors || 1;
    const angle = ((c.col + 0.5) / numS) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  getCellScreenPos(c, grid) {
    if (!c || !grid || !this.canvas) return { x: 0, y: 0 };
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (grid.shape === 'hexagon') {
      const R = grid.hexRadius || 2;
      const hexR = Math.min((width - 80) / ((2 * R + 1) * 1.732), (height - 80) / ((2 * R + 1) * 1.5));
      return this.getAxialHexCenter(c.q, c.r, hexR, width / 2, height / 2);
    } else if (grid.shape === 'triangle') {
      const numRows = grid.rows || 4;
      const side = Math.min((width - 80) / (numRows * 1.1), (height - 80) / (numRows * 0.866));
      return this.getTrueTriCentroid(c.row, c.col, side, width / 2, (height - numRows * side * 0.866) / 2 + 10);
    } else if (grid.shape === 'star') {
      const maxR = Math.min(width, height) / 2 - 36;
      return this.getStarCoords(c, width / 2, height / 2, grid.rings || 4, maxR);
    } else if (grid.shape === 'circle') {
      const maxR = Math.min(width, height) / 2 - 36;
      const ringSpacing = maxR / (grid.rings || 4);
      return this.getPolarCoords(c, width / 2, height / 2, ringSpacing);
    } else {
      const padding = 36;
      const cellSize = Math.min((width - padding * 2) / grid.cols, (height - padding * 2) / grid.rows);
      const offX = (width - cellSize * grid.cols) / 2;
      const offY = (height - cellSize * grid.rows) / 2;
      return { x: offX + (c.col + 0.5) * cellSize, y: offY + (c.row + 0.5) * cellSize };
    }
  }

  findCellAtPointer(grid, pointerX, pointerY) {
    if (!grid || !grid.cells) return null;
    let closestCell = null;
    let minDistance = Infinity;

    grid.cells.forEach(c => {
      const pt = this.getCellScreenPos(c, grid);
      const dist = Math.hypot(pointerX - pt.x, pointerY - pt.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestCell = c;
      }
    });

    return closestCell;
  }

  drawMarker(x, y, radius, icon, bgColor) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = bgColor;
    this.ctx.fill();

    this.drawIcon(x, y, radius * 0.8, icon);
  }

  drawAvatar(x, y, radius) {
    const avatarIcons = {
      unicorn: '🦄',
      fairy: '🧚',
      magic_wand: '🪄',
      rocket: '🚀',
      dino: '🦖',
      car: '🏎️'
    };

    const icon = avatarIcons[this.avatar] || '🦄';

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
    this.ctx.fillStyle = this.theme === 'space' ? 'rgba(0, 206, 201, 0.4)' : 'rgba(255, 118, 117, 0.4)';
    this.ctx.fill();

    this.drawIcon(x, y, radius, icon);
  }

  drawIcon(x, y, size, iconStr) {
    this.ctx.font = `${Math.floor(size * 1.4)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(iconStr, x, y);
  }

  static calcDifficulty(size, shape) {
    let cellsCount = size * size;
    let minCells = 16;
    let maxCells = 1024;

    if (shape === 'square') {
      cellsCount = size * size;
      minCells = 16;
      maxCells = 1024;
    } else if (shape === 'rectangle') {
      const rCount = size;
      const cCount = Math.floor(size * 1.5);
      cellsCount = rCount * cCount;
      minCells = 24;
      maxCells = 1536;
    } else if (shape === 'hexagon') {
      const r = Math.max(2, Math.floor(size / 3));
      cellsCount = 3 * r * (r + 1) + 1;
      minCells = 19;
      maxCells = 400;
    } else if (shape === 'triangle') {
      const numRows = Math.max(4, Math.floor(size * 0.9));
      cellsCount = numRows * numRows;
      minCells = 16;
      maxCells = 784;
    } else if (shape === 'circle') {
      const rings = Math.max(3, Math.floor(size / 2));
      const sectorCounts = [1, 6, 12, 12, 24, 24, 24, 24, 24];
      cellsCount = 0;
      for (let i = 0; i < rings; i++) {
        cellsCount += sectorCounts[Math.min(i, sectorCounts.length - 1)];
      }
      minCells = 19;
      maxCells = 319;
    } else if (shape === 'star') {
      const rings = Math.max(3, Math.floor(size / 2));
      const sectorCounts = [1, 5, 10, 10, 20, 20, 40, 40, 40];
      cellsCount = 0;
      for (let i = 0; i < rings; i++) {
        cellsCount += sectorCounts[Math.min(i, sectorCounts.length - 1)];
      }
      minCells = 16;
      maxCells = 466;
    }

    const ratio = (cellsCount - minCells) / Math.max(1, (maxCells - minCells));
    const score = Math.min(100, Math.max(0, Math.floor(ratio * 100)));

    let label = 'VERY EASY';
    if (score > 80) label = 'EXTREME';
    else if (score > 60) label = 'HARD';
    else if (score > 35) label = 'MEDIUM';
    else if (score > 15) label = 'EASY';

    return { score, label };
  }
}
