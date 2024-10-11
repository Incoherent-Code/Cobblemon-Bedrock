import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";
import { EvolutionRequirement } from "../EvolutionRequirement";

export default class DamageTakenRequirement extends EvolutionRequirement {
  variant = "damage_taken";
  constructor(
    public amount = 0
  ) { super() }
  check(pokemon: PokemonData): boolean {
    return pokemon.evolutionProgress
      .filter(x => x.variant == this.variant)
      .some(x => (x.progress as number) >= this.amount);
  }
  static getFromSerialized(requirement: EvoRequirement): DamageTakenRequirement {
    return new DamageTakenRequirement(requirement.amount);
  }
}