export class Pathfinding {

    constructor(world) {

        this.world = world;

        // cached movement costs (optional optimization layer later)
        this.costCache = new Map();

        // directions for grid movement (8-direction system)
        this.directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },

            { x: 1, y: 1 },
            { x: -1, y: -1 },
            { x: 1, y: -1 },
            { x: -1, y: 1 }
        ];

    }

    // =========================
    // 🧭 MAIN PATHFIND FUNCTION
    // =========================

    findPath(startX, startY, endX, endY, options = {}) {

        const maxIterations = options.maxIterations || 800;
        const allowWater = options.allowWater || false;
        const avoidFire = options.avoidFire ?? true;
        const creature = options.creature || null;

        const startKey = this.key(startX, startY);
        const endKey = this.key(endX, endY);

        const openSet = new Map();
        const closedSet = new Set();

        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();

        openSet.set(startKey, { x: startX, y: startY });

        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startX, startY, endX, endY));

        let iterations = 0;

        while (openSet.size > 0 && iterations < maxIterations) {

            iterations++;

            // 🔎 get lowest f-score node
            let currentKey = null;
            let currentNode = null;
            let lowestF = Infinity;

            for (const [key, node] of openSet.entries()) {

                const f = fScore.get(key) ?? Infinity;

                if (f < lowestF) {
                    lowestF = f;
                    currentKey = key;
                    currentNode = node;
                }

            }

            if (!currentNode) break;

            // 🎯 reached goal
            if (currentKey === endKey) {
                return this.reconstructPath(cameFrom, currentKey);
            }

            openSet.delete(currentKey);
            closedSet.add(currentKey);

            for (const dir of this.directions) {

                const nx = currentNode.x + dir.x;
                const ny = currentNode.y + dir.y;

                const neighborKey = this.key(nx, ny);

                if (closedSet.has(neighborKey)) continue;

                // 🌍 world bounds
                if (nx < 0 || ny < 0 ||
                    nx >= this.world.size ||
                    ny >= this.world.size) continue;

                // 🌊 water check
                if (!allowWater && this.world.isWaterAt(nx, ny)) continue;

                // 🔥 fire avoidance
                if (avoidFire && this.isFireAt(nx, ny)) continue;

                // 🧱 terrain penalty
                const terrainCost = this.getTerrainCost(nx, ny);

                if (terrainCost === Infinity) continue;

                const tentativeG =
                    (gScore.get(currentKey) ?? Infinity) +
                    terrainCost +
                    this.diagonalPenalty(dir);

                const existingG = gScore.get(neighborKey);

                if (existingG === undefined || tentativeG < existingG) {

                    cameFrom.set(neighborKey, currentKey);
                    gScore.set(neighborKey, tentativeG);

                    const f =
                        tentativeG +
                        this.heuristic(nx, ny, endX, endY);

                    fScore.set(neighborKey, f);

                    if (!openSet.has(neighborKey)) {
                        openSet.set(neighborKey, { x: nx, y: ny });
                    }

                }

            }

        }

        // ❌ no path found
        return null;

    }

    // =========================
    // 🧠 HEURISTIC (A*)
    // =========================

    heuristic(x1, y1, x2, y2) {

        // Euclidean distance
        const dx = x2 - x1;
        const dy = y2 - y1;

        return Math.sqrt(dx * dx + dy * dy);

    }

    // =========================
    // 🌍 TERRAIN COST SYSTEM
    // =========================

    getTerrainCost(x, y) {

        const world = this.world;

        const h = world.getHeight(x, y);

        // mountain = harder to cross
        if (h > 0.75) return 4.0;

        // forest = medium cost
        if (h > 0.55) return 1.6;

        // grass = normal
        if (h > 0.35) return 1.0;

        // sand
        if (h > 0.25) return 1.2;

        // water handled elsewhere
        if (h <= 0.25) return Infinity;

        return 1.0;

    }

    // =========================
    // 🔥 FIRE CHECK
    // =========================

    isFireAt(x, y) {

        const r2 = 9;

        for (const fire of this.world.fires) {

            const dx = fire.x - x;
            const dy = fire.y - y;

            if (dx * dx + dy * dy <= r2) {
                return true;
            }

        }

        return false;

    }

    // =========================
    // 📏 DIAGONAL PENALTY
    // =========================

    diagonalPenalty(dir) {

        // diagonals slightly more expensive
        if (dir.x !== 0 && dir.y !== 0) return 0.4;
        return 0;

    }

    // =========================
    // 🔁 PATH RECONSTRUCTION
    // =========================

    reconstructPath(cameFrom, currentKey) {

        const path = [];

        while (cameFrom.has(currentKey)) {

            const node = this.fromKey(currentKey);
            path.push(node);

            currentKey = cameFrom.get(currentKey);

        }

        path.reverse();

        return path;

    }

    // =========================
    // 🧩 KEY UTILITIES
    // =========================

    key(x, y) {
        return `${x},${y}`;
    }

    fromKey(key) {

        const parts = key.split(",");
        return {
            x: parseInt(parts[0]),
            y: parseInt(parts[1])
        };

    }

            }
