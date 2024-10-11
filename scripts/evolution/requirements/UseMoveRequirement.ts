import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";
import { toID } from "../../utils";
import { EvolutionRequirement } from "../EvolutionRequirement";

export default class UseMoveRequirement extends EvolutionRequirement {
  variant = "use_move";
  constructor(
    public move = "tackle",
    public amount = 0
  ) { super() }
  check(pokemon: PokemonData): boolean {
    return pokemon.moves.some(move => toID(move) == toID(this.move));
  }
  static getFromSerialized(requirement: EvoRequirement): UseMoveRequirement {
    return new UseMoveRequirement(requirement.move, requirement.amount);
  }
}