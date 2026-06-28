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

        // 🧬 tribe
        this.tribe = null;

        // 🔋 survival stats
        this.energy = 100;
        this.hunger = 0;
        this.age = 0;

        this.state = "wander";
        this.target = null;

        this.size = 3 + this.genome.speed;

        this.alive = true;

        this.reproductionCooldown = 0;

    }

    update(delta) {

        if (!this.alive) return;

        this.age += delta;
        this.hunger += delta * 2 * this.genome.metabolism;
        this.energy -= delta * 1.2 * this.genome.metabolism;

        this.reproductionCooldown -= delta;

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

        for (const fire of this.world.fires) {

            const dx = fire.x - this.x;
            const dy = fire.y - this.y;

            const dist = dx * dx + dy * dy;

            if (dist < 200) {

                this.memory.rememberDanger(fire.x, fire.y);

                this.energy -= delta * 10 * (1 - this.genome.fireResistance);

                if (this.genome.fear > 0.5) {
                    this.state = "panic";
                }

            }

        }

    }

    // =========================
    // 🧠 AI CORE
    // =========================

    ai() {

        if (this.memory.isDangerNearby(this.x, this.y)) {
            this.state = "avoid";
            this.target = this.findSafeDirection();
            return;
        }

        if (this.hunger > 60) {
            this.state = "search_food";
        }

        if (this.state === "search_food") {
            this.target = this.findNearestFood();
        }

        if (!this.target && Math.random() < 0.02) {

            this.state = "wander";

            this.target = {
                x: this.x + (Math.random() - 0.5) * 50,
                y: this.y + (Math.random() - 0.5) * 50
            };

        }

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

            if (this.target.energy !== undefined) {

                const eaten = this.target.consume(12);

                this.energy += eaten;
                this.hunger -= eaten;

                if (this.hunger < 0) this.hunger = 0;

            }

            this.target = null;
            return;

        }

        const speed = this.genome.speed * 0.6;

        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;

    }

    findNearestFood() {

        let closest = null;
        let minDist = Infinity;

        for (const f of this.world.foods) {

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

    findSafeDirection() {

        let best = { x: this.x, y: this.y };
        let bestScore = -Infinity;

        for (let i = 0; i < 6; i++) {

            const tx = this.x + (Math.random() - 0.5) * 80;
            const ty = this.y + (Math.random() - 0.5) * 80;

            let score = 0;

            for (const d of this.memory.dangerZones) {

                const dx = tx - d.x;
                const dy = ty - d.y;

                score += dx * dx + dy * dy;

            }

            if (score > bestScore) {
                bestScore = score;
                best = { x: tx, y: ty };
            }

        }

        return best;

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
    // 🧠 TRIBE SYSTEM
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

        for (const d of this.tribe.sharedMemory.dangerZones) {
            this.memory.rememberDanger(d.x, d.y);
        }

        for (const f of this.tribe.sharedMemory.foodZones) {
            this.memory.rememberFood(f.x, f.y);
        }

    }

    // =========================
    // 💀 DEATH
    // =========================

    die() {

        this.alive = false;
    }

                }
