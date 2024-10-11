import { Dex } from "../showdown/sim";
import { substringAfter, toID } from "../utils";
import { PokemonBattle } from "./PokemonBattle";

const SEPARATOR = "|";
const OPTIONAL_ARG_START = "[";
const OPTIONAL_ARG_END = "]"
const PNX_MATCHER = /p\d[a-c]/;
const SHOWDOWN_REGEX = /[^a-z0-9]+/;

export class BattleMessage {
  id: string = ""
  args: string[] = []
  optionalArguments: Record<string, string> = {}
  optionalArgumentMatcher = new RegExp(`^\\${OPTIONAL_ARG_START}([^]]+)${OPTIONAL_ARG_END}`)

  constructor(
    public rawMessage: string
  ) {
    //Parses the string
    let message = rawMessage.trim();
    if (!message.startsWith(SEPARATOR) || message == SEPARATOR)
      return;

    let messageArray = message.split(SEPARATOR);
    messageArray.shift();
    this.id = messageArray.shift()!;
    while (messageArray.length > 0) {
      let currentData = messageArray.shift()!;
      let optionalArgument = this.optionalArgumentMatcher.exec(currentData);
      if (optionalArgument != null) {
        let result = optionalArgument[0];
        let id = result.substring(1, result.length - 1);
        let value = currentData.split(result)[1].trim();
        this.optionalArguments[id] = value;
      }
      else {
        this.args.push(currentData);
      }
    }
  }
  /**
   * Get an argument at the given [index].
   *
   * @param index The index of the expected argument.
   * @return The argument if existing or null.
   */
  argumentAt(index: number): string | undefined {
    return this.args[index];
  }
  /**
   * Get an optional argument with the given [name].
   * This returns the data of the argument only.
   *
   * @param name The name of the optional argument.
   * @return The argument data if existing or null.
   */
  optionalArgument(name: string): string | undefined {
    return this.optionalArgument[name.toLowerCase()];
  }
  /**
   * Checks if an optional argument is present.
   * [optionalArgument] is null safe, this method is meant as a way to check 'flags' as some optional arguments contain no data.
   *
   * @param name The name of the optional argument.
   * @return True if the argument is present.
   */
  hasOptionalArgument(name: string): boolean {
    return (this.optionalArgument(name) != undefined);
  }

  pokemonByUuid(index: number, battle: PokemonBattle) {
    return battle.actors.flatMap(x => x.pokemon).find(x => x.uuid == this.argumentAt(index))
  }
  /**
   * Queries an argument at the given [index] for a 'pnx' that will be parsed into a [BattleActor] and [ActiveBattlePokemon].
   *
   * @param index The index of the argument containing the [BattleActor] and [ActiveBattlePokemon].
   * @param battle The [PokemonBattle] being queried.
   * @return A pair of [BattleActor] and [ActiveBattlePokemon] if the argument exists and successfully parses them otherwise null.
   */
  actorAndActivePokemon(index: number, battle: PokemonBattle) {
    let posAndUUID = this.showdownPositionAndUUID(index);
    if (!posAndUUID)
      return undefined;
    return this.tryActorAndActivePokemon(posAndUUID[0], battle);
  }
  /** Note: Unlike kotlin, this will only return pokemon that are currently out in battle.
   * Use .getPokemon() if the pokemon is not necessairly out in the battle.
   */
  getBattlePokemon(index: number, battle: PokemonBattle) {
    let argument = this.argumentAt(index);
    if (!argument || argument.length < 2)
      return undefined;
    let [actorID, PokemonID] = argument.split(": ");
    return this.tryGetBattlePokemon(actorID, PokemonID, battle);
  }

  /** Same as getBattlePokemon, but does not necessairly return an active pokmeon. */
  getPokemon(index: number, battle: PokemonBattle) {
    let argument = this.argumentAt(index);
    if (!argument || argument.length < 2)
      return undefined;
    let [actorID, PokemonID] = argument.split(": ");
    return battle.getPokemon(PokemonID);
  }

  getSourceBattlePokemon(battle: PokemonBattle) {
    let sourcePokemonArgument = this.optionalArguments["of"];
    if (!sourcePokemonArgument || sourcePokemonArgument.length < 2)
      return undefined;
    let [actorID, pokemonID] = sourcePokemonArgument.split(": ");
    return this.tryGetBattlePokemon(actorID, pokemonID, battle);
  }

  /**
 * Deconstructs the Showdown ID of a Pokemon at the given [index] into its 'pnx' and 'uuid' parts.
 *
 * @param index The index of the argument containing the Showdown ID of a Pokemon.
 * @return A 'pnx' String representing position and a 'uuid' String representing the unique Pokemon if parsed correctly, otherwise undefined.
 */
  showdownPositionAndUUID(index: number): [string, string] | undefined {
    let argument = this.argumentAt(index)?.split(":")
    if (!argument || argument.length != 2)
      return undefined;
    let pnx = argument[0];
    if (!PNX_MATCHER.test(pnx))
      return undefined
    let uuid = argument[1].trim();
    return [pnx, uuid];
  }

  /**
 * Attempts to parse an [Effect] from an argument at the given [index].
 *
 * @param index The index of the expected argument.
 * @return The parsed [Effect] or null.
 */
  effectAt(index: number) {
    let data = this.argumentAt(index);
    if (!data)
      return undefined;
    return Effect.parse(data);
  }

  /**
 * Attempts to parse an [Effect] from an optional argument.
 *
 * @param argumentName The name of the optional argument.
 * @return The parsed [Effect] or null.
 */
  effect(argumentName = "from") {
    let data = this.optionalArgument(argumentName);
    if (!data)
      return undefined;
    return Effect.parse(data);
  }

