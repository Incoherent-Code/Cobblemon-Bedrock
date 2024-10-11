import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";
import { EvolutionRequirement } from "../EvolutionRequirement";

export default class RecoilRequirement extends EvolutionRequirement {
  variant = "recoil";
  constructor(
    public amount = 0
  ) { super() }
  check(pokemon: PokemonData): boolean {
    return pokemon.evolutionProgress
      .filter(x => x.variant == this.variant)
      .some(progress => progress.progress >= this.amount);
  }
  static getFromSerialized(requirement: EvoRequirement): RecoilRequirement {
    return new RecoilRequirement(requirement.amount);
  }
}