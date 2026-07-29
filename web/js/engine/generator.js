// Seeded PRNG for Deterministic Maze Generation
class SeededRandom {
  constructor(seedStr = '1266974') {
    this.seed = this.hashSeed(seedStr);
  }

  hashSeed(str) {
    let hash = 0;
    if (typeof str === 'number') return str;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) || 1266974;
  }

  nextFloat() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min, max) {
    return Math.floor(this.nextFloat() * (max - min)) + min;
  }
}

export class MazeGenerator {
  static generate(grid, itemCount = 0, seed = '1266974') {
    if (!grid || !grid.cells || grid.cells.length === 0) return;

    const rng = new SeededRandom(seed);

    grid.cells.forEach(c => {
      c.visited = false;
      c.hasItem = false;
      for (let dir of c.neighbors.keys()) {
        c.walls.set(dir, true);
      }
      if (c.outWalls) {
        for (let k of c.outWalls.keys()) {
          c.outWalls.set(k, true);
        }
      }
    });

    const stack = [];
    const initialStart = grid.cells[0];
    initialStart.visited = true;
    stack.push(initialStart);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];

      const unvisitedNeighbors = [];
      for (let [dir, neighbor] of current.neighbors.entries()) {
        if (neighbor && !neighbor.visited) {
          unvisitedNeighbors.push({ dir, cell: neighbor });
        }
      }

      if (unvisitedNeighbors.length > 0) {
        const randIdx = Math.floor(rng.nextFloat() * unvisitedNeighbors.length);
        const { dir, cell: nextCell } = unvisitedNeighbors[randIdx];

        current.removeWall(dir);

        nextCell.visited = true;
        stack.push(nextCell);
      } else {
        stack.pop();
      }
    }

    // Randomize Start and End goal cells to maximum distance dead-ends!
    grid.randomizeStartAndGoal(rng);

    // Place collectible items guaranteed BEFORE endCell along path
    if (itemCount > 0) {
      const endCell = grid.endCell;
      const candidates = grid.cells.filter(c => c !== grid.startCell && c !== endCell);

      const distMap = new Map();
      const queue = [grid.startCell];
      distMap.set(grid.startCell, 0);

      while (queue.length > 0) {
        const curr = queue.shift();
        const d = distMap.get(curr);

        for (let [dir, neighbor] of curr.neighbors.entries()) {
          if (neighbor && !curr.walls.get(dir) && !distMap.has(neighbor)) {
            distMap.set(neighbor, d + 1);
            queue.push(neighbor);
          }
        }
      }

      const endDist = distMap.get(endCell) || 999;
      let validCandidates = candidates.filter(c => (distMap.get(c) || 0) < endDist);
      if (validCandidates.length < itemCount) {
        validCandidates = candidates;
      }

      for (let i = validCandidates.length - 1; i > 0; i--) {
        const j = Math.floor(rng.nextFloat() * (i + 1));
        [validCandidates[i], validCandidates[j]] = [validCandidates[j], validCandidates[i]];
      }

      const count = Math.min(itemCount, validCandidates.length);
      for (let i = 0; i < count; i++) {
        validCandidates[i].hasItem = true;
      }
    }
  }
}
