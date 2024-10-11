import { CatchRateModifier } from "./CatchRateModifier";
import { BattleModifier } from "./BattleModifier";
import { WorldStateModifier } from "./WorldStateModifier";
import { DynamicMultiplierModifier } from "./DynamicMultiplierModifier";
import { BiomeType, BiomeTypes, world } from "@minecraft/server";
import { tryGetBattleFromEntity } from "../battle/Battle";
import { Pokemon } from "../showdown/sim";
import { ElementalType, StatusEffect } from "../Pokemon";
import { MultiplierModifier } from "./MultiplierModifier";

export const CatchRateModifiers = {
  /** Used by Level Ball */
  LEVEL: new BattleModifier((_, team, targetPokemon) => {
    let highestLevel = Math.max(...team.map(x => x.level));
    if (highestLevel > (targetPokemon.level * 4))
      return 4;
    else if (highestLevel > (highestLevel * 2))
      return 3;
    else if (highestLevel > targetPokemon.level)
      return 2;
    return 1;
  }),
  /** Used by Dive Ball */
  SUBMERGED_IN_WATER: new WorldStateModifier((_, pokemonEntity) => pokemonEntity.isInWater ? 3.5 : 1),
  /** Used by Nest Ball */
  NEST: new DynamicMultiplierModifier(
    (_, pokemon) => (41 - pokemon.level) / 10,
    (_, pokemon) => pokemon.level < 30
  ),
  /** Used by love ball */
  LOVE: new BattleModifier((_, team, pokemon) => {
    if (
      pokemon.gender != undefined
      && team.some(x => x.gender != undefined && x.species == pokemon.species && x.gender != pokemon.gender)
    ) {
      //I dont understand what the check is in the kotlin code so were just gonna assume its always true (it seems like it would be)
      return 8;
    }
    else {
      return 1;
    }
  }),
  /** Used by Moon Ball */
  MOON_PHASES: new WorldStateModifier((_, pokemon) => {
    let time = world.getTimeOfDay();
    //Day Time
    if (12000 < time && time < 24000)
      return 1;
    //The bedrock api represents moon phases as 0-7 instead of 1-8 on java
    switch (world.getMoonPhase()) {
      case 2:
      case 6:
        return 1.5;
      case 1:
      case 7:
        return 2.5;
      case 0:
        return 4;
      default:
        return 1;
    }
  }),
  /** 
   * Used By Dusk Ball.
   * Just Uses time because there is currently no api for getting lighting.
   */
  LIGHT_LEVEL: new WorldStateModifier(() => {
    let time = world.getTimeOfDay();
    return (12000 < time && time < 24000) ? 1 : 2;
  }),
  /** Used By Safari Ball. 1.5* boost if battling. */
  SAFARI: new WorldStateModifier((_, pokemon) => (tryGetBattleFromEntity(pokemon) != undefined) ? 1.5 : 1),
  /** Used by park ball. 2.5* bonus if in plains or forrest */
  PARK: new WorldStateModifier((_, pokemon) => {
    //Janky solution until there is a better method for this. Has performance concerns.
    let biomeSearchArray = [
      pokemon.dimension.findClosestBiome(pokemon.location, "minecraft:plains", { boundingSize: { x: 1, y: 1, z: 1 } }),
      pokemon.dimension.findClosestBiome(pokemon.location, "minecraft:sunflower_plains", { boundingSize: { x: 1, y: 1, z: 1 } }),
      pokemon.dimension.findClosestBiome(pokemon.location, "minecraft:meadow", { boundingSize: { x: 1, y: 1, z: 1 } }),
      pokemon.dimension.findClosestBiome(pokemon.location, "minecraft:cherry_grove", { boundingSize: { x: 1, y: 1, z: 1 } }),
      pokemon.dimension.findClosestBiome(pokemon.location, "minecraft:forest", { boundingSize: { x: 1, y: 1, z: 1 } }),
      pokemon.dimension.findClosestBiome(pokemon.location, "minecraft:flower_forest", { boundingSize: { x: 1, y: 1, z: 1 } }),
      pokemon.dimension.findClosestBiome(pokemon.location, "minecraft:birch_forest", { boundingSize: { x: 1, y: 1, z: 1 } }),
      pokemon.dimension.findClosestBiome(pokemon.location, "minecraft:dark_forest", { boundingSize: { x: 1, y: 1, z: 1 } }),
      pokemon.dimension.findClosestBiome(pokemon.location, "minecraft:grove", { boundingSize: { x: 1, y: 1, z: 1 } }),
    ];
    return biomeSearchArray.some(x => x != undefined) ? 2.5 : 1;
  }),
  /** Used by heavy ball */
  WEIGHT_BASED: new DynamicMultiplierModifier(
    (_, pokemon) => {
      //TODO: Impliment Forms
      let weight = pokemon.getSpeciesData().weight;
      return (weight > 3000) ? 4 : (weight > 2000) ? 2.5 : (weight > 1000) ? 1.5 : 1;
    },
    () => true
  ),
  /** Used by Net Ball 
   * Returns a multiplier modifier that works if the specified types are found on the pokemon. */
  typeBoosting(multiplier: number, ...types: ElementalType[]): CatchRateModifier {
    return new MultiplierModifier(multiplier, (_, pokemon) => {
      let species = pokemon.getSpeciesData();
      return types.includes(species.primaryType) || types.includes(species.secondaryType!)
    });
  },
  /** Used by Dream Ball
   *  Returns a multiplier modifier that works if the specified status effects are on the pokmeon. */
  statusBoosting(multiplier: number, ...statuses: StatusEffect[]) {
    return new MultiplierModifier(multiplier, (_, pokemon) => statuses.includes(pokemon.status!));
  },
  /** Used by quick ball and repeat ball 
   * Returns a multiplier modifier based on the number of turns using a passed in calculator. */
  turnBased(calculator: (turn: number) => number) {
    return new BattleModifier((player) => {
      let battle = tryGetBattleFromEntity(player);
      return (battle) ? calculator(battle.turn) : 1;
    });
  }
}