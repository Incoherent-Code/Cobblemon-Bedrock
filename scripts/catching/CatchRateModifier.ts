import { Player } from "@minecraft/server";
import { PokemonData } from "../Pokemon";

/** Recreation of the Interface CatchRateMotifier  */
export abstract class CatchRateModifier {
  constructor() { }
  /** Whether or not the catch is garunteed */
  isGarunteed: boolean = false;
  /** Value of this modifier (like what number it adds or multiplies by) */
  abstract value(thrower: Player, pokemon: PokemonData): number;
  /** Operation to apply to the value */
  abstract behavior(thrower: Player, pokmeon: PokemonData): Behavior;
  /** Whether or not the modifier applies in this case */
  isValid(thrower: Player, pokemon: PokemonData): boolean {
    return true;
  }
  /** Function to modify the catch rate of a pokemon. */
  modifyCatchRate(currentCatchRate: number, thrower: Player, pokemon: PokemonData): number {
    if (!this.isValid(thrower, pokemon))
      return currentCatchRate;
    return this.behavior(thrower, pokemon)(currentCatchRate, this.value(thrower, pokemon));
  }
}

export type Behavior = (input: number, value: number) => number;

export const BehaviorMutators = {
  ADD: (input, value) => input + value,
  SUBTRACT: (input, value) => input - value,
  MULTIPLY: (input, value) => input * value,
  DIVIDE: (input, value) => input / value,
};