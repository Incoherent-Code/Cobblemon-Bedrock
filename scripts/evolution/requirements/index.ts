import { EvoRequirement } from "../../speciesData";
import { EvolutionRequirement } from "../EvolutionRequirement";
import { AnyRequirement } from "./AnyRequirement";
import AttackDefenseRequirement from "./AttackDefenceRequirement";
import BattleCriticalHitsRequirement from "./BattleCriticalHitsRequirement";
import DamageTakenRequirement from "./DamageTakenRequirement";
import DefeatRequirement from "./DefeatRequirement";
import FriendshipRequirement from "./FriendshipRequirement";
import HeldItemRequirement from "./HeldItemRequirement";
import LevelRequirement from "./LevelRequirement";
import MoonPhaseRequirement from "./MoonPhaseRequirement";
import MoveSetRequirement from "./MoveSetRequirement";
import MoveTypeRequirement from "./MoveTypeRequirement";
import PartyMemberRequirement from "./PartyMemberRequirement";
import RecoilRequirement from "./RecoilRequirement";
import WeatherRequirement from "./WeatherRequirement";
import WorldRequirement from "./WorldRequirement";

export const requirements = {
  "any": AnyRequirement.getFromSerialized,
  "attack_defence_ratio": AttackDefenseRequirement.getFromSerialized,
  "battle_critical_hits": BattleCriticalHitsRequirement.getFromSerialized,
  "damage_taken": DamageTakenRequirement.getFromSerialized,
  "defeat": DefeatRequirement.getFromSerialized,
  "friendship": FriendshipRequirement.getFromSerialized,
  "held_item": HeldItemRequirement.getFromSerialized,
  "level": LevelRequirement.getFromSerialized,
  "moon_phase": MoonPhaseRequirement.getFromSerialized,
  "has_move": MoveSetRequirement.getFromSerialized,
  "has_move_type": MoveTypeRequirement.getFromSerialized,
  "party": PartyMemberRequirement.getFromSerialized,
  "recoil": RecoilRequirement.getFromSerialized,
  "use_move": RecoilRequirement.getFromSerialized,
  "weather": WeatherRequirement.getFromSerialized,
  "world": WorldRequirement.getFromSerialized
}

export function initializeRequirement(requirement: EvoRequirement): EvolutionRequirement | undefined {
  let constructor = requirements[requirement.variant];
  if (constructor != undefined)
    return constructor(requirement);
  console.warn(`Could not get a valid requirement constructor for evolution requirement ${requirement.variant}!`);
}

export function initializeRequirements(requirements: EvoRequirement[]): EvolutionRequirement[] {
  return requirements
    .map(x => initializeRequirement(x))
    .filter(x => !(!x));
}