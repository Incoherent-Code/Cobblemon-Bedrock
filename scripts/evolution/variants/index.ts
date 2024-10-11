import { EvolutionEntry } from "../../speciesData";
import { Evolution, PassiveEvolution } from "../Evolution";
import { LevelUpEvolution } from "./LevelUpEvolution";
import { ItemInteractionEvolution } from "./ItemInteractionEvolution";
import { TradeEvolution } from "./TradeEvolution";

const evolutionVariants: Record<string, (EvolutionEntry) => Evolution> = {
  "passive": PassiveEvolution.getFromSerializied,
  "level_up": LevelUpEvolution.getFromSerializied,
  "item_interact": ItemInteractionEvolution.getFromSerializied,
  "trade": TradeEvolution.getFromSerializied
}

export function initializeEvolution(evolution: EvolutionEntry) {
  let constructor = evolutionVariants[evolution.variant];
  if (constructor != undefined)
    return constructor(evolution);
  console.warn(`Could not get a valid evolution type constructor for evolution ${evolution.variant}!`);
  return undefined;
}

export function initializeEvolutions(requirements: EvolutionEntry[]): Evolution[] {
  return requirements
    .map(x => initializeEvolution(x))
    .filter(x => !(!x));
}