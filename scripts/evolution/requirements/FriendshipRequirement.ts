import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";
import { EvolutionRequirement } from "../EvolutionRequirement";

export default class FriendshipRequirement extends EvolutionRequirement {
  variant = "friendship";
  constructor(
    public amount = 0
  ) { super() }
  check(pokemon: PokemonData): boolean {
    return pokemon.happiness >= this.amount;
  }
  static getFromSerialized(requirement: EvoRequirement): FriendshipRequirement {
    return new FriendshipRequirement(requirement.amount);
  }
}