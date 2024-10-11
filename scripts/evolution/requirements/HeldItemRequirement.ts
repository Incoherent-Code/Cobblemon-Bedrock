import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";
import { EvolutionRequirement } from "../EvolutionRequirement";

export default class HeldItemRequirement extends EvolutionRequirement {
  variant = "held_item";
  constructor(
    //This being undefined would be the same as holding air.
    public identifier?: string
  ) { super() }
  check(pokemon: PokemonData): boolean {
    return pokemon.minecraftItem === this.identifier;
  }
  static getFromSerialized(requirement: EvoRequirement): HeldItemRequirement {
    return new HeldItemRequirement(requirement.itemCondition);
  }
}