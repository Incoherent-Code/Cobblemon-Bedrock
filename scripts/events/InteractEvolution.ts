import { ScriptEventCommandMessageAfterEvent } from "@minecraft/server";
import { PokemonData } from "../Pokemon";
import { initializeEvolutions } from "../evolution";
import { ItemUtils } from "../utils";


export default function handleInteractEvolution(arg: ScriptEventCommandMessageAfterEvent) {
  if (!arg.sourceEntity)
    return;

  let evolutionID = arg.message;
  let pokemonData = PokemonData.getFromEntity(arg.sourceEntity);
  let evolutions = initializeEvolutions(pokemonData.getSpeciesData().evolutions);
  evolutions.filter(x => x.id == evolutionID).forEach(x => x.evolve(pokemonData));
  ItemUtils.decrementItemInHand(pokemonData.tryGetOwner()!);
}