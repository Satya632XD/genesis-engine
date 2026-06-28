export class Structure {

    constructor(x, y, type, ownerTribe = null) {

        this.x = x;
        this.y = y;

        this.type = type;

        this.ownerTribe = ownerTribe;

        this.health = 100;

        this.alive = true;

        this.age = 0;

        // 🏗 properties depend on type
        if (type === "nest") {
            this.capacity = 2;
            this.protection = 0.2;
        }

        if (type === "shelter") {
            this.capacity = 5;
            this.protection = 0.6;
        }

        if (type === "fort") {
            this.capacity = 10;
            this.protection = 0.85;
        }

    }

    update(delta) {

        this.age += delta;

        // 🧱 decay over time if abandoned
        if (!this.ownerTribe || this.ownerTribe.members.length === 0) {
            this.health -= delta * 1.5;
        }

        if (this.health <= 0) {
            this.alive = false;
        }

    }

}
