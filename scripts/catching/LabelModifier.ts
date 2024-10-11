import { Player } from "@minecraft/server";
import { Behavior, CatchRateModifier, BehaviorMutators } from "./CatchRateModifier";
import { PokemonData } from "../Pokemon";

export class LabelModifier extends CatchRateModifier {
  labels: string[]
  constructor(
    private multiplier: number,
    private matching: boolean,
    ...labels: string[]
  ) {
    super()
    this.labels = labels;
  }
  value(thrower: Player, pokemon: PokemonData) {
    return this.multiplier
  }
  behavior(thrower: Player, pokmeon: PokemonData): Behavior {
    return BehaviorMutators.MULTIPLY;
  }
  isValid(thrower: Player, pokemon: PokemonData): boolean {
    let speciesData = pokemon.getSpeciesData();
    if (speciesData === undefined || speciesData.labels === undefined)
      return false;
    for (let label in speciesData.labels) {
      if (this.labels.includes(label))
        return true;
    }
    return false;
  }
}