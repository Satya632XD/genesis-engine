import { Genome } from "./genome.js";
import { Memory } from "./memory.js";

export class Creature {

    constructor(x, y, world, parentGenome = null) {

        this.x = x;
        this.y = y;

        this.world = world;

        // 🧬 genetics
        this.genome = new Genome(parentGenome);

        // 🧠 memory
        this.memory = new Memory();

        // 🧑‍🤝‍🧑 tribe
        this.tribe = null;

        // 🏠 shelter / home structure
        this.homeStructure = null;

        // 🔋 survival stats
        this.energy = 100;
        this.hunger = 0;
        this.age = 0;

        this.state = "wander";
        this.target = null;

        this.size = 3 + this.genome.speed;

        this.alive = true;

        this.reproductionCooldown = 0;
        this.buildCooldown = 0;

    }

    update(delta) {

        if (!this.alive) return;

        this.age += delta;
        this.hunger += delta * 2 * this.genome.metabolism;
        this.energy -= delta * 1.2 * this.genome.metabolism;

        this.reproductionCooldown -= delta;
        this.buildCooldown -= delta;

        this.applyEnvironment(delta);

        if (this.energy <= 0) {
            this.die();
            return;
        }

        this.ai();
        this.move(delta);
        this.tryReproduce();

        this.tryJoinTribe();
        this.syncWithTribe();

    }

    // =========================
    // 🌍 ENVIRONMENT EFFECTS
    // =========================

    applyEnvironment(delta) {

        const weather = this.world.weather;

        for (const fire of this.world.fires) {

            const dx = fire.x - this.x;
            const dy = fire.y - this.y;

            const distSq = dx * dx + dy * dy;

            if (distSq < 200) {

                this.memory.rememberDanger(fire.x, fire.y);

                this.energy -= delta * 10 * (1 - this.genome.fireResistance);

                if (this.genome.fear > 0.5) {
                    this.state = "panic";
                }

            }

        }

        // 🌡 temperature stress
        const shelterBonus = this.isNearStructure(["shelter", "fort"], 16) ? 0.45 : 1;

        if (weather.temperature < 5) {
            this.energy -= delta * (1 - this.genome.coldResistance) * shelterBonus;
        }

        if (weather.temperature > 30) {
            this.energy -= delta * (1 - this.genome.coldResistance) * shelterBonus;
        }

        // 🌧 storm stress
        if (weather.state === "storm") {
            this.energy -= delta * 0.6 * shelterBonus;
        }

    }

    // =========================
    // 🧠 AI CORE
    // =========================

    ai() {

        const weather = this.world.weather;

        // ⚠️ if danger is remembered, avoid it first
        if (this.memory.isDangerNearby(this.x, this.y)) {
            this.state = "avoid";
            this.target = this.findSafeDirection();
            return;
        }

        const fireThreat = this.isNearFire(14);
        const weatherThreat = weather.state === "storm" || weather.state === "rain";

        // 🏠 shelter logic
        if ((fireThreat || weatherThreat) && this.tribe) {

            const shelter = this.findNearestStructure(["shelter", "fort"], 80);

            if (shelter) {
                this.state = "shelter";
                this.target = shelter;
                return;
            }

            if (this.buildCooldown <= 0 && this.energy > 85 && this.hunger < 40) {
                this.buildStructure();
                return;
            }

        }

        // 🍽 hunger logic
        if (this.hunger > 60) {
            this.state = "search_food";
        }

        if (this.state === "search_food") {
            this.target = this.findNearestFood();
        }

        // 🧑‍🤝‍🧑 tribe cohesion: move toward group center when stable
        if (this.tribe && this.tribe.members && this.tribe.members.length > 1) {

            const cx = this.tribe.center ? this.tribe.center.x : this.x;
            const cy = this.tribe.center ? this.tribe.center.y : this.y;

            const dx = cx - this.x;
            const dy = cy - this.y;
            const distSq = dx * dx + dy * dy;

            if (
                distSq > 900 &&
                this.energy > 55 &&
                this.hunger < 45 &&
                this.state !== "search_food"
            ) {
                this.state = "gather";
                this.target = {
                    x: cx + (Math.random() - 0.5) * 12,
                    y: cy + (Math.random() - 0.5) * 12
                };
                return;
            }

        }

        // 🌱 opportunistic tribe building behavior
        if (
            this.tribe &&
            this.buildCooldown <= 0 &&
            this.energy > 90 &&
            this.hunger < 30 &&
            Math.random() < 0.012
        ) {
            this.buildStructure();
            return;
        }

        // 🌍 wander if nothing else
        if (!this.target && Math.random() < 0.02) {

            this.state = "wander";

            this.target = {
                x: this.x + (Math.random() - 0.5) * 50,
                y: this.y + (Math.random() - 0.5) * 50
            };

        }

    }

