import { RawMessage } from "@minecraft/server"

export class BattleFormat {
  constructor(
    public mod = "cobblemon",
    public battleType: BattleType = BattleTypes.SINGLES,
    public ruleSet = new Set<BattleRules>(),
    public gen = 9
  ) { }

  //Presets
  static get GEN_9_SINGLES() {
    return new BattleFormat("base", BattleTypes.SINGLES, new Set<BattleRules>([BattleRules.OBTAINABLE, BattleRules.PAST, BattleRules.UNOBTAINABLE]))
  }

  static get GEN_9_DOUBLES() {
    return new BattleFormat("cobblemon", BattleTypes.DOUBLES, new Set<BattleRules>([BattleRules.OBTAINABLE]))
  }

  static get GEN_9_MULTI() {
    return new BattleFormat("cobblemon", BattleTypes.MULTI, new Set<BattleRules>([BattleRules.OBTAINABLE]))
  }

  //We cant just use json.stringify() cuz gametype and ruleset
  toFormatJSON() {
    return `{"mod":"${this.mod}", "gameType":"${this.battleType.name}", "gen":"${this.gen}", "ruleset":["${([...this.ruleSet] as string[]).join(`","`)}"], "effectType":"Format"}`;
  }
}

export const BattleTypes: Record<string, BattleType> = {
  SINGLES: { name: "singles", actorsPerSide: 1, slotsPerActor: 1 },
  DOUBLES: { name: "doubles", actorsPerSide: 1, slotsPerActor: 2 },
  TRIPLES: { name: "triples", actorsPerSide: 1, slotsPerActor: 3 },
  MULTI: { name: "multi", actorsPerSide: 2, slotsPerActor: 1 }
}

interface BattleType {
  name: string
  actorsPerSide: number
  slotsPerActor: number
}

enum BattleRules {
  OBTAINABLE = "Obtainable",
  PAST = "+Past",
  UNOBTAINABLE = "+Unobtainable",
  TEAM_PREVIEW = "Team Preview",
  ENDLESS_BATTLE_CLAUSE = "Endless Battle Clause",
  CANCEL_MOD = "Cancel Mod",
  SLEEP_CLAUSE = "Sleep Clause",
  HP_PERCENTAGE_MOD = "HP Percentage Mod"
}