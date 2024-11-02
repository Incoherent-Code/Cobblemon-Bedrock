//Handles Importing Data from JSON Files

import { Entity, WeatherType, world } from "@minecraft/server"
import { toID } from "./showdown/sim/dex-data"
import { ElementalType } from "./Pokemon";


//Interfaces for typesafety for decoding the json files
export interface SpeciesData {
  name: string;
  nationalPokedexNumber: number;
  baseStats: StatSet;
  maleRatio: number;
  catchRate: number;
  baseScale: number;
  baseExperienceYeild: number;
  baseFriendship: number;
  evYeild: StatSet;
  experienceGroup: string;
  hitbox: HitboxEntry;
  primaryType: ElementalType;
  secondaryType?: ElementalType;
  abilities: string[];
  shoulderMountable: boolean;
  moves: string[];
  evolutions: EvolutionEntry[];
  features: string[];
  standingEyeHeight?: number;
  swimmingEyeHeight?: number;
  flyingEyeHeight?: number;
  behaviour: BehaviorClass;
  pokedex: string[];
  drops: DropTable;
  eggCycles: number;
  eggGroups: string[];
  cannotDynamax: boolean;
  implemented: boolean;
  height: number,
  weight: number,
  forms?: FormData[];

  //Additional Stuff
  /** Only use minLevel and maxLevel if not obtainable by spawn condition */
  minLevel: number;
  /** Only use minLevel and maxLevel if not obtainable by spawn condition */
  maxLevel: number;
  variationMap: { [key: number]: string[] }
  spawnConditionsMap: { [key: string]: SpawnConditionData }
}

export interface FormData {
  name: string;
  baseStats?: StatSet;
  maleRatio?: number;
  hitbox?: HitboxEntry;
  catchRate?: number;
  experienceGroup?: string;
  baseExperienceYield?: number;
  baseFriendship?: number;
  evYeild?: StatSet;
  primaryType?: string;
  secondaryType?: string;
  shoulderMountable?: boolean;
  moves?: string[];
  evolutions?: EvolutionEntry[];
  abilities?: string[];
  drops?: DropTable;
  pokedex?: string[];
  preEvolution?: string;
  standingEyeHeight?: number;
  swimmingEyeHeight?: number;
  flyingEyeHeight?: number;
  labels?: string[];
  cannotDynamax?: boolean;
  eggGroups?: string[];
  height?: number;
  weight?: number;
  requiredMove?: string;
  requiredItem?: string;
  requiredItems?: string;
  battleTheme?: string;
  battleOnly?: boolean;
}

interface StatSet {
  hp: number;
  attack: number;
  defence: number;
  special_attack: number;
  special_defence: number;
  speed: number;
}

interface DropTable {
  amount?: number;
  entries?: DropEntry[];
}

interface DropEntry {
  item: string;
  percentage?: number;
  quantityRange?: string;
}

interface HitboxEntry {
  width: number;
  height: number;
  fixed: boolean;
}

export interface EvolutionEntry {
  id: string;
  variant: string;
  result: string;
  consumeHeldItem: boolean;
  learnableMoves: string[];
  requiredContext?: unknown;
  requirements: EvoRequirement[];
  optional: boolean;
}

export interface EvoRequirement {
  variant: string;
  minLevel?: number;
  maxLevel?: number;
  amount?: number;
  range?: string;
  type?: string;
  isRaining?: boolean;
  isThundering?: boolean;
  move?: string;
  identifier?: string;
  possibilities?: EvoRequirement[],
  moonPhase?: string;
  ratio?: string;
  itemCondition?: string;
  target?: string;
  contains?: boolean
}

interface BehaviorClass {
  moving: MoveData;
  resting: RestData;
  idle: IdleData;
}

interface MoveData {
  walk: Walk;
  fly: Fly;
  swim: Swim;
  canLook: boolean;
  wanderSpeed: number;
  wanderChance: number;
  lookAtEntities: boolean;
}

interface Walk {
  canWalk: boolean;
  avoidsLand: boolean;
  walkSpeed: number;
}

interface Fly {
  canFly: boolean;
  flySpeedHorizontal: number;
}

interface Swim {
  avoidsWater: boolean;
  swimSpeed: number;
  canSwimInWater: boolean;
  canSwimInLava: boolean;
  canBreatheUnderwater: boolean;
  canBreathUnderlava: boolean;
  hurtByLava: boolean;
  canWalkOnWater: boolean;
  canWalkOnLava: boolean;
}

interface RestData {
  canSleep: boolean;
  willSleepOnBed: boolean;
  depth: string;
  light: string;
  sleepChance: number;
  times: string;
}

interface IdleData {
  pointAtSpawn: boolean;
}

interface SpawnConditionData {
  isRaining?: boolean,
  isThundering?: boolean,
  timeRange?: string,
  minLevel: number,
  maxLevel: number,
  multiplier?: number
}

export function getSpeciesData(species: string): SpeciesData | undefined {
  species = toID(species);
  try {
    return require(`./pokemon_data/${species}.json`);
  }
  catch (e) { } //An error will print to log either way
  return undefined
}

export function getAvaliableMoves(species: string, maxLevel?: number): string[] {
  species = toID(species);
  const { moves: moves } = require(`./pokemon_data/${species}.json`);
  if (maxLevel) {
    return moves.filter(x => (!isNaN(parseInt(x.split(":")[0])) && parseInt(x.split(":")[0]) <= maxLevel)).map((x: string) => { return x.split(":")[1] });
  }
  else {
    return moves.filter(x => (!isNaN(parseInt(x.split(":")[0])))).map((x: string) => { return x.split(":")[1] });
  }
}

export function getFullName(species: string): string {
  species = toID(species);
  const { name: name } = require(`./pokemon_data/${species}.json`);
  return name;
}

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
    let time = world.getTimeOfDay();
    let isNight = (24000 > time && time > 12000)
    switch (spawnCondition.timeRange) {
      case "day":
        if (isNight)
          return false;
        break;
      case "night":
        if (!isNight)
          return false;
        break;
      default:
        console.warn(`Timerange ${spawnCondition.timeRange} is unknown.`);
    }
  }

  return true;
}
