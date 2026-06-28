export class Genome {

    constructor(parent = null) {

        // 🧬 core traits
        this.speed = parent ? this.mutate(parent.speed, 0.2) : this.random(0.3, 1.2);
        this.vision = parent ? this.mutate(parent.vision, 0.3) : this.random(20, 80);
        this.intelligence = parent ? this.mutate(parent.intelligence, 0.2) : this.random(0.2, 1);
        this.aggression = parent ? this.mutate(parent.aggression, 0.25) : this.random(0, 1);
        this.fear = parent ? this.mutate(parent.fear, 0.25) : this.random(0, 1);
        this.metabolism = parent ? this.mutate(parent.metabolism, 0.2) : this.random(0.5, 1.5);

        // 🧬 hidden survival score bias
        this.fireResistance = parent ? this.mutate(parent.fireResistance, 0.3) : this.random(0, 1);
        this.coldResistance = parent ? this.mutate(parent.coldResistance, 0.3) : this.random(0, 1);

    }

    mutate(value, strength) {

        const mutation = (Math.random() - 0.5) * strength;
        return Math.max(0.05, value + mutation);

    }

    random(min, max) {
        return min + Math.random() * (max - min);
    }

}
