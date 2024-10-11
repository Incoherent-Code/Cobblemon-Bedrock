import { EventEmitter } from 'events';
import { BattleActor, PokemonBattle } from "../battle";
import { PokemonData } from '../Pokemon';
import { ActivePokemon } from '../battle';

/** Uses types from Record to create a typescript safe event emitter.
 * @link https://stackblitz.com/edit/node-4kixah?file=index.ts
 */
//Typescript typing can be so overwhelming
//Theres more typescript stuff than there is actual code
class TypedEventEmitter<TEvents extends Record<string, any>> {
  private emitter = new EventEmitter()

  emit<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    ...eventArg: TEvents[TEventName]
  ) {
    this.emitter.emit(eventName, ...(eventArg as []))
  }

  on<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void
  ) {
    this.emitter.on(eventName, handler as any)
  }

  off<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void
  ) {
    this.emitter.off(eventName, handler as any)
  }
}

/**
 * A map of event names to argument tuples
 */
export type EventTypes = {
  "BATTLE_FAINTED": [PokemonBattle, ActivePokemon]
  "BATTLE_VICTORY": [PokemonBattle, winners: BattleActor[], losers: BattleActor[], wasCaught: boolean]
}

export const CobblemonEvents = new TypedEventEmitter<EventTypes>()