import { EvolutionRequirement } from "./EvolutionRequirement";
import { PokemonData } from "../Pokemon";
import { Entity } from "@minecraft/server";

export default abstract class EntityQueryRequirement extends EvolutionRequirement {
  /** Do not overwrite this function when using EntityQueryRequirement. Overwrite QueryCheck Instead. */
  check(pokemon: PokemonData): boolean {
    let entity = pokemon.tryGetPokemonOut() || pokemon.tryGetOwner();
    if (!entity)
      return false;
    return this.queryCheck(pokemon, entity);
  }
  abstract queryCheck(pokemon: PokemonData, entity: Entity): boolean;
}