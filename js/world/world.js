import { Noise } from "./noise.js";
import { Dinosaur } from "../creatures/dinosaur.js";
import { Food } from "./food.js";
import { Weather } from "./weather.js";

export class World {

    constructor(seed) {

        this.seed = seed;

        this.noise = new Noise(seed);

        this.size = 200;

        this.heightMap = [];

        this.creatures = [];
        this.foods = [];

        // 🌦 WEATHER SYSTEM
        this.weather = new Weather(seed);

        this.generate();

        this.spawnCreatures();
        this.spawnFood();

    }

    generate() {

        for (let x = 0; x < this.size; x++) {

            this.heightMap[x] = [];

            for (let y = 0; y < this.size; y++) {

                const nx = x / 50;
                const ny = y / 50;

                this.heightMap[x][y] =
                    this.noise.fbm(nx, ny, 5);

            }

        }

    }

    spawnCreatures() {

        for (let i = 0; i < 20; i++) {

            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);

            this.creatures.push(
                new Dinosaur(x, y, this)
            );

        }

    }

    spawnFood() {

        for (let i = 0; i < 80; i++) {

            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);

            this.foods.push(
                new Food(x, y, this)
            );

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

    update(delta) {

        // 🌦 update weather FIRST
        this.weather.update(delta);

        // 🌿 update food (growth affected later)
        for (const f of this.foods) {
            f.update(delta);
        }

        // 🦖 update creatures (weather affects behavior later)
        for (const c of this.creatures) {
            c.update(delta);
        }

        // ☠ cleanup dead food
        this.foods = this.foods.filter(f => f.alive);

    }

}
