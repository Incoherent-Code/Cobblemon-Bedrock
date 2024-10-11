import { Entity, Player } from "@minecraft/server";
import { Behavior, CatchRateModifier, BehaviorMutators } from "./CatchRateModifier";
import { PokemonData } from "../Pokemon";

export class WorldStateModifier extends CatchRateModifier {
  constructor(
    private calculator: (thrower: Player, pokemon: Entity) => number
  ) { super() }
  value(thrower: Player, pokemon: PokemonData) {
    let pokemonEntity = pokemon.tryGetPokemonOut();
    if (pokemonEntity === undefined)
      return 1;
    return this.calculator(thrower, pokemonEntity);
  }
  behavior(thrower: Player, pokmeon: PokemonData): Behavior {
    return BehaviorMutators.MULTIPLY;
  }
}