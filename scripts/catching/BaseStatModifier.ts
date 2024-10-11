import { Player } from "@minecraft/server";
import { Behavior, CatchRateModifier, BehaviorMutators } from "./CatchRateModifier";
import { PokemonData } from "../Pokemon";
import "../showdown/sim/global-types";

export class BaseStatModifier extends CatchRateModifier {
  constructor(
    public stat: keyof StatsTable,
    public comparator: (value: number) => Boolean,
    public multiplier: number
  ) { super() }
  value(thrower: Player, pokemon: PokemonData) {
    return this.multiplier;
  }
  behavior(thrower: Player, pokmeon: PokemonData): Behavior {
    return BehaviorMutators.MULTIPLY;
  }
}