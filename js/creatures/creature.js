export class Creature {

    constructor(x, y, world) {

        this.x = x;
        this.y = y;

        this.world = world;

        // 🧠 basic stats
        this.energy = 100;
        this.hunger = 0;

        this.speed = 0.5;

        this.direction = Math.random() * Math.PI * 2;

        this.size = 4;

        this.alive = true;

        // AI state
        this.state = "wander";

        this.targetX = x;
        this.targetY = y;

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

        // 🧠 BASIC SURVIVAL AI

        if (this.hunger > 50) {
            this.state = "search_food";
        }

        if (this.hunger > 100) {
            this.state = "panic";
        }

        if (this.state === "wander") {

            if (Math.random() < 0.01) {

                this.targetX = this.x + (Math.random() - 0.5) * 50;
                this.targetY = this.y + (Math.random() - 0.5) * 50;

            }

        }

        if (this.state === "search_food") {

            this.targetX += (Math.random() - 0.5) * 2;
            this.targetY += (Math.random() - 0.5) * 2;

        }

    }

    move(delta) {

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {

            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;

        }

    }

    eat(amount) {

        this.hunger -= amount;
        this.energy += amount;

        if (this.hunger < 0) this.hunger = 0;

    }

    die() {

        this.alive = false;

    }

}
