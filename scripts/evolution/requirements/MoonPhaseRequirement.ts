import { MoonPhase, world } from "@minecraft/server";
import { EvolutionRequirement } from "../EvolutionRequirement";
import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";

const moonConversions = {
  "FULL_MOON": 0,
  "WANING_GIBBOUS": 1,
  "FIRST_QUARTER": 2,
  "WANING_CRESCENT": 3,
  "NEW_MOON": 4,
  "WAXING_CRESCENT": 5,
  "LAST_QUARTER": 6,
  "WAXING_GIBBOUS": 7
}

export default class MoonPhaseRequirement extends EvolutionRequirement {
  variant = "moon_phase";
  constructor(
    public moonPhase = MoonPhase.FullMoon
  ) { super() }
  check(pokemon: PokemonData): boolean {
    return world.getMoonPhase() == this.moonPhase;
  }
  static getFromSerialized(requirement: EvoRequirement): MoonPhaseRequirement {
    return new MoonPhaseRequirement(moonConversions[requirement.moonPhase || "FULL_MOON"]);
  }
}