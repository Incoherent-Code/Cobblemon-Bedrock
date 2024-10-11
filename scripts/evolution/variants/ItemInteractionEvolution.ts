import { ItemStack } from "@minecraft/server";
import { ContextEvolution, Evolution } from "../Evolution";
import { PokemonData } from "../../Pokemon";
import { EvolutionEntry } from "../../speciesData";
import { PokemonProperties } from "../../PokemonProperties";
import { initializeRequirements } from "../requirements";

export class ItemInteractionEvolution extends ContextEvolution<ItemStack, string> {
  /** DO NOT USE, THIS IS HANDLED BY THE ENTITY FILE ITSELF */
  testContext(pokemon: PokemonData, context: ItemStack): boolean {
    return true;
  }
  static getFromSerializied(evolution: EvolutionEntry): ItemInteractionEvolution {
    return new ItemInteractionEvolution(
      evolution.requiredContext as string,
      evolution.id,
      PokemonProperties.parse(evolution.result),
      evolution.optional,
      evolution.consumeHeldItem,
      initializeRequirements(evolution.requirements),
      evolution.learnableMoves,
    );
  }
}