// Multi-Geometric Grid Topology Engine with Symmetrical Wall Removal & 1:1 Polar Circle Grid
export class Cell {
  constructor(id, row, col, type = 'square') {
    this.id = id;
    this.row = row;
    this.col = col;
    this.type = type;
    this.neighbors = new Map(); // dir string -> Cell
    this.walls = new Map();     // dir string -> boolean (true = wall exists)
    this.visited = false;
    this.hasItem = false;
    this.itemType = 'star';
  }

  addNeighbor(dir, cell, oppositeDir) {
    if (!cell) return;
    this.neighbors.set(dir, cell);
    this.walls.set(dir, true);

    if (oppositeDir) {
      cell.neighbors.set(oppositeDir, this);
      cell.walls.set(oppositeDir, true);
    }
  }

  removeWall(dir) {
    this.walls.set(dir, false);
    const neighbor = this.neighbors.get(dir);
    if (!neighbor) return;

    for (let [opDir, opCell] of neighbor.neighbors.entries()) {
      if (opCell === this) {
        neighbor.walls.set(opDir, false);
        break;
      }
    }
  }
}

export class Grid {
  constructor(shape = 'square', size = 8) {
    this.shape = shape;
    this.size = size;
    this.rows = size;
    this.cols = size;
    this.cells = [];
    this.startCell = null;
    this.endCell = null;

    this.init();
  }

  init() {
    switch (this.shape) {
      case 'square':
        this.buildSquareGrid();
        break;
      case 'rectangle':
        this.buildRectangleGrid();
        break;
      case 'hexagon':
        this.buildTrueHexagonGrid();
        break;
      case 'triangle':
        this.buildTrueTriangleGrid();
        break;
      case 'circle':
        this.buildCircularGrid();
        break;
      case 'star':
        this.buildStarGrid();
        break;
      default:
        this.buildSquareGrid();
    }
  }

  // --- 100% SYMMETRIC 1:1 SQUARE GRID ---
  buildSquareGrid() {
    this.cells = [];
    this.rows = this.size;
    this.cols = this.size;
    const grid2D = [];

    for (let r = 0; r < this.rows; r++) {
      grid2D[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const cell = new Cell(`cell_${r}_${c}`, r, c, 'square');
        grid2D[r][c] = cell;
        this.cells.push(cell);
      }
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = grid2D[r][c];
        if (r > 0) cell.addNeighbor('up', grid2D[r - 1][c], 'down');
        if (c < this.cols - 1) cell.addNeighbor('right', grid2D[r][c + 1], 'left');
      }
    }

