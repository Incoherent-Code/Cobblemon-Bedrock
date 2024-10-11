import { Player, RawMessage } from "@minecraft/server";
import { BattleActor } from "./BattleActor";
import { PokemonBattle } from "./PokemonBattle";

export class BattleSide {
  constructor(public actors: BattleActor[]) { }
  battle!: PokemonBattle
  getActivePokemon() {
    return this.actors.flatMap(x => x.activePokemon);
  }
  getOppositeSide() {
    return (this == this.battle.side1) ? this.battle.side2 : this.battle.side1
  }
  broadcaseChatMessage(text: RawMessage) {
    this.actors.forEach(x => {
      if (x.actor instanceof Player)
        x.actor.sendMessage(text);
    })
  }
  stillSendingOut() {
    return this.actors.some(x => x.stillSendingOutCount > 0);
  }
  /** TODO: Impliment cries properly */
  playCries() {
    this.getActivePokemon().forEach(x => {
      //Currently, cobblebuild does not include the cry animation.
      x?.entity.playAnimation("cry")
    })
  }
}