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

        const weather = this.world.weather;

        // 🌧 rain boosts growth
        if (weather.state === "rain") {
            this.growth += delta * 0.02;
        }

        // 🌪 storm slows growth
        if (weather.state === "storm") {
            this.growth += delta * 0.005;
        }

        // 🌱 normal growth
        if (weather.state === "clear") {
            this.growth += delta * 0.01;
        }

        // 🌿 cap growth
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