    // =========================
    // 🧭 FIRE / SAFETY / STRUCTURE HELPERS
    // =========================

    isNearFire(radius = 14) {

        const r2 = radius * radius;

        for (const fire of this.world.fires) {

            const dx = fire.x - this.x;
            const dy = fire.y - this.y;

            if (dx * dx + dy * dy <= r2) return true;

        }

        return false;

    }

    isNearStructure(typeFilter = null, radius = 16) {

        const r2 = radius * radius;

        const list = [];
        if (this.world.structures) list.push(...this.world.structures);
        if (this.world.pendingStructures) list.push(...this.world.pendingStructures);

        for (const s of list) {

            if (!s.alive) continue;

            const matches =
                !typeFilter ||
                (Array.isArray(typeFilter) && typeFilter.includes(s.type)) ||
                (!Array.isArray(typeFilter) && s.type === typeFilter);

            if (!matches) continue;

            const dx = s.x - this.x;
            const dy = s.y - this.y;

            if (dx * dx + dy * dy <= r2) return true;

        }

        return false;

    }

    findNearestStructure(typeFilter = null, maxDist = Infinity) {

        let closest = null;
        let minDist = maxDist * maxDist;

        const list = [];
        if (this.world.structures) list.push(...this.world.structures);
        if (this.world.pendingStructures) list.push(...this.world.pendingStructures);

        for (const s of list) {

            if (!s.alive) continue;

            const matches =
                !typeFilter ||
                (Array.isArray(typeFilter) && typeFilter.includes(s.type)) ||
                (!Array.isArray(typeFilter) && s.type === typeFilter);

            if (!matches) continue;

            const dx = s.x - this.x;
            const dy = s.y - this.y;
            const d = dx * dx + dy * dy;

            if (d < minDist) {
                minDist = d;
                closest = s;
            }

        }

        return closest;

    }

    findSafeDirection() {

        let best = { x: this.x, y: this.y };
        let bestScore = -Infinity;

        for (let i = 0; i < 6; i++) {

            const tx = this.x + (Math.random() - 0.5) * 80;
            const ty = this.y + (Math.random() - 0.5) * 80;

            let score = 0;

            // distance from remembered danger
            for (const d of this.memory.dangerZones) {

                const dx = tx - d.x;
                const dy = ty - d.y;

                score += dx * dx + dy * dy;

            }

            // also prefer being away from fire clusters
            for (const fire of this.world.fires) {

                const dx = tx - fire.x;
                const dy = ty - fire.y;

                score += (dx * dx + dy * dy) * 0.3;

            }

            // avoid water unless forced
            if (this.world.isWaterAt(Math.floor(tx), Math.floor(ty))) {
                score -= 1200;
            }

            if (score > bestScore) {
                bestScore = score;
                best = { x: tx, y: ty };
            }

        }

        return best;

    }

    findNearestFood() {

        let closest = null;
        let minDist = Infinity;

        for (const f of this.world.foods) {

            if (!f.alive) continue;

            const dx = f.x - this.x;
            const dy = f.y - this.y;

            const d = dx * dx + dy * dy;

            if (d < minDist && d < this.genome.vision * this.genome.vision) {

                minDist = d;
                closest = f;

                this.memory.rememberFood(f.x, f.y);
            }

        }

        return closest;

    }

    // =========================
    // 🏗 BUILDING / CULTURE
    // =========================

    buildStructure() {

        if (!this.tribe) return;
        if (this.buildCooldown > 0) return;

        const type = this.chooseStructureType();
        const site = this.findBuildSite(type);

        if (!site) return;

        this.world.spawnStructure(site.x, site.y, type, this.tribe);

        this.buildCooldown = type === "fort" ? 40 : type === "shelter" ? 25 : 18;

        this.energy -= type === "fort" ? 20 : type === "shelter" ? 12 : 8;
        if (this.energy < 0) this.energy = 0;

        this.state = "build";
        this.target = {
            x: site.x,
            y: site.y
        };

        // remember the site as a safe zone for the whole group
        if (this.tribe.sharedMemory) {
            this.tribe.sharedMemory.foodZones.push({ x: site.x, y: site.y, strength: 0.2 });
        }

    }

    chooseStructureType() {

        const tribeSize = this.tribe && this.tribe.members ? this.tribe.members.length : 1;

        if (tribeSize <= 2) return "nest";
        if (tribeSize <= 6) return "shelter";

        if (this.genome.aggression > 0.6 || tribeSize > 10) return "fort";
        if (this.genome.fear > 0.55) return "shelter";

        return "shelter";

    }

