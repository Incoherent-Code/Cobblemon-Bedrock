import { PokemonData } from "../Pokemon";
import { requirements } from "./requirements";

export interface EvolutionProgress<T> {
  /** Identfier of the evolution */
  id: string;
  progress: T;
  /** The type of Evolution requirement this belongs to. */
  variant: keyof typeof requirements;
}

/** Sets the evolution progress of an evolution
 * @param pokemon pokemon to be modified
 * @param id Id of the evolution this belongs to
 * @param variant Variant of the evolution progress
 * @param newProgress Value to set the progress to.
 */
export function setEvolutionProgress<T>(pokemon: PokemonData, id: string, variant: keyof typeof requirements, newProgress: T) {
  let progress = pokemon.evolutionProgress.find(x => x.id == id && x.variant == variant);
  if (!progress) {
    progress = { id: id, variant: variant, progress: newProgress };
    pokemon.evolutionProgress.push(progress);
  }
  progress.progress = newProgress;
}

export function getEvolutionProgress<T>(pokemon: PokemonData, id: string, variant: keyof typeof requirements): T | undefined {
  let progress = pokemon.evolutionProgress.find(x => x.id == id && x.variant == variant);
  return progress?.progress as T | undefined;
}