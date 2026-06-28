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

        // 🌧 Rain weakens fire
        if (weather.state === "rain") {
            this.intensity -= delta * 0.35;
        } else if (weather.state === "storm") {
            this.intensity -= delta * 0.6;
        } else {
            this.intensity -= delta * 0.05;
        }

        // 🌪 Wind can push fire spread direction
        const windX = weather.wind * 0.8;
        const windY = weather.wind * 0.3;

        // 🔥 Burn nearby terrain tiles
        this.burnTerrain();

        // 🌿 Burn nearby food
        this.burnFood(delta);

        // 🦖 Burn nearby creatures
        this.burnCreatures(delta);

        // 🔁 Spread fire periodically
        if (this.spreadTimer >= 1.2 && this.intensity > 0.25) {

            this.spreadTimer = 0;

            const chance = weather.state === "clear" ? 0.45 : 0.15;

            if (Math.random() < chance) {

                const angle = Math.random() * Math.PI * 2;

                const distance = 4 + Math.random() * 6;

                const nx = this.x + Math.cos(angle) * distance + windX;
                const ny = this.y + Math.sin(angle) * distance + windY;

                if (this.world.canBurnAt(nx, ny)) {
                    this.world.spawnFire(nx, ny, this.intensity * 0.7);
                }

            }

        }

        // 🧯 Fire dies out
        if (this.intensity <= 0.05) {
            this.alive = false;
        }

        // 🌊 Water / wet zones extinguish fire faster
        if (this.world.isWaterAt(this.x, this.y)) {
            this.intensity -= delta * 1.5;
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
                food.energy -= delta * 25 * this.intensity;
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
                creature.energy -= delta * 20 * this.intensity;
                creature.hunger += delta * 5 * this.intensity;
            }

        }

    }

}
