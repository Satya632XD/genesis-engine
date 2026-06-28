import { Smoke } from "./smoke.js";

export class Fire {

    constructor(x, y, world, intensity = 1) {

        this.x = x;
        this.y = y;

        this.world = world;

        this.intensity = intensity;

        this.radius = 2 + intensity * 2;

        this.age = 0;
        this.alive = true;

        this.spreadTimer = 0;
        this.smokeTimer = 0;

    }

    update(delta) {

        if (!this.alive) return;

        this.age += delta;
        this.spreadTimer += delta;
        this.smokeTimer += delta;

        const weather = this.world.weather;

        // 🌧 Rain extinguishes fire strongly
        if (weather.state === "rain") {
            this.intensity -= delta * 0.6;
        } else if (weather.state === "storm") {
            this.intensity -= delta * 0.9;
        } else {
            this.intensity -= delta * 0.08;
        }

        // 🌪 wind influence
        const windX = weather.wind * 0.6;
        const windY = weather.wind * 0.2;

        // 🔥 burn terrain
        this.burnTerrain();

        // 🌿 burn food
        this.burnFood(delta);

        // 🦖 burn creatures
        this.burnCreatures(delta);

        // 🌫 smoke generation
        this.spawnSmoke();

        // 🔁 fire spread
        if (this.spreadTimer >= 1.0 && this.intensity > 0.25) {

            this.spreadTimer = 0;

            const baseChance =
                weather.state === "clear" ? 0.5 :
                weather.state === "rain" ? 0.1 :
                0.2;

            if (Math.random() < baseChance) {

                const angle = Math.random() * Math.PI * 2;

                const distance = 4 + Math.random() * 8;

                const nx = this.x + Math.cos(angle) * distance + windX;
                const ny = this.y + Math.sin(angle) * distance + windY;

                if (this.world.canBurnAt(nx, ny)) {
                    this.world.spawnFire(nx, ny, this.intensity * 0.75);
                }

            }

        }

        // 🌊 water extinguishes faster
        if (this.world.isWaterAt(this.x, this.y)) {
            this.intensity -= delta * 1.8;
        }

        if (this.intensity <= 0.05) {
            this.alive = false;
        }

    }

    spawnSmoke() {

        if (Math.random() < 0.4) {

            this.world.smokes.push(
                new Smoke(
                    this.x + (Math.random() - 0.5),
                    this.y + (Math.random() - 0.5),
                    this.world,
                    this.intensity
                )
            );

        }

    }

    burnTerrain() {

        const r = Math.floor(this.radius);

        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {

                const px = Math.floor(this.x + dx);
                const py = Math.floor(this.y + dy);

                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= this.radius) {
                    this.world.burnTile(px, py);
                }

            }
        }

    }

    burnFood(delta) {

        for (const food of this.world.foods) {

            if (!food.alive) continue;

            const dx = food.x - this.x;
            const dy = food.y - this.y;

            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 8) {
                food.energy -= delta * 30 * this.intensity;
                if (food.energy <= 0) {
                    food.alive = false;
                }
            }

        }

    }

    burnCreatures(delta) {

        for (const creature of this.world.creatures) {

            if (!creature.alive) continue;

            const dx = creature.x - this.x;
            const dy = creature.y - this.y;

            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                creature.energy -= delta * 25 * this.intensity;
                creature.hunger += delta * 6 * this.intensity;
            }

        }

    }

        }
