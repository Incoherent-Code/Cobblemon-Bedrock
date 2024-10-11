import { Player } from "@minecraft/server";
import { Behavior, CatchRateModifier, BehaviorMutators } from "./CatchRateModifier";
import { PokemonData } from "../Pokemon";

export class GarunteedModifier extends CatchRateModifier {
  constructor() { super() }
  isGarunteed = true;
  value(thrower: Player, pokemon: PokemonData) {
    return 255;
  }
  behavior(thrower: Player, pokmeon: PokemonData): Behavior {
    return BehaviorMutators.MULTIPLY;
  }
}