export class Renderer {
    
    constructor(canvas) {
        
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // 🌍 Camera system
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1
        };

        // 🌌 Time system (for sky cycle)
        this.time = 0;
        this.daySpeed = 0.02;

        // 🌠 Sky objects
        this.stars = this.generateStars(200);

        // ☀️ Sun & 🌙 Moon
        this.sun = { x: 0, y: 0 };
        this.moon = { x: 0, y: 0 };

        this.resize();
        window.addEventListener("resize", () => this.resize());

    }

    // 📏 Resize handling
    resize() {

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.width = this.canvas.width;
        this.height = this.canvas.height;

    }

    // 🌠 Generate background stars
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

    // 🔁 Main render loop
    render(delta) {

        this.time += delta * this.daySpeed;

        this.clear();
        this.updateSky();
        this.drawSky();
        this.drawStars();

        // 🧪 Placeholder world ground (temporary)
        this.drawGround();

        this.drawHUD();

    }

    // 🧹 Clear frame
    clear() {

        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.width, this.height);

    }

    // 🌅 Sky cycle logic
    updateSky() {

        // Sun moves in circle
        this.sun.x = Math.cos(this.time) * 400;
        this.sun.y = Math.sin(this.time) * 200;

        // Moon opposite side
        this.moon.x = -this.sun.x;
        this.moon.y = -this.sun.y;

    }

    // 🌌 Sky rendering
    drawSky() {

        const t = Math.sin(this.time);

        // gradient sky
        const sky = this.ctx.createLinearGradient(
            0, 0, 0, this.height
        );

        sky.addColorStop(0, `rgb(${20 + t*20}, ${30 + t*30}, ${80 + t*50})`);
        sky.addColorStop(1, "#000");

        this.ctx.fillStyle = sky;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // ☀️ Sun
        this.ctx.fillStyle = "yellow";
        this.ctx.beginPath();
        this.ctx.arc(
            this.width / 2 + this.sun.x * 0.3,
            this.height / 2 + this.sun.y * 0.3,
            30,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // 🌙 Moon
        this.ctx.fillStyle = "#ccc";
        this.ctx.beginPath();
        this.ctx.arc(
            this.width / 2 + this.moon.x * 0.3,
            this.height / 2 + this.moon.y * 0.3,
            20,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

    }

    // 🌠 Stars
    drawStars() {

        this.ctx.fillStyle = "white";

        for (const s of this.stars) {

            const x = this.width / 2 + s.x * 0.5;
            const y = this.height / 2 + s.y * 0.5;

            this.ctx.globalAlpha = Math.random() * 0.8;

            this.ctx.beginPath();
            this.ctx.arc(x, y, s.r, 0, Math.PI * 2);
            this.ctx.fill();

        }

        this.ctx.globalAlpha = 1;

    }

    // 🌍 Temporary ground
    drawGround() {

        const h = this.height * 0.75;

        this.ctx.fillStyle = "#1a3d1a";
        this.ctx.fillRect(0, h, this.width, this.height - h);

    }

    // 📊 HUD overlay rendering (simple debug layer)
    drawHUD() {

        this.ctx.fillStyle = "white";
        this.ctx.font = "12px monospace";

        this.ctx.fillText(
            `CAMERA X:${this.camera.x.toFixed(1)} Y:${this.camera.y.toFixed(1)}`,
            10,
            this.height - 40
        );

        this.ctx.fillText(
            `TIME:${this.time.toFixed(2)}`,
            10,
            this.height - 20
        );

    }

                         }
