import { ElementalType, PokemonData } from "../../Pokemon";
import { Dex } from "../../showdown/sim";
import { EvoRequirement } from "../../speciesData";
import { toID } from "../../utils";
import { EvolutionRequirement } from "../EvolutionRequirement";

export default class MoveTypeRequirement extends EvolutionRequirement {
  variant = "has_move_type";
  constructor(
    public type = ElementalType.Normal
  ) { super() }
  check(pokemon: PokemonData): boolean {
    return pokemon.moves
      .map(x => Dex.moves.get(x))
      .some(x => toID(x.type) == toID(this.type))
  }
  static getFromSerialized(requirement: EvoRequirement): MoveTypeRequirement {
    return new MoveTypeRequirement(requirement.type as ElementalType);
  }
}