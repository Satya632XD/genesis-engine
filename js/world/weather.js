export class Weather {

    constructor(seed) {

        this.seed = seed;

        this.time = 0;

        // 🌦 current weather state
        this.state = "clear"; // clear, rain, storm

        this.rain = 0;

        this.temperature = 20;

        this.wind = 0;

    }

    update(delta) {

        this.time += delta;

        // 🌡 temperature cycle (day/night influence)
        this.temperature = 20 + Math.sin(this.time * 0.01) * 10;

        // 🌦 weather changes over time
        const cycle = Math.sin(this.time * 0.005);

        if (cycle > 0.6) this.state = "storm";
        else if (cycle > 0.2) this.state = "rain";
        else this.state = "clear";

        // 🌧 rain intensity
        if (this.state === "rain") this.rain = 0.5;
        else if (this.state === "storm") this.rain = 1.0;
        else this.rain = 0;

        // 🌪 wind changes
        this.wind = Math.sin(this.time * 0.02) * 2;

    }

    isRaining() {
        return this.rain > 0;
    }

}