  moveAt(index: number) {
    let argument = this.argumentAt(index);
    if (!argument)
      return undefined;
    let move = Dex.moves.get(argument);
    //More consistent implimentation with kotlin
    if (!move.exists)
      return undefined;
    return move;
  }
  /**
   * Queries an optional argument with given [argumentName] for a 'pnx' that will be parsed into a [BattleActor] and [ActiveBattlePokemon].
   *
   * @param battle The [PokemonBattle] being queried.
   * @param argumentName The name of the optional argument.
   * @return A pair of [BattleActor] and [ActiveBattlePokemon] if the argument exists and successfully parses them otherwise null.
   */
  actorAndActivePokmeonFromOptional(battle: PokemonBattle, argumentName = "of") {
    let position = this.optionalArgument(argumentName);
    if (!position || position.length < 3)
      return undefined;
    return this.tryActorAndActivePokemon(position, battle);
  }

  /**
 * Pushes the given string down into the next argument.
 *
 * @param message The current state of the message.
 * @return A substring of [message] after the first [SEPARATOR] or empty if no [SEPARATOR] remains.
 */
  private push(message: string) {
    let messageArray = message.split(SEPARATOR);
    messageArray.shift();
    return messageArray.join(SEPARATOR);
  }
  /**
   * A utility to wrap [PokemonBattle.getActorAndActiveSlotFromPNX] to make it nullable instead of throwing an exception.
   *
   * @param pnx The raw pnx.
   * @param battle The [PokemonBattle] being queried.
   * @returnA pair of [BattleActor] and [ActiveBattlePokemon] if [PokemonBattle.getActorAndActiveSlotFromPNX] executes without any exception being thrown or else null.
   */
  private tryActorAndActivePokemon(position: string, battle: PokemonBattle) {
    try {
      return battle.getActorAndActiveSlotFromShowdownPosition(position)
    }
    catch {
      return undefined;
    }
  }

  private tryGetBattlePokemon(position: string, pokemonUUID: string, battle: PokemonBattle) {
    try {
      return battle.getActivePokemon(position, pokemonUUID)[1];
    }
    catch {
      return undefined;
    }
  }
}

/** The many different effect types and their prefixes */
export enum EffectType {
  ABILITY = "ability:",
  ITEM = "item:",
  MOVE = "move:",
  BAGITEM = "bagitem:",
  PURE = ""
}

export class Effect {
  constructor(
    public id: string,
    public type: EffectType,
    public rawData: string
  ) { }
  get typelessData() {
    return substringAfter(this.rawData, this.type).trim();
  }

  /**
 * Creates an [Effect].
 * BEDROCK: I think this is intended to create a translate CobblemonEffect
 *
 * @param id The ID of the effect, this may be validated
 * @param type The [Effect.Type].
 * @param rawData The received string in the battle message.
 * @return An [Effect] containing the given data of the given [type].
 */
  static of(id: string, type: EffectType, rawData: string) {
    return new Effect(id, type, rawData);
  }

  /**
 * Creates an [Effect] with type [Effect.Type.ABILITY].
 *
 * @param id The ID of the effect, meant to be present in [Abilities].
 * @param rawData The received string in the battle message.
 * @return An [Effect] containing the given data of [Effect.Type.ABILITY].
 *
 * @throws IllegalArgumentException If the [id] cannot be found in the [Abilities] registry.
 */
  static ability(id: string, rawData: string): Effect {
    if (!Dex.abilities.get(id).exists)
      throw new Error(`Cannot instance ability effect with ID ${id}`);
    return Effect.of(id, EffectType.ABILITY, rawData);
  }

  /**
 * Creates an [Effect] with type [Effect.Type.ITEM].
 *
 * @param id The ID of the effect. This should be trusted as Showdown keeps the held items on their end.
 * @param rawData The received string in the battle message.
 * @return An [Effect] containing the given data of [Effect.Type.ITEM].
 */
  static item(id: string, rawData: string) {
    return Effect.of(id, EffectType.ITEM, rawData);
  }

  /**
 * Creates an [Effect] with type [Effect.Type.MOVE].
 *
 * @param id The ID of the effect, meant to be present in [Moves].
 * @param rawData The received string in the battle message.
 * @return An [Effect] containing the given data of [Effect.Type.MOVE].
 *
 * @throws IllegalArgumentException If the [id] cannot be found in the [Moves] registry.
 */
  static move(id: string, rawData: string): Effect {
    if (!Dex.moves.get(id).exists)
      throw new Error(`Cannot instance move effect with ID ${id}`);
    return Effect.of(id, EffectType.MOVE, rawData);
  }

  /**
 * Creates a "pure" [Effect].
 * This is the representation of a purely literal effect by Showdown.
 *
 * @param id The ID of the effect.
 * @param rawData The received string in the battle message.
 * @return An [Effect] containing the given data of [Effect.Type.PURE].
 */
  static pure(id: string, rawData: string) {
    return Effect.of(id, EffectType.PURE, rawData);
  }

  static parse(rawData: string) {
    if (rawData == "")
      return undefined;
    try {
      if (rawData.startsWith(EffectType.ABILITY))
        return Effect.ability(toID(rawData.split(EffectType.ABILITY)[1]), rawData);
      else if (rawData.startsWith(EffectType.ITEM))
        return Effect.item(toID(rawData.split(EffectType.ITEM)[1]), rawData);
      else if (rawData.startsWith(EffectType.MOVE))
        return Effect.move(toID(rawData.split(EffectType.MOVE)[1]), rawData);
      else
        return Effect.pure(toID(rawData), rawData);
    }
    catch {
      return undefined;
    }
  }
}