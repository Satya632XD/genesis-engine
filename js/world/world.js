import { Noise } from "./noise.js";
import { Creature } from "../creatures/creature.js";
import { Food } from "./food.js";
import { Weather } from "./weather.js";
import { Fire } from "./fire.js";
import { Smoke } from "./smoke.js";

export class World {

    constructor(seed) {

        this.seed = seed;

        this.noise = new Noise(seed);

        this.size = 200;

        // 🌍 core simulation data
        this.heightMap = [];

        this.creatures = [];
        this.foods = [];
        this.fires = [];
        this.smokes = [];

        // 🧠 evolution + event buffers
        this.pendingCreatures = [];
        this.pendingFires = [];
        this.pendingSmokes = [];

        this.isUpdating = false;

        // 🌦 systems
        this.weather = new Weather(seed);

        // 🌱 world state memory
        this.burnedTiles = new Set();

        // 🔁 generate world
        this.generate();

        // 🌱 initial ecosystem
        this.spawnInitialCreatures();
        this.spawnInitialFood();
        this.spawnInitialFire();

    }

    // =========================
    // 🌍 WORLD GENERATION
    // =========================

    generate() {

        for (let x = 0; x < this.size; x++) {

            this.heightMap[x] = [];

            for (let y = 0; y < this.size; y++) {

                const nx = x / 50;
                const ny = y / 50;

                this.heightMap[x][y] =
                    this.noise.fbm(nx, ny, 5);

            }

        }

    }

    // =========================
    // 🌱 INITIAL SPAWNS
    // =========================

    spawnInitialCreatures() {

        for (let i = 0; i < 25; i++) {

            const x = this.randTile();
            const y = this.randTile();

            this.creatures.push(new Creature(x, y, this));
        }

    }

    spawnInitialFood() {

        for (let i = 0; i < 90; i++) {

            const x = this.randTile();
            const y = this.randTile();

            this.foods.push(new Food(x, y, this));
        }

    }

    spawnInitialFire() {

        for (let i = 0; i < 2; i++) {

            const x = this.randTile();
            const y = this.randTile();

            if (!this.isWaterAt(x, y)) {
                this.fires.push(new Fire(x, y, this, 1));
            }

        }

    }

    randTile() {
        return Math.floor(Math.random() * this.size);
    }

    // =========================
    // 🧠 SPAWN SYSTEMS
    // =========================

    spawnCreature(x, y, parentGenome = null) {

        const c = new Creature(x, y, this, parentGenome);

        if (this.isUpdating) this.pendingCreatures.push(c);
        else this.creatures.push(c);
    }

    spawnFire(x, y, intensity = 1) {

        const f = new Fire(x, y, this, intensity);

        if (this.isUpdating) this.pendingFires.push(f);
        else this.fires.push(f);
    }

    spawnSmoke(x, y, intensity = 1) {

        const s = new Smoke(x, y, this, intensity);

        if (this.isUpdating) this.pendingSmokes.push(s);
        else this.smokes.push(s);
    }

    // =========================
    // 🌍 TERRAIN ACCESS
    // =========================

    getHeight(x, y) {

        if (
            x < 0 || y < 0 ||
            x >= this.size || y >= this.size
        ) return 0;

        return this.heightMap[x][y];

    }

    isWaterAt(x, y) {
        return this.getHeight(x, y) < 0.3;
    }

    canBurnAt(x, y) {

        if (this.isWaterAt(x, y)) return false;
        return true;

    }

    burnTile(x, y) {
        this.burnedTiles.add(`${x},${y}`);
    }

    isBurned(x, y) {
        return this.burnedTiles.has(`${x},${y}`);
    }

    // =========================
    // 🔁 MAIN UPDATE LOOP
    // =========================

    update(delta) {

        this.isUpdating = true;

        // 🌦 weather first (global influence)
        this.weather.update(delta);

        // 🔥 fires
        for (const f of this.fires) f.update(delta);

        // 🌫 smoke
        for (const s of this.smokes) s.update(delta);

        // 🌱 food
        for (const f of this.foods) f.update(delta);

        // 🧠 creatures (evolution happens here)
        for (const c of this.creatures) c.update(delta);

        // 🧹 cleanup dead entities
        this.fires = this.fires.filter(f => f.alive);
        this.smokes = this.smokes.filter(s => s.alive);
        this.foods = this.foods.filter(f => f.alive);
        this.creatures = this.creatures.filter(c => c.alive);

        // ➕ flush pending spawns
        if (this.pendingCreatures.length)
            this.creatures.push(...this.pendingCreatures);

        if (this.pendingFires.length)
            this.fires.push(...this.pendingFires);

        if (this.pendingSmokes.length)
            this.smokes.push(...this.pendingSmokes);

        this.pendingCreatures = [];
        this.pendingFires = [];
        this.pendingSmokes = [];

        this.isUpdating = false;

    }

                }
