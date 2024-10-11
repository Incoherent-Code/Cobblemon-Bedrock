import { RawMessage } from "@minecraft/server";
import { PokemonData } from "../Pokemon";
import { ColorCodes } from "./ColorCodes";

/** Renders an error message for the player. (Basically changes the text color to red.) */
export function error(translation: string | RawMessage) {
  return prefix(ColorCodes.Red, translation);
}

/** Renders a warning message for the player */
export function warn(translation: string | RawMessage) {
  return prefix(ColorCodes.Gold, translation);
}

/** Adds a prefix to a given translation */
export function prefix(prefix: string, translation: string | RawMessage): RawMessage {
  return { rawtext: [{ text: prefix }, (typeof translation === "string") ? { text: translation } : translation] }
}

/** Invokes the provided translation with the provided arguments
 * @param translation Either the RawMessage or translation string (Does not work with standard text strings)
 */
export function With(translation: RawMessage | string, With: (string | RawMessage | PokemonData)[] = []) {
  let newTranslation = (typeof translation === "string") ? { translate: translation } : Object.assign({}, translation); //Shallow Copy
  if (With.length == 0)
    return newTranslation;
  newTranslation.with = {
    rawtext: With.map(x => {
      return (x instanceof PokemonData) ? x.getTranslatedName()
        : (typeof x == "string") ? { text: x }
          : x
    })
  }
  return newTranslation;
}

/** Converts a string into a RawMessage */
export function toMessage(message: string): RawMessage {
  return { text: message };
}

/** Gets translation using translation key. */
export function translate(translate: string): RawMessage {
  return { translate: translate };
}

/** Returns a battle translation (cobblemon.battle.(provided key)) */
export function battleMsg(translate: string, Wif: (string | RawMessage | PokemonData)[] = []): RawMessage {
  return With(`cobblemon.battle.${translate}`, Wif);
}

/** Colors the text in a certain color. */
export function color(color: keyof typeof ColorCodes, message: RawMessage) {
  return prefix(ColorCodes[color], message);
}