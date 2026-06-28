import { Noise } from "./noise.js";
import { Dinosaur } from "../creatures/dinosaur.js";

export class World {

    constructor(seed) {

        this.seed = seed;

        this.noise = new Noise(seed);

        this.size = 200;

        this.heightMap = [];

        this.creatures = [];

        this.generate();
        this.spawnCreatures();

    }

    // 🌍 TERRAIN GENERATION
    generate() {

        for (let x = 0; x < this.size; x++) {

            this.heightMap[x] = [];

            for (let y = 0; y < this.size; y++) {

                const nx = x / 50;
                const ny = y / 50;

                const elevation =
                    this.noise.fbm(nx, ny, 5);

                this.heightMap[x][y] = elevation;

            }

        }

    }

    // 🦖 SPAWN INITIAL LIFE
    spawnCreatures() {

        for (let i = 0; i < 20; i++) {

            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);

            this.creatures.push(
                new Dinosaur(x, y, this)
            );

        }

    }

    // 📊 HEIGHT ACCESS
    getHeight(x, y) {

        if (
            x < 0 || y < 0 ||
            x >= this.size ||
            y >= this.size
        ) return 0;

        return this.heightMap[x][y];

    }

    // 🔁 UPDATE ALL CREATURES
    update(delta) {

        for (const c of this.creatures) {
            c.update(delta);
        }

    }

}
