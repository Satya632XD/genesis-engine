import { Noise } from "./noise.js";
import { Creature } from "../creatures/creature.js";
import { Food } from "./food.js";
import { Weather } from "./weather.js";
import { Fire } from "./fire.js";
import { Smoke } from "./smoke.js";
import { Structure } from "./structure.js";

export class World {

    constructor(seed) {

        this.seed = seed;

        this.noise = new Noise(seed);

        this.size = 200;

        // 🌍 terrain
        this.heightMap = [];

        // 🧠 entities
        this.creatures = [];
        this.foods = [];
        this.fires = [];
        this.smokes = [];
        this.structures = []; // 🏗 NEW

        // 🧬 tribes
        this.tribes = [];

        // 🧩 buffers
        this.pendingCreatures = [];
        this.pendingFires = [];
        this.pendingSmokes = [];
        this.pendingStructures = [];

        this.isUpdating = false;

        // 🌦 systems
        this.weather = new Weather(seed);

        // 🌍 memory
        this.burnedTiles = new Set();

        this.generate();

        this.spawnInitialCreatures();
        this.spawnInitialFood();
        this.spawnInitialFire();

    }

    // =========================
    // 🌍 GENERATION
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
    // 🌱 SPAWNS
    // =========================

    spawnInitialCreatures() {
        for (let i = 0; i < 25; i++) {
            this.spawnCreature(this.rand(), this.rand());
        }
    }

    spawnInitialFood() {
        for (let i = 0; i < 90; i++) {
            this.foods.push(new Food(this.rand(), this.rand(), this));
        }
    }

    spawnInitialFire() {
        for (let i = 0; i < 2; i++) {
            const x = this.rand();
            const y = this.rand();
            if (!this.isWaterAt(x, y)) {
                this.fires.push(new Fire(x, y, this, 1));
            }
        }
    }

    rand() {
        return Math.floor(Math.random() * this.size);
    }

    // =========================
    // 🧠 SPAWN SYSTEM
    // =========================

    spawnCreature(x, y, parentGenome = null) {

        const c = new Creature(x, y, this, parentGenome);

        if (this.isUpdating) this.pendingCreatures.push(c);
        else this.creatures.push(c);
    }

    spawnStructure(x, y, type, tribe = null) {

        const s = new Structure(x, y, type, tribe);

        if (this.isUpdating) this.pendingStructures.push(s);
        else this.structures.push(s);
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
    // 🌍 TERRAIN
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

    canBuildAt(x, y) {

        if (this.isWaterAt(x, y)) return false;

        // avoid burned zones for stability
        if (this.isBurned(x, y)) return false;

        return true;
    }

    burnTile(x, y) {
        this.burnedTiles.add(`${x},${y}`);
    }

    isBurned(x, y) {
        return this.burnedTiles.has(`${x},${y}`);
    }

    // =========================
    // 🧬 TRIBES
    // =========================

    createTribe() {

        const tribe = {
            id: this.tribes.length,
            members: [],
            sharedMemory: {
                dangerZones: [],
                foodZones: []
            },
            center: { x: 100, y: 100 }
        };

        this.tribes.push(tribe);

        return {
            addMember: (c) => {
                tribe.members.push(c);
                c.tribe = tribe;
            },
            sharedMemory: tribe.sharedMemory,
            territoryCenter: tribe.center
        };
    }

    // =========================
    // 🔁 UPDATE LOOP
    // =========================

    update(delta) {

        this.isUpdating = true;

        this.weather.update(delta);

        for (const f of this.fires) f.update(delta);
        for (const s of this.smokes) s.update(delta);
        for (const f of this.foods) f.update(delta);
        for (const c of this.creatures) c.update(delta);
        for (const s of this.structures) s.update(delta); // 🏗 NEW

        this.creatures = this.creatures.filter(c => c.alive);
        this.foods = this.foods.filter(f => f.alive);
        this.fires = this.fires.filter(f => f.alive);
        this.smokes = this.smokes.filter(s => s.alive);
        this.structures = this.structures.filter(s => s.alive);

        if (this.pendingCreatures.length)
            this.creatures.push(...this.pendingCreatures);

        if (this.pendingFires.length)
            this.fires.push(...this.pendingFires);

        if (this.pendingSmokes.length)
            this.smokes.push(...this.pendingSmokes);

        if (this.pendingStructures.length)
            this.structures.push(...this.pendingStructures);

        this.pendingCreatures = [];
        this.pendingFires = [];
        this.pendingSmokes = [];
        this.pendingStructures = [];

        this.isUpdating = false;

    }

    }
