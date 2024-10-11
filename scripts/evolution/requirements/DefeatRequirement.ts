import { PokemonData } from "../../Pokemon";
import { EvolutionRequirement } from "../EvolutionRequirement";
import { PokemonProperties } from "../../PokemonProperties";
import { EvoRequirement } from "../../speciesData";

export default class DefeatRequirement extends EvolutionRequirement {
  variant = "defeat";
  constructor(
    public target: PokemonProperties,
    public amount = 1
  ) { super() }
  /** @todo Allow for more than one defeat requirement to work. */
  check(pokemon: PokemonData): boolean {
    return pokemon.evolutionProgress
      .filter(x => x.variant == this.variant)
      .some(progress => (progress.progress as number) >= this.amount)
  }
  static getFromSerialized(requirement: EvoRequirement): DefeatRequirement {
    return new DefeatRequirement(PokemonProperties.parse(requirement.target || "unown"), requirement.amount);
  }
}