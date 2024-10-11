import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";
import { EvolutionRequirement } from "../EvolutionRequirement";

export default class LevelRequirement extends EvolutionRequirement {
  variant = "level";
  constructor(
    public minLevel = 1,
    public maxLevel = 65535
  ) { super() }
  check(pokemon: PokemonData): boolean {
    return (this.minLevel <= pokemon.level && pokemon.level <= this.maxLevel)
  }
  static getFromSerialized(requirement: EvoRequirement): LevelRequirement {
    return new LevelRequirement(requirement.minLevel, requirement.maxLevel);
  }
}