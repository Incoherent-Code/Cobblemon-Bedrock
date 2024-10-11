import { initializeRequirement } from ".";
import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";
import { EvolutionRequirement } from "../EvolutionRequirement";

export class AnyRequirement extends EvolutionRequirement {
  variant = "any";
  constructor(
    public requirements: EvolutionRequirement[]
  ) { super() }
  static getFromSerialized(requirement: EvoRequirement): AnyRequirement {
    return new AnyRequirement(requirement.possibilities?.map(x => initializeRequirement(x)).filter(x => x != undefined) || []);
  }
  check(pokemon: PokemonData): boolean {
    return this.requirements.some(x => x.check(pokemon));
  }
}