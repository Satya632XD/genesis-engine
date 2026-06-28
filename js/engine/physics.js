export class Physics {

    constructor(world) {
        this.world = world;

        // global tuning
        this.gravity = 0; // top-down world (no heavy gravity needed)
        this.friction = 0.88;
        this.maxSpeed = 2.5;
    }

    apply(creature, delta) {

        if (!creature.alive) return;

        // initialize velocity if missing
        if (!creature.vx) creature.vx = 0;
        if (!creature.vy) creature.vy = 0;

        // =========================
        // 🧠 intent-based acceleration
        // =========================
        if (creature.target) {

            const dx = creature.target.x - creature.x;
            const dy = creature.target.y - creature.y;

            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const ax = (dx / dist) * creature.genome.speed * 0.08;
            const ay = (dy / dist) * creature.genome.speed * 0.08;

            creature.vx += ax;
            creature.vy += ay;
        }

        // =========================
        // 🌪 wind influence
        // =========================
        const wind = this.world.weather.wind;
        creature.vx += wind * 0.01;

        // =========================
        // 🔥 panic boost
        // =========================
        if (creature.state === "panic") {
            creature.vx *= 1.02;
            creature.vy *= 1.02;
        }

        // =========================
        // 🧲 friction (natural slowdown)
        // =========================
        creature.vx *= this.friction;
        creature.vy *= this.friction;

        // =========================
        // 🚀 clamp speed
        // =========================
        const speed = Math.sqrt(creature.vx ** 2 + creature.vy ** 2);

        if (speed > this.maxSpeed * creature.genome.speed) {
            const scale = (this.maxSpeed * creature.genome.speed) / speed;
            creature.vx *= scale;
            creature.vy *= scale;
        }

        // =========================
        // 🌍 apply movement
        // =========================
        creature.x += creature.vx;
        creature.y += creature.vy;

        // =========================
        // 🧱 world collision
        // =========================
        this.handleTerrainCollision(creature);

        // reset panic slowly
        if (creature.state === "panic") {
            creature.stateTimer = (creature.stateTimer || 0) + delta;
            if (creature.stateTimer > 3) {
                creature.state = "wander";
                creature.stateTimer = 0;
            }
        }
    }

    handleTerrainCollision(creature) {

        const x = Math.floor(creature.x);
        const y = Math.floor(creature.y);

        // water slows movement heavily
        if (this.world.isWaterAt(x, y)) {
            creature.vx *= 0.4;
            creature.vy *= 0.4;

            creature.energy -= 0.05; // swimming cost
        }

        // burned ground = slower + unstable movement
        if (this.world.isBurned(x, y)) {
            creature.vx *= 0.85;
            creature.vy *= 0.85;
        }

        // world bounds clamp
        creature.x = Math.max(0, Math.min(this.world.size - 1, creature.x));
        creature.y = Math.max(0, Math.min(this.world.size - 1, creature.y));
    }
}
