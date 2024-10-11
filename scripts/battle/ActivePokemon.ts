import { Entity } from "@minecraft/server";
import { PokemonData } from "../Pokemon";
import { ActorType, BattleActor } from "./BattleActor";
import { PokemonBattle } from "./PokemonBattle";
import { BattleMoveset } from "./BattleMoveset";

/** Holds relevant data for active pokemon in battle. */
export class ActivePokemon {
  /** UUID's of all pokemon this pokemon has seen (used for exp gain) */
  seenPokemon: string[] = []
  battle: PokemonBattle
  /**
   * @param data Data of the pokemon
   * @param battle Battle this is being used in (used to auto reveal itself to all out pokemon)
   */
  constructor(
    public data: PokemonData,
    public actor: BattleActor,
    public entity: Entity
  ) {
    this.battle = actor.battle;
    this.seeAllActivePokemon();
    this.revealToActivePokemon();
  }

  /** Ensures that the pokemon is up to date, both in the field and in the player's team. */
  syncWithOut() {
    if (this.actor.type == ActorType.PLAYER && this.actor.Player) {
      this.data.updatePokemonInTeam(this.actor.Player);
      this.data.tryUpdatePokemonOut();
    }
    else {
      this.data.tryUpdatePokemonOut();
    }
  }

  seeAllActivePokemon() {
    let allActivePokemon = this
      .getSide()
      .getOppositeSide()
      .actors
      .flatMap(x => x.activePokemon)
      .filter(x => x != null)
      .map(x => x.data.uuid)
    //Ensures Uniqueness
    this.seenPokemon = [...new Set([...this.seenPokemon, ...allActivePokemon])];
  }

  revealToActivePokemon() {
    this.getSide()
      .getOppositeSide()
      .actors
      .flatMap(x => x.activePokemon)
      .filter(x => x != null)
      .forEach(x => x.seenPokemon.push(this.data.uuid))
  }

  getSide() {
    return this.actor.getSide();
  }

  isAllied(pokemon: ActivePokemon) {
    return (pokemon.getSide() == this.getSide())
  }

  /** Returns all pokemon adjacent to the pokemon, including across from it.*/
  getAdjacent(): ActivePokemon[] {
    let digit = this.getDigit();
    //TODO: Actually use the format to determine the sideSize
    let sideSize = this.getSide().actors.length;
    return this.battle.activePokemon
      .filter(x => x != null)
      .filter(it => {
        let sameSideDigit = (it.isAllied(this))
          ? it.getDigit()
          : sideSize - it.getDigit() + 1;
        let digitDistance = Math.abs(sameSideDigit - digit)
        return digitDistance <= 1 && it !== this;
      })
  }

  /** Returns the showdown letter corresponding to the position on the field */
  getLetter(): string {
    let index = this.actor.activePokemon.findIndex(x => x == this)
    if (index == -1)
      throw new Error("The activePokemon is not active and could not be assigned a letter");
    //Adding 97 gets the corresponding alphabetical number
    return String.fromCharCode(index + 97);
  }

  /** Finds the showdown digit for this particular pokemon. */
  getDigit(asAlly = true): number {
    let digit = this.getSide().getActivePokemon().findIndex(x => x == this) + 1;
    if (digit === 0)
      throw new Error("Pokemon was not on its own side somehow?");
    return digit * ((asAlly) ? 1 : -1);
  }

  getDigitRelativeTo(pokemon: ActivePokemon) {
    return this.getDigit(this.isAllied(pokemon))
  }

  getShowdownPosition() {
    return `${this.actor.showdownId}${this.getLetter()}`
  }

  getSignedDigitRelativeTo(other: ActivePokemon) {
    let digit = Math.abs(this.getDigitRelativeTo(other));
    //This seems backwards but ok
    return ((this.isAllied(other)) ? `-${digit}` : `+${digit}`);
  }
}