import { ItemStack } from "@minecraft/server";
import { ContextEvolution, Evolution } from "../Evolution";
import { PokemonData } from "../../Pokemon";
import { EvolutionEntry } from "../../speciesData";
import { PokemonProperties } from "../../PokemonProperties";
import { initializeRequirements } from "../requirements";

export class TradeEvolution extends ContextEvolution<PokemonData, PokemonProperties> {
  testContext(pokemon: PokemonData, context: PokemonData): boolean {
    return this.requiredContext.match(context)
  }
  static getFromSerializied(evolution: EvolutionEntry): TradeEvolution {
    return new TradeEvolution(
      PokemonProperties.parse(evolution.requiredContext as string | undefined),
      evolution.id,
      PokemonProperties.parse(evolution.result),
      evolution.optional,
      evolution.consumeHeldItem,
      initializeRequirements(evolution.requirements),
      evolution.learnableMoves,
    );
  }
}