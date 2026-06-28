import { Genome } from "./genome.js";

export class Creature {

    constructor(x, y, world, parentGenome = null) {

        this.x = x;
        this.y = y;

        this.world = world;

        // 🧬 evolution system
        this.genome = new Genome(parentGenome);

        this.energy = 100;
        this.hunger = 0;

        this.age = 0;

        this.state = "wander";

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

        this.applyEnvironmentEffects(delta);

        if (this.energy <= 0) {
            this.die();
            return;
        }

        this.ai();
        this.move(delta);
        this.tryReproduce();

    }

    applyEnvironmentEffects(delta) {

        const weather = this.world.weather;

        // 🌦 temperature stress
        if (weather.temperature < 5) {
            this.energy -= delta * (1 - this.genome.coldResistance);
        }

        if (weather.temperature > 30) {
            this.energy -= delta * (1 - this.genome.coldResistance);
        }

        // 🔥 fire survival advantage
        for (const fire of this.world.fires) {

            const dx = fire.x - this.x;
            const dy = fire.y - this.y;

            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 12) {

                const damage =
                    delta * 12 *
                    (1 - this.genome.fireResistance);

                this.energy -= damage;

                if (this.genome.fear > 0.5) {
                    this.state = "panic";
                    this.speed = this.genome.speed * 1.5;
                }

            }

        }

    }

    ai() {

        if (this.hunger > 60) {
            this.state = "search_food";
        }

        if (this.state === "search_food") {
            this.target = this.findNearestFood();
        }

        if (!this.target && Math.random() < 0.02) {
            this.state = "wander";

            this.target = {
                x: this.x + (Math.random() - 0.5) * 40,
                y: this.y + (Math.random() - 0.5) * 40
            };
        }

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
            }

        }

        return closest;

    }

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

    die() {
        this.alive = false;
    }

}
