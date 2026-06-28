export class Creature {

    constructor(x, y, world) {

        this.x = x;
        this.y = y;

        this.world = world;

        this.energy = 100;
        this.hunger = 0;

        this.speed = 0.6;

        this.target = null;

        this.size = 4;

        this.alive = true;

    }

    update(delta) {

        if (!this.alive) return;

        this.hunger += delta * 2;
        this.energy -= delta * 1;

        if (this.energy <= 0) {
            this.die();
            return;
        }

        this.ai();

        this.move(delta);

    }

    ai() {

        // ☠ starvation behavior
        if (this.hunger > 60) {
            this.state = "search_food";
        }

        // 🌿 find nearest food
        if (this.state === "search_food" || this.hunger > 30) {

            this.target = this.findNearestFood();

        }

        // 🧭 wander if no food found
        if (!this.target) {

            if (Math.random() < 0.02) {

                this.target = {
                    x: this.x + (Math.random() - 0.5) * 40,
                    y: this.y + (Math.random() - 0.5) * 40
                };

            }

        }

    }

    findNearestFood() {

        let closest = null;
        let minDist = Infinity;

        for (const f of this.world.foods) {

            const dx = f.x - this.x;
            const dy = f.y - this.y;

            const d = dx * dx + dy * dy;

            if (d < minDist) {

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

            // 🍽 EAT IF FOOD
            if (this.target.energy !== undefined) {

                const eaten = this.target.consume(10);

                this.energy += eaten;
                this.hunger -= eaten;

            }

            this.target = null;

            return;

        }

        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;

    }

    die() {
        this.alive = false;
    }

}
