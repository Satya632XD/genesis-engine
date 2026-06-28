import { Creature } from "./creature.js";

export class Dinosaur extends Creature {

    constructor(x, y, world) {

        super(x, y, world);

        this.size = 10;

        this.speed = 0.8;

        this.energy = 150;

        this.color = "green";

    }

    update(delta) {

        super.update(delta);

        // 🦖 dinosaurs slightly stronger survival instinct
        if (this.hunger > 30) {
            this.speed = 1.2;
        } else {
            this.speed = 0.8;
        }

    }

}
