import { PokemonData } from "../Pokemon";
import { EvoRequirement } from "../speciesData";

export abstract class EvolutionRequirement implements EvoRequirement {
  /** The variant of this EvolutionRequirement as serialized to json. */
  variant: string;
  /** Check if the pokmeon meets the evolution requirement. */
  abstract check(pokemon: PokemonData): boolean;
  /** Takes in the input recieved from the pokemon data and returns an instance of this class.
   * @throws If this is not overrided by inheritor.
   */
  static getFromSerializied(evoRequirement: EvoRequirement): EvolutionRequirement {
    throw new Error("EvolutionRequirement was not implimented properly.");
  };
}