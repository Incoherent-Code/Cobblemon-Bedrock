import { RawMessage } from "@minecraft/server";
import { PokemonData } from "../Pokemon";
import { ActivePokemon } from "./ActivePokemon";
import { ActiveMoveset, RequestMove } from "./Request";
import { MoveTarget } from "../showdown/sim/dex-moves";
import { Dex } from "../showdown/sim";
import { toID } from "../utils";
import { getMoveTranslation } from "../language";

export class BattleMoveset {
  moves: InBattleMove[] = [];
  trapped = false;
  canMegaEvo = false;
  canUltraBurst = false;
  canZMove = undefined;
  canDynamax = false;
  maxMoves = undefined;
  canTerastallize?: string

  private constructor() { }

  static parse(item: string | ActiveMoveset): BattleMoveset {
    if (typeof item == "string")
      item = JSON.parse(item) as ActiveMoveset;

    let output = new BattleMoveset();
    Object.assign(output, item);
    output.moves = item.moves.map(x => InBattleMove.parse(x));
    return output;
  }
}

export class InBattleMove {
  /** The move as a showdown id */
  id: string = "tackle";
  /** English name */
  move: string = "tackle";
  pp: number = 40;
  maxpp: number = 40;
  /** What the move targets.
   * @see dex-moves.ts
   */
  target: MoveTarget = "self";
  disabled = false;
  gimmickMove: gimmickMove | undefined;

  private constructor() { }

  static parse(RequestMove: RequestMove) {
    return Object.assign(new InBattleMove(), RequestMove)
  }

  canBeUsed() {
    return (this.pp > 0 && !this.disabled);
  }
  mustBeUsed() {
    return (this.maxpp == 100 && this.pp == 100 && this.target == "self")
  }
}

export interface gimmickMove {
  move: string
  target?: MoveTarget
  disabled?: boolean
}

/** @returns Anonymous function to determine targetable pokemon. If this is undefined, then it takes no input from the user (showdown will handle it.) */
export const MoveTargets: Record<MoveTarget, ((pokemon: ActivePokemon) => ActivePokemon[]) | undefined> = {
  any: function (pokemon) { return pokemon.battle.activePokemon.filter(x => x != null).filter(x => x?.data.uuid !== pokemon.data.uuid); },
  self: undefined,
  adjacentAlly: function (pokemon) { return pokemon.getAdjacent().filter(x => x?.isAllied(pokemon)) },
  adjacentAllyOrSelf: function (pokemon) { return [...MoveTargets.adjacentAlly!(pokemon), pokemon] },
  adjacentFoe: function (pokemon) { return pokemon.getAdjacent().filter(x => !x?.isAllied(pokemon)) },
  all: undefined,
  allAdjacent: undefined,
  allAdjacentFoes: undefined,
  allies: undefined,
  allySide: undefined,
  allyTeam: undefined,
  foeSide: undefined,
  normal: function (pokemon) { return pokemon.getAdjacent() },
  randomNormal: undefined,
  scripted: undefined
}