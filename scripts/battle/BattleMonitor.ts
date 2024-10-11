import { Entity, system, RawMessage } from "@minecraft/server";
import { message } from "../language";
import { battleMap } from "./Battle";

const activeBattleMonitors = new Map<string, BattleMonitor>();

export class BattleMonitor {
  runIdentifier: number
  /** The battle monitor makes fleeing work and prevents stale battles
   * It adds itself to activeBattleMonitors and sets up execution on its own
   * @param battle UUID of ongoing battle
   * @param canFlee whether or not running away can end a battle
   * @param entities Entities to track.
    */
  constructor(
    public battle: string,
    public canFlee: boolean,
    public entities: Entity[]) {
    this.runIdentifier = system.runInterval(() => this.checkOnBattle(), 10);
    activeBattleMonitors.set(this.battle, this);
  }
  checkOnBattle() {
    if (!this.entities.every(x => x.isValid())) {
      this.forceEndBattle(message.error(message.battleMsg("crash")));
      return;
    }
    //Fleeing mechanics
    if (!this.canFlee) return
    for (let i = 1; i < this.entities.length; i++) {
      let location1 = this.entities[i - 1].location;
      let location2 = this.entities[1].location;
      let distance = Math.sqrt((location2.x - location1.x) ** 2 + (location2.y - location1.y) ** 2 + (location2.z - location1.z) ** 2);
      if (distance > 30) {
        this.forceEndBattle({ translate: "cobblemon.battle.flee" });
      }
    }
  }
  forceEndBattle(reason?: RawMessage) {
    let battle = battleMap.get(this.battle);
    if (battle != undefined) { //Battle has already ended
      if (reason)
        battle.sendMessageToAllPlayers(reason);
      battle.destroy();
    }
    this.destroy();
  }
  destroy() {
    system.clearRun(this.runIdentifier);
    battleMap.delete(this.battle);
  }
}