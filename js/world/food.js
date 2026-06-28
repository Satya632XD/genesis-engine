export class Food {

    constructor(x, y, world) {

        this.x = x;
        this.y = y;

        this.world = world;

        this.energy = 30;

        this.size = 2;

        this.alive = true;

        this.growth = Math.random();

    }

    update(delta) {

        if (!this.alive) return;

        // 🌱 slow regrowth simulation
        this.growth += delta * 0.01;

        if (this.growth > 1) {
            this.energy = 30;
            this.growth = 1;
        }

    }

    consume(amount) {

        this.energy -= amount;

        if (this.energy <= 0) {
            this.alive = false;
        }

        return amount;
    }

}
