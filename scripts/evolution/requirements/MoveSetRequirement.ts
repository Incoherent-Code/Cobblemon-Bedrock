import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";
import { toID } from "../../utils";
import { EvolutionRequirement } from "../EvolutionRequirement";

export default class MoveSetRequirement extends EvolutionRequirement {
  variant = "has_move";
  constructor(
    public move = "tackle"
  ) { super() }
  check(pokemon: PokemonData): boolean {
    return pokemon.moves.some(move => toID(move) == toID(this.move));
  }
  static getFromSerialized(requirement: EvoRequirement): MoveSetRequirement {
    return new MoveSetRequirement(requirement.move);
  }
}