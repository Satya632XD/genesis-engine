export class Noise {

    constructor(seed = 1) {
        this.seed = seed;

        this.p = new Array(512);
        this.permutation = [];

        this.init();
    }

    init() {

        // create base permutation
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }

        // shuffle using seed
        let rand = this.seedRandom(this.seed);

        for (let i = 255; i > 0; i--) {

            const swap = Math.floor(rand() * (i + 1));

            [this.permutation[i], this.permutation[swap]] =
            [this.permutation[swap], this.permutation[i]];

        }

        for (let i = 0; i < 512; i++) {
            this.p[i] = this.permutation[i & 255];
        }
    }

    seedRandom(seed) {

        // simple deterministic PRNG
        return function () {

            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;

        };

    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {

        const h = hash & 3;

        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;

        return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);

    }

    noise(x, y) {

        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        const u = this.fade(x);
        const v = this.fade(y);

        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;

        const AA = this.p[A];
        const AB = this.p[A + 1];
        const BA = this.p[B];
        const BB = this.p[B + 1];

        const res = this.lerp(
            this.lerp(
                this.grad(AA, x, y),
                this.grad(BA, x - 1, y),
                u
            ),
            this.lerp(
                this.grad(AB, x, y - 1),
                this.grad(BB, x - 1, y - 1),
                u
            ),
            v
        );

        return (res + 1) / 2;

    }

    // 🌍 fractal noise (used for terrain)
    fbm(x, y, octaves = 4) {

        let value = 0;
        let amplitude = 0.5;
        let frequency = 1;

        for (let i = 0; i < octaves; i++) {

            value += this.noise(x * frequency, y * frequency) * amplitude;

            frequency *= 2;
            amplitude *= 0.5;

        }

        return value;

    }

}
