export class Tribe {

    constructor(id) {

        this.id = id;

        this.members = [];

        this.leader = null;

        this.territoryCenter = { x: 0, y: 0 };

        this.territoryRadius = 30;

        this.sharedMemory = {
            dangerZones: [],
            foodZones: []
        };

        this.aggressionLevel = 0.5;

    }

    addMember(creature) {

        this.members.push(creature);
        creature.tribe = this;

        if (!this.leader) {
            this.leader = creature;
        }

    }

    removeMember(creature) {

        this.members = this.members.filter(c => c !== creature);

        if (this.leader === creature) {
            this.leader = this.members[0] || null;
        }

    }

    isInTerritory(x, y) {

        const dx = x - this.territoryCenter.x;
        const dy = y - this.territoryCenter.y;

        return dx * dx + dy * dy < this.territoryRadius * this.territoryRadius;

    }

    shareKnowledge() {

        // 🧠 merge memories between members
        for (const member of this.members) {

            for (const d of member.memory.dangerZones) {
                this.sharedMemory.dangerZones.push(d);
            }

            for (const f of member.memory.foodZones) {
                this.sharedMemory.foodZones.push(f);
            }

        }

        // limit memory size
        if (this.sharedMemory.dangerZones.length > 100) {
            this.sharedMemory.dangerZones.splice(0, 20);
        }

        if (this.sharedMemory.foodZones.length > 100) {
            this.sharedMemory.foodZones.splice(0, 20);
        }

    }

  }
