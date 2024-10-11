import { PokemonData } from "../../Pokemon";
import { EvoRequirement } from "../../speciesData";
import { EvolutionRequirement } from "../EvolutionRequirement";

enum AttackDefenceRatio {
  ATTACK_HIGHER = "ATTACK_HIGHER",
  DEFENSE_HIGHER = "DEFENSE_HIGHER",
  EQUAL = "EQUAL"
}

export default class AttackDefenseRequirement extends EvolutionRequirement {
  variant = "attack_defence_ratio"
  constructor(
    public ratio = AttackDefenceRatio.ATTACK_HIGHER
  ) { super() }
  check(pokemon: PokemonData): boolean {
    let currentStats = pokemon.getCurrentStats();
    return (this.ratio == AttackDefenceRatio.ATTACK_HIGHER) ? (currentStats.atk > currentStats.def)
      : (this.ratio == AttackDefenceRatio.DEFENSE_HIGHER) ? (currentStats.def > currentStats.atk)
        //If AttackDefenseRatio.Equal
        : (currentStats.atk == currentStats.def)
  }
  static getFromSerialized(requirement: EvoRequirement): AttackDefenseRequirement {
    return new AttackDefenseRequirement(Object.entries(AttackDefenceRatio).filter(x => x[0] == requirement.ratio)[0][1]);
  }
}