import { World } from "../world/world.js";

export class Renderer {

    constructor(canvas, seed) {

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.camera = { x: 0, y: 0, zoom: 10 };

        this.time = 0;
        this.daySpeed = 0.02;

        this.stars = this.generateStars(200);

        this.world = new World(seed);

        this.resize();
        window.addEventListener("resize", () => this.resize());

    }

    resize() {

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.width = this.canvas.width;
        this.height = this.canvas.height;

    }

    generateStars(count) {

        const stars = [];

        for (let i = 0; i < count; i++) {

            stars.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 1000 - 500,
                r: Math.random() * 1.5
            });

        }

        return stars;

    }

    render(delta) {

        this.time += delta * this.daySpeed;

        this.clear();

        this.updateSky();

        this.drawSky();
        this.drawStars();

        this.drawTerrain();

        this.world.update(delta);

        this.drawFires();
        this.drawCreatures();
        this.drawFood();
        this.drawSmoke();

        this.drawHUD();

    }

    clear() {
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    updateSky() {

        this.sun = {
            x: Math.cos(this.time) * 400,
            y: Math.sin(this.time) * 200
        };

        this.moon = {
            x: -this.sun.x,
            y: -this.sun.y
        };

    }

    drawSky() {

        const t = Math.sin(this.time);

        const sky = this.ctx.createLinearGradient(0, 0, 0, this.height);

        sky.addColorStop(0, `rgb(${20 + t * 30},${40 + t * 40},${100 + t * 80})`);
        sky.addColorStop(1, "#000");

        this.ctx.fillStyle = sky;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = "yellow";
        this.ctx.beginPath();
        this.ctx.arc(this.width / 2 + this.sun.x * 0.3, this.height / 2 + this.sun.y * 0.3, 25, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = "#ccc";
        this.ctx.beginPath();
        this.ctx.arc(this.width / 2 + this.moon.x * 0.3, this.height / 2 + this.moon.y * 0.3, 18, 0, Math.PI * 2);
        this.ctx.fill();

    }

    drawStars() {

        this.ctx.fillStyle = "white";

        for (const s of this.stars) {

            const x = this.width / 2 + s.x * 0.5;
            const y = this.height / 2 + s.y * 0.5;

            this.ctx.globalAlpha = 0.8;

            this.ctx.beginPath();
            this.ctx.arc(x, y, s.r, 0, Math.PI * 2);
            this.ctx.fill();

        }

        this.ctx.globalAlpha = 1;

    }

    drawTerrain() {

        const tileSize = 4;

        const cols = Math.floor(this.width / tileSize);
        const rows = Math.floor(this.height / tileSize);

        const offsetX = Math.floor(this.camera.x);
        const offsetY = Math.floor(this.camera.y);

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {

                const wx = x + offsetX;
                const wy = y + offsetY;

                const h = this.world.getHeight(wx, wy);

                let color;

                if (h < 0.3) color = "#1e4cff";
                else if (h < 0.4) color = "#d6d07a";
                else if (h < 0.7) color = "#1f7a1f";
                else color = "#808080";

                if (this.world.isBurned(wx, wy)) {
                    color = "#2a1a10";
                }

                this.ctx.fillStyle = color;
                this.ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }

    }

    drawFires() {

        for (const f of this.world.fires) {

            const x = (f.x - this.camera.x) * 4;
            const y = (f.y - this.camera.y) * 4;

            this.ctx.globalAlpha = 0.9;
            this.ctx.fillStyle = "orange";
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6 + f.intensity * 6, 0, Math.PI * 2);
            this.ctx.fill();

        }

        this.ctx.globalAlpha = 1;

    }

    drawSmoke() {

        for (const s of this.world.smokes) {

            const x = (s.x - this.camera.x) * 4;
            const y = (s.y - this.camera.y) * 4;

            this.ctx.globalAlpha = Math.max(0, s.life);
            this.ctx.fillStyle = "#777";

            this.ctx.beginPath();
            this.ctx.arc(x, y, s.size, 0, Math.PI * 2);
            this.ctx.fill();

        }

        this.ctx.globalAlpha = 1;

    }

    drawCreatures() {

        for (const c of this.world.creatures) {

            if (!c.alive) continue;

            const x = (c.x - this.camera.x) * 4;
            const y = (c.y - this.camera.y) * 4;

            this.ctx.fillStyle = "lime";
            this.ctx.beginPath();
            this.ctx.arc(x, y, c.size, 0, Math.PI * 2);
            this.ctx.fill();

        }

    }

    drawFood() {

        for (const f of this.world.foods) {

            const x = (f.x - this.camera.x) * 4;
            const y = (f.y - this.camera.y) * 4;

            this.ctx.fillStyle = "yellow";
            this.ctx.beginPath();
            this.ctx.arc(x, y, f.size, 0, Math.PI * 2);
            this.ctx.fill();

        }

    }

    drawHUD() {

        this.ctx.fillStyle = "white";
        this.ctx.font = "12px monospace";

        this.ctx.fillText(`TIME: ${this.time.toFixed(2)}`, 10, this.height - 20);
        this.ctx.fillText(`CREATURES: ${this.world.creatures.length}`, 10, this.height - 40);
        this.ctx.fillText(`FOOD: ${this.world.foods.length}`, 10, this.height - 60);
        this.ctx.fillText(`FIRE: ${this.world.fires.length}`, 10, this.height - 80);
        this.ctx.fillText(`SMOKE: ${this.world.smokes.length}`, 10, this.height - 100);
        this.ctx.fillText(`WEATHER: ${this.world.weather.state.toUpperCase()}`, 10, this.height - 120);
    }

    }
