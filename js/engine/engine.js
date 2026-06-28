import { Renderer }
from "./renderer.js";

class Engine {

    constructor() {

        this.canvas =
        document.getElementById("gameCanvas");

        this.seed =
        Math.floor(Math.random() * 999999999);

        this.renderer =
        new Renderer(this.canvas, this.seed);

        this.lastTime = 0;

        this.loop = this.loop.bind(this);

        requestAnimationFrame(this.loop);

    }

    loop(time) {

        const delta =
        (time - this.lastTime) / 1000;

        this.lastTime = time;

        this.renderer.render(delta);

        requestAnimationFrame(this.loop);

    }

}

new Engine();
