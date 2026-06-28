export class Smoke {

    constructor(x, y, world, intensity = 1) {

        this.x = x;
        this.y = y;

        this.world = world;

        this.intensity = intensity;

        this.life = 1;

        this.size = 2 + Math.random() * 3;

        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -Math.random() * 0.5;

        this.alive = true;

    }

    update(delta) {

        const weather = this.world.weather;

        // 🌪 wind affects smoke direction
        this.vx += weather.wind * 0.01;

        this.x += this.vx;
        this.y += this.vy;

        this.vy -= delta * 0.02; // rise effect

        this.life -= delta * 0.2;

        // 🌧 rain destroys smoke faster
        if (weather.state === "rain") {
            this.life -= delta * 0.4;
        }

        if (weather.state === "storm") {
            this.life -= delta * 0.3;
        }

        if (this.life <= 0) {
            this.alive = false;
        }

    }

}
