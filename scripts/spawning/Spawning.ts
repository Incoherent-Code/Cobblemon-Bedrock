import { Entity, WeatherType, world } from "@minecraft/server";
import { SpawnConditionData } from "../speciesData";
import { getConfig } from "../Config";
import { BlockUtils, toDimensionLocation } from "../utils";
import { TimeRanges } from "./TimeRange";

/** Returns true only if all of the spawn conditions are met. */
export function validateSpawnCondition(entity: Entity, spawnCondition: SpawnConditionData): boolean {
  if (spawnCondition.isRaining != null) {
    let currentWeather = entity.dimension.getWeather();
    if (spawnCondition.isRaining === true && currentWeather === WeatherType.Clear) {
      return false;
    }
    if (spawnCondition.isRaining === false && currentWeather != WeatherType.Clear) {
      return false;
    }
  }

  if (spawnCondition.isThundering != null) {
    let currentWeather = entity.dimension.getWeather();
    if (spawnCondition.isThundering === true && currentWeather != WeatherType.Thunder) {
      return false;
    }
    if (spawnCondition.isThundering === false && currentWeather === WeatherType.Thunder) {
      return false;
    }
  }

  if (spawnCondition.timeRange != null) {
    let timeRange = TimeRanges[spawnCondition.timeRange];
    if (!timeRange) {
      console.warn(`Unknown time range ${spawnCondition.timeRange}`);
      return false;
    }
    if (!timeRange.validate())
      return false;
  }

  if (spawnCondition.neededNearbyBlocks || spawnCondition.preventedNearbyBlocks) {
    let config = getConfig();
    let nearbyBlocks = BlockUtils.getAllBlocksFromCenter(
      toDimensionLocation(entity.location, entity.dimension),
      config.maxNearbyBlocksHorizontalRange,
      config.maxNearbyBlocksVerticleRange
    ).map(x => x.typeId);
    if (spawnCondition.neededNearbyBlocks && !spawnCondition.neededNearbyBlocks.every(cond => nearbyBlocks.some(x => cond.includes(x))))
      return false;
    if (spawnCondition.preventedNearbyBlocks && !spawnCondition.preventedNearbyBlocks.every(cond => !nearbyBlocks.some(x => cond.includes(x))))
      return false;
  }

  return true;
}