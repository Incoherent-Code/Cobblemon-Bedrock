import { Entity } from "@minecraft/server";
import EntityQueryRequirement from "../EntityQueryRequirement";
import { PokemonData } from "../../Pokemon";
import { initializeRequirement } from ".";
import { EvoRequirement } from "../../speciesData";

export default class WorldRequirement extends EntityQueryRequirement {
  variant = "world";
  constructor(
    public dimensionIdentifier = "minecraft:overworld"
  ) { super() }
  queryCheck(pokemon: PokemonData, entity: Entity): boolean {
    return entity.dimension.id == this.dimensionIdentifier;
  }
  static getFromSerialized(requirement: EvoRequirement): WorldRequirement {
    return new WorldRequirement(requirement.identifier);
  }
}