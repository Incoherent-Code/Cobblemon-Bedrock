import { toID } from "../utils";
import { ActivePokemon } from "./ActivePokemon";
import { RequestMove } from "./Request";
import { BattleMoveset, MoveTargets } from "./BattleMoveset";

export enum ActionResponseType {
  SWITCH,
  MOVE,
  DEFAULT,
  FORCE_PASS,
  PASS,
  HEAL_ITEM
}

export abstract class ActionResponse {
  constructor(
    public type: ActionResponseType
  ) { }
  abstract isValid(pokemon: ActivePokemon, moveset: BattleMoveset | undefined, forceSwtich: boolean): boolean;
  abstract toShowdownString(pokemon: ActivePokemon, moveset?: BattleMoveset): string;
}

export class MoveActionResponse extends ActionResponse {
  constructor(
    public moveName: string,
    public targetShowdownPosition?: string,
    public gimmickID?: string
  ) { super(ActionResponseType.MOVE) }
  isValid(pokemon: ActivePokemon, moveset: BattleMoveset | undefined, forceSwtich: boolean): boolean {
    if (forceSwtich || !moveset)
      return false;
    let move = moveset.moves.find(x => x.id == toID(this.moveName));
    if (move == undefined)
      throw new Error("Pokemon Moveset does not contain the move from MoveActionResponse.");
    //TODO: Support Gimmick Moves
    let gimmickMove = move.gimmickMove;
    let validGimmickMove = false;
    if (!validGimmickMove && !move.canBeUsed())
      return false;

    let avaliableTargets = MoveTargets[move.target]?.(pokemon);
    if (!avaliableTargets)
      return true; //Handled by showdown, does not need a specified target

    if (!this.targetShowdownPosition) {
      //If there is only one possible target, then hit it.
      if (avaliableTargets.length == 1) {
        this.targetShowdownPosition = avaliableTargets[0].getShowdownPosition();
        return true;
      }
      //A target needed to be specified.
      return false;
    }

    if (!avaliableTargets.find(x => x.getShowdownPosition() == this.targetShowdownPosition))
      return false; //The specified pokemon was not targetable.

    return true;
  }
  toShowdownString(pokemon: ActivePokemon, moveset?: BattleMoveset): string {
    if (!moveset)
      throw new Error("Moveset must be provided with MoveActionResponse .toShowdownString");

    let moveIndex = moveset.moves.findIndex(x => x.id == toID(this.moveName)) + 1;
    if (moveIndex === 0)
      throw new Error("Move from MoveActionResponse was not found in moveset!");

    let output = "move " + moveIndex.toString();
    if (this.targetShowdownPosition) {
      let [_, targetPokemon] = pokemon.battle.getActorAndActiveSlotFromShowdownPosition(this.targetShowdownPosition);
      let digit = targetPokemon!.getSignedDigitRelativeTo(pokemon);
      output += ` ${digit}`
    }
    if (this.gimmickID)
      output += ` ${this.gimmickID}`;
    return output;
  }

}

export class HealItemActionResponse extends ActionResponse {
  constructor(
    public item: string
  ) { super(ActionResponseType.HEAL_ITEM) }
  isValid(pokemon: ActivePokemon, moveset: BattleMoveset | undefined, forceSwitch: boolean): boolean {
    return !forceSwitch;
  }
  toShowdownString(pokemon: ActivePokemon, moveset?: BattleMoveset): string {
    return `healitem ${pokemon.getShowdownPosition()} ${toID(this.item)}`
  }
}

export class SwitchActionResponse extends ActionResponse {
  constructor(
    public newPokemonUUID: string
  ) { super(ActionResponseType.SWITCH) }
  isValid(pokemon: ActivePokemon, moveset: BattleMoveset | undefined, forceSwtich: boolean): boolean {
    let newPokemon = pokemon.actor.pokemon.find(x => x.uuid == this.newPokemonUUID)
    if (!newPokemon)
      return false;
    if (newPokemon.currentHealth <= 0)
      return false;
    if (moveset && moveset.trapped)
      return false;
    if (pokemon.actor.activePokemon.some(x => x?.data.uuid == this.newPokemonUUID))
      return false;
    return true;
  }
  toShowdownString(pokemon: ActivePokemon, moveset?: BattleMoveset): string {
    return `switch ${pokemon.actor.request!.side.pokemon.findIndex(x => x.details.split(", ")[1] === this.newPokemonUUID) + 1}`;
  }
}

export class DefaultActionResponse extends ActionResponse {
  constructor() { super(ActionResponseType.DEFAULT) }
  isValid(pokemon: ActivePokemon, moveset: BattleMoveset | undefined, forceSwtich: boolean): boolean {
    return true;
  }
  toShowdownString(pokemon: ActivePokemon, moveset?: BattleMoveset): string {
    return "default";
  }
}

export class PassActionResponse extends ActionResponse {
  constructor() { super(ActionResponseType.PASS) }
  isValid(pokemon: ActivePokemon, moveset: BattleMoveset | undefined, forceSwtich: boolean): boolean {
    return true;
  }
  toShowdownString(pokemon: ActivePokemon, moveset?: BattleMoveset): string {
    return "pass";
  }
}

export class ForcePassActionResponse extends ActionResponse {
  constructor() { super(ActionResponseType.FORCE_PASS) }
  isValid(pokemon: ActivePokemon, moveset: BattleMoveset | undefined, forceSwtich: boolean): boolean {
    if (forceSwtich)
      return false;
    if (!moveset)
      return false;
    return pokemon.actor.expectingPassActions.length > 0;
  }
  toShowdownString(pokemon: ActivePokemon, moveset?: BattleMoveset): string {
    return "pass";
  }
}

export class BagItemActionResponse extends ActionResponse {
  /**
   * Use an item from the bag
   * @param bagItem Item name as a string (do not include namespace)
   * @param target target pokemon
   * @param data idk
   */
  constructor(
    public bagItem: string,
    public target: ActivePokemon,
    public data: string
  ) { super(ActionResponseType.FORCE_PASS) }
  isValid(pokemon: ActivePokemon, moveset: BattleMoveset | undefined, forceSwtich: boolean): boolean {
    if (forceSwtich)
      return false;
    if (!moveset)
      return false;
    return pokemon.actor.expectingPassActions.length > 0;
  }
  toShowdownString(pokemon: ActivePokemon, moveset?: BattleMoveset): string {
    return `useitem ${this.target.data.uuid} ${toID(this.bagItem)} `
  }
}