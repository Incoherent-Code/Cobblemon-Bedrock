import { Entity, world } from "@minecraft/server";
import { PokemonData } from "../../Pokemon";
import EntityQueryRequirement from "../EntityQueryRequirement";

/** DO NOT IMPLIMENT: BIOME TAGS NOT YET PARSIBLE */
export default class BiomeRequirement extends EntityQueryRequirement {
  variant = "biome";
  constructor(
    public biomes: string[] = [],
    public antiCondition = false
  ) { super() }
  queryCheck(pokemon: PokemonData, entity: Entity): boolean {
    let inBiomes = (this.biomes.some(x => entity.dimension.findClosestBiome(entity.location, x, { boundingSize: { x: 1, y: 1, z: 1 } })));
    return this.antiCondition ? !inBiomes : inBiomes;
  }
}