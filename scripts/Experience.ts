import { ActivePokemon } from "./battle";
import { getConfig } from "./Config";
import { PokemonData } from "./Pokemon";

/** Reimplimentation of LevelCurve.kt's Cashed Level Thresholds
 * This is used because the polynomial functions used to get the level from experience level is difficult to reverse,
 * so it is just calculated using this.
 * This actually combines multiple classes from the source code because I felt some of the abstraction was unnecessary for this use case.
 */
export class CachedLevelThreshold {
  savedThreshholds: number[] = []
  constructor(
    public getExperience: (level: number) => number
  ) { }

  getLevel(experience: number): number {
    let level = 1;
    let maxLevel = getConfig().maxPokemonLevel;
    while (level <= this.savedThreshholds.length) {
      let threshold = this.savedThreshholds[level - 1];
      if (experience < threshold) {
        return level - 1;
      }
      level++;
    }
    while (level < maxLevel) {
      let threshold = this.getExperience(level);
      this.savedThreshholds.push(threshold);
      if (experience < threshold) {
        return level - 1;
      }
      level++;
    }
    //Level is at levelLimit
    return level;
  }
}

export const ExperienceGroups: Record<string, CachedLevelThreshold> = {
  "erratic": new CachedLevelThreshold(level => {
    if (level == 1) return 0;
    if (level < 50) return Math.pow(level, 3) * (100 - level) / 50;
    if (level < 68) return Math.pow(level, 3) * (150 - level) / 100;
    if (level < 98) return Math.pow(level, 3) * (1901 - 10 * level) / 3 / 500
    return Math.pow(level, 3) * (160 - level) / 100
  }),
  "fast": new CachedLevelThreshold(level => {
    if (level == 1) return 0;
    return 4 * Math.pow(level, 3) / 5;
  }),
  "medium_fast": new CachedLevelThreshold(level => {
    if (level == 1) return 0;
    return Math.pow(level, 3);
  }),
  "medium_slow": new CachedLevelThreshold(level => {
    if (level == 1) return 0;
    return Math.max(0, Math.pow(level, 3) * 6 / 5 - 15 * Math.pow(level, 2) + 100 * level - 140);
  }),
  "slow": new CachedLevelThreshold(level => {
    if (level == 1) return 0;
    return 5 * Math.pow(level, 3) / 4;
  }),
  "fluctuating": new CachedLevelThreshold(level => {
    if (level == 1) return 0;
    if (level < 15) return Math.pow(level, 3) * ((level + 1) / 3 + 24) / 50;
    if (level < 36) return Math.pow(level, 3) * (level + 14) / 50;
    return Math.pow(level, 3) * (level / 2 + 32) / 50;
  })
}

export function calculateExpGain(pokemon: PokemonData, faintedPokmeon: PokemonData, participationMultiplier: number = 1): number {
  let opponentPokemonData = faintedPokmeon.getSpeciesData();
  //TODO: Impliment forms
  let baseExp = opponentPokemonData.baseExperienceYeild;
  let opponentLevel = faintedPokmeon.level;
  let term1 = (baseExp * opponentLevel) / 5;
  // This is meant to be a division but this is due to the intended behavior of handling the 2.0 sent over from Exp. All in modern Pokémon
  let term2 = 1 * participationMultiplier;
  let victorLevel = pokemon.level;
  let term3 = Math.pow(((2.0 * opponentLevel) + 10) / (opponentLevel + victorLevel + 10), 2.5);
  //TODO: 1.5* bonus if traded from same locale, or 1.7* bonus without
  let nonOtBonus = 1.0;
  let luckyEggMultiplier = (pokemon.item == "luckyegg") ? 1.5 : 1;
  //TODO: Impliment EvolutionMultiplier
  let evolutionMultiplier = 1;
  let affectionMultiplier = (pokemon.happiness >= 220) ? 1.2 : 1;
  //Config
  let gimickBoost = getConfig().experienceMultiplier;
  let term4 = term1 * term2 * term3 + 1;
  return Math.round(term4 * nonOtBonus * luckyEggMultiplier * evolutionMultiplier * affectionMultiplier * gimickBoost);
}