import { Player } from "@minecraft/server";
import { Behavior, CatchRateModifier, BehaviorMutators } from "./CatchRateModifier";
import { PokemonData } from "../Pokemon";

export class MultiplierModifier extends CatchRateModifier {
  constructor(
    private multiplier: number,
    private condition: (thrower: Player, pokemon: PokemonData) => boolean = (_, _a) => true
  ) { super() }
  value(thrower: Player, pokemon: PokemonData) {
    return this.multiplier
  }
  behavior(thrower: Player, pokmeon: PokemonData): Behavior {
    return BehaviorMutators.MULTIPLY;
  }
  isValid(thrower: Player, pokemon: PokemonData): boolean {
    return this.condition(thrower, pokemon);
  }
}