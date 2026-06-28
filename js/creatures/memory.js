export class Memory {

    constructor() {

        // 🧠 remembered positions
        this.dangerZones = [];   // fire / death areas
        this.foodZones = [];     // good feeding areas

        // 🧭 internal map simplification
        this.explored = new Set();

        this.maxMemory = 50;

    }

    rememberDanger(x, y) {

        this.dangerZones.push({ x, y, strength: 1 });

        if (this.dangerZones.length > this.maxMemory) {
            this.dangerZones.shift();
        }

    }

    rememberFood(x, y) {

        this.foodZones.push({ x, y, strength: 1 });

        if (this.foodZones.length > this.maxMemory) {
            this.foodZones.shift();
        }

    }

    isDangerNearby(x, y) {

        for (const d of this.dangerZones) {

            const dx = d.x - x;
            const dy = d.y - y;

            if (dx * dx + dy * dy < 400) {
                return true;
            }

        }

        return false;

    }

}