    findBuildSite(type) {

        const baseX = this.tribe && this.tribe.center ? this.tribe.center.x : this.x;
        const baseY = this.tribe && this.tribe.center ? this.tribe.center.y : this.y;

        const range =
            type === "fort" ? 16 :
            type === "shelter" ? 12 : 8;

        for (let i = 0; i < 20; i++) {

            const tx = Math.floor(baseX + (Math.random() - 0.5) * range * 2);
            const ty = Math.floor(baseY + (Math.random() - 0.5) * range * 2);

            if (tx < 0 || ty < 0 || tx >= this.world.size || ty >= this.world.size) continue;
            if (!this.world.canBuildAt(tx, ty)) continue;
            if (this.isOccupiedByStructure(tx, ty, 4)) continue;

            return { x: tx, y: ty };

        }

        return null;

    }

    isOccupiedByStructure(x, y, radius = 4) {

        const r2 = radius * radius;

        const structures = [];
        if (this.world.structures) structures.push(...this.world.structures);
        if (this.world.pendingStructures) structures.push(...this.world.pendingStructures);

        for (const s of structures) {

            const dx = s.x - x;
            const dy = s.y - y;

            if (dx * dx + dy * dy <= r2) return true;

        }

        return false;

    }

    // =========================
    // 🚶 MOVEMENT
    // =========================

    move(delta) {

        if (!this.target) return;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {

            if (this.target.type) {
                this.homeStructure = this.target;
                this.state = "shelter";
                this.target = null;
                return;
            }

            if (this.target.energy !== undefined) {

                const eaten = this.target.consume(12);

                this.energy += eaten;
                this.hunger -= eaten;

                if (this.hunger < 0) this.hunger = 0;

                // food spot becomes valuable memory
                this.memory.rememberFood(this.target.x, this.target.y);

            }

            this.target = null;
            return;

        }

        const speed = this.genome.speed * 0.6;

        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;

    }

    // =========================
    // 🧬 REPRODUCTION
    // =========================

    tryReproduce() {

        if (this.reproductionCooldown > 0) return;
        if (this.energy < 70) return;
        if (this.hunger > 40) return;

        if (Math.random() < 0.01) {

            this.reproductionCooldown = 20;

            this.energy *= 0.6;

            this.world.spawnCreature(
                this.x + (Math.random() - 0.5) * 5,
                this.y + (Math.random() - 0.5) * 5,
                this.genome
            );

        }

    }

    // =========================
    // 🧑‍🤝‍🧑 TRIBE SYSTEM
    // =========================

    tryJoinTribe() {

        if (this.tribe) return;

        for (const other of this.world.creatures) {

            if (other === this || !other.tribe) continue;

            const dx = other.x - this.x;
            const dy = other.y - this.y;

            if (dx * dx + dy * dy < 100) {

                other.tribe.addMember(this);
                return;

            }

        }

        if (Math.random() < 0.002) {

            const tribe = this.world.createTribe();
            tribe.addMember(this);

        }

    }

    syncWithTribe() {

        if (!this.tribe) return;

        const tribe = this.tribe;

        // sync knowledge into tribe shared memory
        if (tribe.sharedMemory) {

            for (const d of this.memory.dangerZones) {
                tribe.sharedMemory.dangerZones.push({ x: d.x, y: d.y, strength: d.strength || 1 });
            }

            for (const f of this.memory.foodZones) {
                tribe.sharedMemory.foodZones.push({ x: f.x, y: f.y, strength: f.strength || 1 });
            }

            if (tribe.sharedMemory.dangerZones.length > 120) {
                tribe.sharedMemory.dangerZones.splice(0, tribe.sharedMemory.dangerZones.length - 120);
            }

            if (tribe.sharedMemory.foodZones.length > 120) {
                tribe.sharedMemory.foodZones.splice(0, tribe.sharedMemory.foodZones.length - 120);
            }

        }

        // tribe center follows members
        if (tribe.members && tribe.members.length) {

            let sumX = 0;
            let sumY = 0;
            let aliveCount = 0;

            for (const member of tribe.members) {
                if (!member.alive) continue;
                sumX += member.x;
                sumY += member.y;
                aliveCount++;
            }

            if (aliveCount > 0) {
                tribe.center.x = sumX / aliveCount;
                tribe.center.y = sumY / aliveCount;
            }

        }

        // if group has shelter memory, prefer staying near it
        const nearestShelter = this.findNearestStructure(["shelter", "fort"], 40);
        if (nearestShelter && this.energy > 60 && this.hunger < 35 && Math.random() < 0.02) {
            this.homeStructure = nearestShelter;
        }

    }

    // =========================
    // 💀 DEATH
    // =========================

    die() {

        // spread danger memory to tribe members
        if (this.tribe && this.tribe.members) {
            for (const member of this.tribe.members) {
                if (member !== this && member.alive) {
                    member.memory.rememberDanger(this.x, this.y);
                }
            }
        }

        this.alive = false;

    }

}
