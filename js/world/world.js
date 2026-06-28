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

        // 🧠 living systems
        this.creatures = [];
        this.foods = [];
        this.fires = [];
        this.smokes = [];
        this.structures = [];

        // 🧑‍🤝‍🧑 tribes / culture
        this.tribes = [];

        // 🧩 spawn buffers
        this.pendingCreatures = [];
        this.pendingFires = [];
        this.pendingSmokes = [];
        this.pendingStructures = [];

        this.isUpdating = false;

        // 🌦 environment
        this.weather = new Weather(seed);

        // 🔥 world memory
        this.burnedTiles = new Set();

        // ⏱ culture / ecosystem pacing
        this.simulationTime = 0;
        this.tribePulseTimer = 0;

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

                // heightmap foundation
                this.heightMap[x][y] = this.noise.fbm(nx, ny, 5);

            }

        }

    }

    // =========================
    // 🌱 INITIAL SPAWNS
    // =========================

    spawnInitialCreatures() {

        for (let i = 0; i < 25; i++) {
            this.spawnCreature(this.randTile(), this.randTile());
        }

    }

    spawnInitialFood() {

        for (let i = 0; i < 90; i++) {
            this.foods.push(new Food(this.randTile(), this.randTile(), this));
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
    // 🧠 SPAWN SYSTEM
    // =========================

    spawnCreature(x, y, parentGenome = null) {

        const creature = new Creature(x, y, this, parentGenome);

        if (this.isUpdating) this.pendingCreatures.push(creature);
        else this.creatures.push(creature);

        return creature;

    }

    spawnStructure(x, y, type, tribe = null) {

        const structure = new Structure(x, y, type, tribe);

        if (this.isUpdating) this.pendingStructures.push(structure);
        else this.structures.push(structure);

        return structure;

    }

    spawnFire(x, y, intensity = 1) {

        const fire = new Fire(x, y, this, intensity);

        if (this.isUpdating) this.pendingFires.push(fire);
        else this.fires.push(fire);

        return fire;

    }

    spawnSmoke(x, y, intensity = 1) {

        const smoke = new Smoke(x, y, this, intensity);

        if (this.isUpdating) this.pendingSmokes.push(smoke);
        else this.smokes.push(smoke);

        return smoke;

    }

    // =========================
    // 🌍 TERRAIN
    // =========================

    getHeight(x, y) {

        const ix = Math.floor(x);
        const iy = Math.floor(y);

        if (
            ix < 0 || iy < 0 ||
            ix >= this.size || iy >= this.size
        ) return 0;

        return this.heightMap[ix][iy];

    }

    isWaterAt(x, y) {
        return this.getHeight(x, y) < 0.3;
    }

    canBurnAt(x, y) {
        return !this.isWaterAt(x, y);
    }

    burnTile(x, y) {
        this.burnedTiles.add(`${x},${y}`);
    }

    isBurned(x, y) {
        return this.burnedTiles.has(`${x},${y}`);
    }

    canBuildAt(x, y, tribe = null) {

        if (
            x < 0 || y < 0 ||
            x >= this.size || y >= this.size
        ) return false;

        if (this.isWaterAt(x, y)) return false;
        if (this.isBurned(x, y)) return false;

        // avoid piling structures too tightly
        if (this.getStructureDensity(x, y, 5) > 0) return false;

        // if tribe is provided, prefer territory but do not hard-block expansion
        if (tribe && tribe.center) {

            const dx = x - tribe.center.x;
            const dy = y - tribe.center.y;
            const distSq = dx * dx + dy * dy;

            const territoryRadius = tribe.territoryRadius || 30;

            // inside territory = ideal
            if (distSq <= territoryRadius * territoryRadius) {
                return true;
            }

            // outside territory still allowed sometimes for expansionist tribes
            const expansionBias = tribe.culture?.expansionism ?? 0.35;
            if (expansionBias < 0.2) {
                return false;
            }

        }

        return true;

    }

    getStructureDensity(x, y, radius = 8) {

        const r2 = radius * radius;
        let count = 0;

        for (const s of this.structures) {

            if (!s.alive) continue;

            const dx = s.x - x;
            const dy = s.y - y;

            if (dx * dx + dy * dy <= r2) count++;

        }

        for (const s of this.pendingStructures) {

            if (!s.alive) continue;

            const dx = s.x - x;
            const dy = s.y - y;

            if (dx * dx + dy * dy <= r2) count++;

        }

        return count;

    }

    getStructuresNear(x, y, radius = 20) {

        const r2 = radius * radius;
        const list = [];

        for (const s of this.structures) {

            if (!s.alive) continue;

            const dx = s.x - x;
            const dy = s.y - y;

            if (dx * dx + dy * dy <= r2) {
                list.push(s);
            }

        }

        for (const s of this.pendingStructures) {

            if (!s.alive) continue;

            const dx = s.x - x;
            const dy = s.y - y;

            if (dx * dx + dy * dy <= r2) {
                list.push(s);
            }

        }

        return list;

    }

    // =========================
    // 🧑‍🤝‍🧑 TRIBES / CULTURE
    // =========================

    createTribe() {

        const tribe = {
            id: this.tribes.length,
            members: [],
            center: { x: 0, y: 0 },
            territoryCenter: { x: 0, y: 0 },
            territoryRadius: 30,
            homeStructures: [],
            safeZones: [],
            culture: {
                settlement: 0.15,
                expansionism: 0.35,
                defensiveness: 0.35,
                foodPreference: 0.35,
                fireFear: 0.45,
                cooperation: 0.4
            },
            sharedMemory: {
                dangerZones: [],
                foodZones: []
            },

            addMember: (creature) => {

                if (!tribe.members.includes(creature)) {
                    tribe.members.push(creature);
                }

                creature.tribe = tribe;

                // initial tribe center lock if empty
                if (tribe.members.length === 1) {
                    tribe.center.x = creature.x;
                    tribe.center.y = creature.y;
                    tribe.territoryCenter.x = creature.x;
                    tribe.territoryCenter.y = creature.y;
                }

            },

            removeMember: (creature) => {

                tribe.members = tribe.members.filter(c => c !== creature);

                if (creature.tribe === tribe) {
                    creature.tribe = null;
                }

            },

            shareKnowledge: () => {

                // merge member memories into tribe memory
                for (const member of tribe.members) {

                    if (!member.memory) continue;

                    for (const d of member.memory.dangerZones) {
                        tribe.sharedMemory.dangerZones.push({
                            x: d.x,
                            y: d.y,
                            strength: d.strength || 1
                        });
                    }

                    for (const f of member.memory.foodZones) {
                        tribe.sharedMemory.foodZones.push({
                            x: f.x,
                            y: f.y,
                            strength: f.strength || 1
                        });
                    }

                }

                // cap memory size
                if (tribe.sharedMemory.dangerZones.length > 120) {
                    tribe.sharedMemory.dangerZones.splice(0, tribe.sharedMemory.dangerZones.length - 120);
                }

                if (tribe.sharedMemory.foodZones.length > 120) {
                    tribe.sharedMemory.foodZones.splice(0, tribe.sharedMemory.foodZones.length - 120);
                }

            }

        };

        this.tribes.push(tribe);
        return tribe;

    }

    updateTribes(delta) {

        for (const tribe of this.tribes) {

            if (!tribe) continue;

            // remove dead or missing members
            tribe.members = tribe.members.filter(member => member && member.alive);

            // if tribe dies out, keep its memory but slow decay
            if (tribe.members.length === 0) {
                tribe.territoryRadius = Math.max(10, tribe.territoryRadius - delta * 0.5);
                continue;
            }

            // recalculate center
            let sumX = 0;
            let sumY = 0;

            for (const member of tribe.members) {
                sumX += member.x;
                sumY += member.y;
            }

            tribe.center.x = sumX / tribe.members.length;
            tribe.center.y = sumY / tribe.members.length;

            tribe.territoryCenter.x = tribe.center.x;
            tribe.territoryCenter.y = tribe.center.y;

            // structure influence around tribe
            const nearbyStructures = this.getStructuresNear(tribe.center.x, tribe.center.y, 80);
            tribe.homeStructures = nearbyStructures.filter(s => s.ownerTribe === tribe);

            // culture scoring based on members + structures + survival context
            const memberCount = tribe.members.length;
            const structureCount = tribe.homeStructures.length;

            const foodNearby = tribe.sharedMemory.foodZones.length;
            const dangerNearby = tribe.sharedMemory.dangerZones.length;

            tribe.culture.settlement = this.clamp01(
                0.12 +
                memberCount * 0.02 +
                structureCount * 0.05 -
                dangerNearby * 0.001
            );

            tribe.culture.expansionism = this.clamp01(
                0.25 +
                Math.max(0, memberCount - 3) * 0.03 +
                structureCount * 0.01
            );

            tribe.culture.defensiveness = this.clamp01(
                0.18 +
                dangerNearby * 0.002 +
                structureCount * 0.03
            );

            tribe.culture.foodPreference = this.clamp01(
                0.2 +
                foodNearby * 0.002 +
                Math.min(1, memberCount * 0.03)
            );

            tribe.culture.fireFear = this.clamp01(
                0.25 +
                dangerNearby * 0.003 +
                (this.countRecentFiresNear(tribe.center.x, tribe.center.y, 60) * 0.02)
            );

            tribe.culture.cooperation = this.clamp01(
                0.25 +
                memberCount * 0.02 +
                structureCount * 0.03
            );

            tribe.territoryRadius = this.clamp(
                22 + memberCount * 2.5 + structureCount * 1.5,
                18,
                90
            );

            // natural clearing / safe zone behavior
            if (structureCount > 0) {
                tribe.safeZones = nearbyStructures.map(s => ({ x: s.x, y: s.y, type: s.type }));
            }

            // memory sharing pulse, not every frame if we can avoid it
            tribe._shareTimer = (tribe._shareTimer || 0) + delta;
            if (tribe._shareTimer >= 2.0) {
                tribe._shareTimer = 0;
                tribe.shareKnowledge();
            }

            // prune tribal memory so it does not grow forever
            if (tribe.sharedMemory.dangerZones.length > 120) {
                tribe.sharedMemory.dangerZones.splice(0, tribe.sharedMemory.dangerZones.length - 120);
            }

            if (tribe.sharedMemory.foodZones.length > 120) {
                tribe.sharedMemory.foodZones.splice(0, tribe.sharedMemory.foodZones.length - 120);
            }

        }

    }

    isInTribeTerritory(tribe, x, y) {

        if (!tribe) return false;

        const dx = x - tribe.territoryCenter.x;
        const dy = y - tribe.territoryCenter.y;

        return dx * dx + dy * dy <= tribe.territoryRadius * tribe.territoryRadius;

    }

    countRecentFiresNear(x, y, radius = 60) {

        const r2 = radius * radius;
        let count = 0;

        for (const fire of this.fires) {

            const dx = fire.x - x;
            const dy = fire.y - y;

            if (dx * dx + dy * dy <= r2) count++;

        }

        return count;

    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    clamp01(value) {
        return this.clamp(value, 0, 1);
    }

    // =========================
    // 🔁 MAIN UPDATE LOOP
    // =========================

    update(delta) {

        this.isUpdating = true;
        this.simulationTime += delta;
        this.tribePulseTimer += delta;

        // 🌦 weather first
        this.weather.update(delta);

        // 🔥 fires
        for (const fire of this.fires) fire.update(delta);

        // 🌫 smoke
        for (const smoke of this.smokes) smoke.update(delta);

        // 🌱 food
        for (const food of this.foods) food.update(delta);

        // 🏗 structures
        for (const structure of this.structures) structure.update(delta);

        // 🦖 creatures
        for (const creature of this.creatures) creature.update(delta);

        // 🧑‍🤝‍🧑 tribe culture system
        this.updateTribes(delta);

        // 🧹 cleanup dead objects
        this.creatures = this.creatures.filter(c => c.alive);
        this.foods = this.foods.filter(f => f.alive);
        this.fires = this.fires.filter(f => f.alive);
        this.smokes = this.smokes.filter(s => s.alive);
        this.structures = this.structures.filter(s => s.alive);

        // ➕ flush buffers
        if (this.pendingCreatures.length) {
            this.creatures.push(...this.pendingCreatures);
        }

        if (this.pendingFires.length) {
            this.fires.push(...this.pendingFires);
        }

        if (this.pendingSmokes.length) {
            this.smokes.push(...this.pendingSmokes);
        }

        if (this.pendingStructures.length) {
            this.structures.push(...this.pendingStructures);
        }

        this.pendingCreatures = [];
        this.pendingFires = [];
        this.pendingSmokes = [];
        this.pendingStructures = [];

        this.isUpdating = false;

    }

}
