import { Noise } from "./noise.js";

export class World {

    constructor(seed) {

        this.seed = seed;

        this.noise = new Noise(seed);

        this.size = 200;

        this.heightMap = [];

        this.generate();

    }

    generate() {

        for (let x = 0; x < this.size; x++) {

            this.heightMap[x] = [];

            for (let y = 0; y < this.size; y++) {

                const nx = x / 50;
                const ny = y / 50;

                const elevation =
                this.noise.fbm(nx, ny, 5);

                this.heightMap[x][y] =
                elevation;

            }

        }

    }

    getHeight(x, y) {

        if (
            x < 0 || y < 0 ||
            x >= this.size ||
            y >= this.size
        ) return 0;

        return this.heightMap[x][y];

    }

}
