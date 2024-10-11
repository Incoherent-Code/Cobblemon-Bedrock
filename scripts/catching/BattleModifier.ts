import { Player } from "@minecraft/server";
import { Behavior, CatchRateModifier, BehaviorMutators } from "./CatchRateModifier";
import { tryGetBattleFromEntity } from "../battle/Battle";
import { PokemonData } from "../Pokemon";

export class BattleModifier extends CatchRateModifier {
  constructor(
    public calculator: (player: Player, activePokemon: PokemonData[], targetPokemon: PokemonData) => number
  ) { super() }
  value(thrower: Player, pokemon: PokemonData) {
    if (!thrower.isValid())
      return 1;

    let currentParticipant = tryGetBattleFromEntity(thrower)?.participants?.find(x => (x.Player?.id === thrower.id));
    if (currentParticipant === undefined)
      return 1;

    return this.calculator(thrower, currentParticipant.Active.map(x => currentParticipant.Team[x]), pokemon);
  }
  behavior(thrower: Player, pokmeon: PokemonData): Behavior {
    return BehaviorMutators.MULTIPLY;
  }
}