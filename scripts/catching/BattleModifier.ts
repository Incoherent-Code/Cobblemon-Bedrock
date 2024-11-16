import { Player } from "@minecraft/server";
import { Behavior, CatchRateModifier, BehaviorMutators } from "./CatchRateModifier";
import { tryGetBattleFromEntity } from "../battle";
import { PokemonData } from "../Pokemon";

export class BattleModifier extends CatchRateModifier {
  constructor(
    public calculator: (player: Player, activePokemon: PokemonData[], targetPokemon: PokemonData) => number
  ) { super() }
  value(thrower: Player, pokemon: PokemonData) {
    if (!thrower.isValid())
      return 1;

    let currentParticipant = tryGetBattleFromEntity(thrower)?.getActorFromID(thrower.id);
    if (currentParticipant === undefined)
      return 1;

    return this.calculator(thrower, currentParticipant.activePokemon.filter(x => x != null).map(x => x.data), pokemon);
  }
  behavior(thrower: Player, pokmeon: PokemonData): Behavior {
    return BehaviorMutators.MULTIPLY;
  }
}