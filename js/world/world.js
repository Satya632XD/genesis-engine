import { Noise } from "./noise.js";
import { Dinosaur } from "../creatures/dinosaur.js";
import { Food } from "./food.js";
import { Weather } from "./weather.js";
import { Fire } from "./fire.js";
import { Smoke } from "./smoke.js";

export class World {

    constructor(seed) {

        this.seed = seed;

        this.noise = new Noise(seed);

        this.size = 200;

        this.heightMap = [];

        this.creatures = [];
        this.foods = [];
        this.fires = [];
        this.smokes = [];

        this.pendingFires = [];
        this.pendingSmokes = [];

        this.isUpdating = false;

        this.weather = new Weather(seed);

        this.burnedTiles = new Set();

        this.generate();

        this.spawnCreatures();
        this.spawnFood();
        this.spawnInitialFire();

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

            this.creatures.push(new Dinosaur(x, y, this));

        }

    }

    spawnFood() {

        for (let i = 0; i < 80; i++) {

            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);

            this.foods.push(new Food(x, y, this));

        }

    }

    spawnInitialFire() {

        for (let i = 0; i < 2; i++) {

            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);

            if (!this.isWaterAt(x, y)) {
                this.fires.push(new Fire(x, y, this, 1));
            }

        }

    }

    spawnFire(x, y, intensity = 1) {

        const fire = new Fire(x, y, this, intensity);

        if (this.isUpdating) {
            this.pendingFires.push(fire);
        } else {
            this.fires.push(fire);
        }

    }

    burnTile(x, y) {

        if (
            x < 0 || y < 0 ||
            x >= this.size || y >= this.size
        ) return;

        this.burnedTiles.add(`${x},${y}`);

    }

    isBurned(x, y) {
        return this.burnedTiles.has(`${x},${y}`);
    }

    isWaterAt(x, y) {
        return this.getHeight(x, y) < 0.3;
    }

    canBurnAt(x, y) {

        if (
            x < 0 || y < 0 ||
            x >= this.size || y >= this.size
        ) return false;

        if (this.isWaterAt(x, y)) return false;

        return true;

    }

    getHeight(x, y) {

        if (
            x < 0 || y < 0 ||
            x >= this.size || y >= this.size
        ) return 0;

        return this.heightMap[x][y];

    }

    update(delta) {

        this.isUpdating = true;

        this.pendingFires = [];

        this.weather.update(delta);

        for (const fire of this.fires) fire.update(delta);
        for (const food of this.foods) food.update(delta);
        for (const creature of this.creatures) creature.update(delta);
        for (const smoke of this.smokes) smoke.update(delta);

        this.fires = this.fires.filter(f => f.alive);
        this.foods = this.foods.filter(f => f.alive);
        this.smokes = this.smokes.filter(s => s.alive);

        if (this.pendingFires.length > 0) {
            this.fires.push(...this.pendingFires);
        }

        this.isUpdating = false;

    }

            }