    this.startCell = grid2D[0][0];
    this.endCell = grid2D[this.rows - 1][this.cols - 1];
  }

  // --- 100% SYMMETRIC 1:1 RECTANGLE GRID ---
  buildRectangleGrid() {
    this.cells = [];
    let rCount = this.size;
    let cCount = Math.floor(this.size * 1.5);
    
    if (typeof window !== 'undefined' && window.innerWidth < window.innerHeight) {
      rCount = Math.floor(this.size * 1.5);
      cCount = this.size;
    }

    this.rows = rCount;
    this.cols = cCount;
    const grid2D = [];

    for (let r = 0; r < this.rows; r++) {
      grid2D[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const cell = new Cell(`rect_${r}_${c}`, r, c, 'rectangle');
        grid2D[r][c] = cell;
        this.cells.push(cell);
      }
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = grid2D[r][c];
        if (r > 0) cell.addNeighbor('up', grid2D[r - 1][c], 'down');
        if (c < this.cols - 1) cell.addNeighbor('right', grid2D[r][c + 1], 'left');
      }
    }

    this.startCell = grid2D[0][0];
    this.endCell = grid2D[this.rows - 1][this.cols - 1];
  }

  // --- 100% SYMMETRIC 1:1 CIRCULAR POLAR GRID ---
  buildCircularGrid() {
    this.cells = [];
    const rings = Math.max(3, Math.floor(this.size / 2));
    this.rings = rings;
    const ringCells = [];

    // Ring 0: Center Cell
    const centerCell = new Cell(`c_0_0`, 0, 0, 'circle');
    centerCell.numSectors = 1;
    ringCells[0] = [centerCell];
    this.cells.push(centerCell);

    // Rings 1 to rings-1:
    for (let r = 1; r < rings; r++) {
      const sectorCounts = [1, 6, 12, 12, 24, 24, 24, 24, 24];
      const numSectors = sectorCounts[Math.min(r, sectorCounts.length - 1)];
      ringCells[r] = [];

      for (let s = 0; s < numSectors; s++) {
        const cell = new Cell(`c_${r}_${s}`, r, s, 'circle');
        cell.numSectors = numSectors;
        ringCells[r].push(cell);
        this.cells.push(cell);
      }
    }

    // Connect neighbors across polar concentric rings:
    for (let r = 1; r < rings; r++) {
      const currentRing = ringCells[r];
      const nSectors = currentRing.length;
      const innerRing = ringCells[r - 1];
      const innerNSectors = innerRing.length;
      const ratio = nSectors / innerNSectors;

      for (let s = 0; s < nSectors; s++) {
        const cell = currentRing[s];
        const nextSector = (s + 1) % nSectors;

        // Clockwise & Counter-Clockwise
        cell.addNeighbor('cw', currentRing[nextSector], 'ccw');

        // Inward neighbor (towards center)
        const innerIdx = (r === 1) ? 0 : Math.floor(s / ratio);
        const innerCell = innerRing[innerIdx];
        if (!innerCell.outerCells) innerCell.outerCells = [];
        const outIdx = innerCell.outerCells.length;
        innerCell.outerCells.push(cell);

        cell.addNeighbor('in', innerCell, `out_${outIdx}`);
      }
    }

    this.startCell = centerCell;
    const lastRing = ringCells[rings - 1];
    this.endCell = lastRing[Math.floor(lastRing.length / 2)];
  }

  // --- 100% SYMMETRIC 5-POINT STAR CONCENTRIC POLAR GRID ---
  buildStarGrid() {
    this.cells = [];
    const rings = Math.max(3, Math.floor(this.size / 2));
    this.rings = rings;
    const ringCells = [];

    // Ring 0: Center Cell
    const centerCell = new Cell(`c_0_0`, 0, 0, 'star');
    centerCell.numSectors = 1;
    ringCells[0] = [centerCell];
    this.cells.push(centerCell);

    // Rings 1 to rings-1:
    const sectorCounts = [1, 5, 10, 10, 20, 20, 20, 20, 20];
    for (let r = 1; r < rings; r++) {
      const numSectors = sectorCounts[Math.min(r, sectorCounts.length - 1)];
      ringCells[r] = [];

      for (let s = 0; s < numSectors; s++) {
        const cell = new Cell(`c_${r}_${s}`, r, s, 'star');
        cell.numSectors = numSectors;
        ringCells[r].push(cell);
        this.cells.push(cell);
      }
    }

    // Connect neighbors across polar concentric rings:
    for (let r = 1; r < rings; r++) {
      const currentRing = ringCells[r];
      const nSectors = currentRing.length;
      const innerRing = ringCells[r - 1];
      const innerNSectors = innerRing.length;
      const ratio = nSectors / innerNSectors;

      for (let s = 0; s < nSectors; s++) {
        const cell = currentRing[s];
        const nextSector = (s + 1) % nSectors;

        // Clockwise & Counter-Clockwise
        cell.addNeighbor('cw', currentRing[nextSector], 'ccw');

        // Inward neighbor (towards center)
        const innerIdx = (r === 1) ? 0 : Math.floor(s / ratio);
        const innerCell = innerRing[innerIdx];
        if (!innerCell.outerCells) innerCell.outerCells = [];
        const outIdx = innerCell.outerCells.length;
        innerCell.outerCells.push(cell);

        cell.addNeighbor('in', innerCell, `out_${outIdx}`);
      }
    }

    this.startCell = centerCell;
    const lastRing = ringCells[rings - 1];
    this.endCell = lastRing[Math.floor(lastRing.length / 2)];
  }

  // --- 5-POINT STAR TRIANGULAR MESH GRID ---
  buildStarTriangularGrid() {
    this.cells = [];
    const numRows = Math.max(6, Math.floor(this.size * 0.9));
    this.rows = numRows;
    this.cols = Math.floor(numRows * 1.5);
    const grid2D = [];

    for (let r = 0; r < this.rows; r++) {
      grid2D[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const isUpright = (r + c) % 2 === 0;
        const cell = new Cell(`star_tri_${r}_${c}`, r, c, 'star');
        cell.isUpright = isUpright;
        grid2D[r][c] = cell;
        this.cells.push(cell);
      }
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = grid2D[r][c];
        if (c < this.cols - 1) {
          cell.addNeighbor('right', grid2D[r][c + 1], 'left');
        }
        if (cell.isUpright && r < this.rows - 1) {
          cell.addNeighbor('down', grid2D[r + 1][c], 'up');
        }
      }
    }

    this.startCell = grid2D[0][0];
    this.endCell = grid2D[this.rows - 1][this.cols - 1];
  }

  buildTrueTriangleGrid() {
    this.cells = [];
    const numRows = Math.max(4, Math.floor(this.size * 0.9));
    this.rows = numRows;
    const grid2D = [];

    for (let r = 0; r < numRows; r++) {
      grid2D[r] = [];
      const numColsInRow = 2 * r + 1;
      for (let c = 0; c < numColsInRow; c++) {
        const isUpright = c % 2 === 0;
        const cell = new Cell(`tri_${r}_${c}`, r, c, 'triangle');
        cell.isUpright = isUpright;
        grid2D[r][c] = cell;
        this.cells.push(cell);
      }
    }

    for (let r = 0; r < numRows; r++) {
      const numCols = grid2D[r].length;
      for (let c = 0; c < numCols; c++) {
        const cell = grid2D[r][c];
        if (c < numCols - 1) {
          cell.addNeighbor('right', grid2D[r][c + 1], 'left');
        }
        if (cell.isUpright && r < numRows - 1) {
          cell.addNeighbor('down', grid2D[r + 1][c + 1], 'up');
        }
      }
    }

    this.startCell = grid2D[0][0];
    const lastRow = grid2D[numRows - 1];
    this.endCell = lastRow[lastRow.length - 1];
  }

  buildTrueHexagonGrid() {
    this.cells = [];
    const radius = Math.max(2, Math.floor(this.size / 3));
    this.hexRadius = radius;
    const cellMap = new Map();

    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        const cell = new Cell(`hex_${q}_${r}`, q, r, 'hexagon');
        cell.q = q;
        cell.r = r;
        cellMap.set(`${q},${r}`, cell);
        this.cells.push(cell);
      }
    }

    const dirs = [
      { name: 'right', op: 'left', dq: 1, dr: 0 },
      { name: 'down-right', op: 'up-left', dq: 0, dr: 1 },
      { name: 'down-left', op: 'up-right', dq: -1, dr: 1 },
      { name: 'left', op: 'right', dq: -1, dr: 0 },
      { name: 'up-left', op: 'down-right', dq: 0, dr: -1 },
      { name: 'up-right', op: 'down-left', dq: 1, dr: -1 }
    ];

    this.cells.forEach(cell => {
      dirs.forEach(d => {
        const nKey = `${cell.q + d.dq},${cell.r + d.dr}`;
        const neighbor = cellMap.get(nKey);
        if (neighbor && !cell.neighbors.has(d.name)) {
          cell.addNeighbor(d.name, neighbor, d.op);
        }
      });
    });

    this.startCell = cellMap.get(`0,${-radius}`) || this.cells[0];
    this.endCell = cellMap.get(`0,${radius}`) || this.cells[this.cells.length - 1];
  }

  randomizeStartAndGoal(rng) {
    if (!this.cells || this.cells.length === 0) return;

    const bfs = (startNode) => {
      const distMap = new Map();
      const queue = [startNode];
      distMap.set(startNode, 0);

      let maxDist = -1;
      let farthestCell = startNode;

      while (queue.length > 0) {
        const curr = queue.shift();
        const d = distMap.get(curr);

        if (d > maxDist) {
          maxDist = d;
          farthestCell = curr;
        }

        for (let [dir, neighbor] of curr.neighbors.entries()) {
          if (neighbor && curr.walls.get(dir) === false && !distMap.has(neighbor)) {
            distMap.set(neighbor, d + 1);
            queue.push(neighbor);
          }
        }
      }

      return farthestCell;
    };

    if (!this.startCell) this.startCell = this.cells[0];
    const newGoal = bfs(this.startCell);
    const newStart = bfs(newGoal);

    this.startCell = newStart;
    this.endCell = newGoal;
  }
}
