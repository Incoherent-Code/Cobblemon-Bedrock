import { Dimension, DimensionLocation, Vector3, world } from "@minecraft/server";

export * as BlockUtils from "./BlockUtils";
export * as ItemUtils from "./ItemUtils";
export * as EntityUtils from "./EntityUtils";
export * as UUID from "./UUID";

/** Takes in text and removes all nonstandard characters from it and replaces spaces with underscores.
 * Almost Identical to the showndown function of the same name.
 */
export function toID(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Using passed in text, creates an identifier
 * @example
 *  toIdentifier("Fishy Flippin' Burger", "fan") //fan:fishy_flippin_burger
 */
export function toIdentifier(text: string, namespace = "cobblemon") {
  return `${namespace}:${toID(text)}`
}

export function removeNamespace(text: string) {
  let match = text.match(/:(.+)/);
  if (!match) {
    throw new Error("Could not remove namespace from " + text);
  }
  console.log("Match: " + match[1]);
  return match[1];
}

/** Same as remove namespace but returns the original string on failure. */
export function tryRemoveNamespace(text: string): string {
  try {
    return removeNamespace(text);
  }
  catch {
    return text;
  }
}

export const validDimensions = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];


/** Returns all valid dimensions in the world. */
export function getAllDimensions(): Dimension[] {
  return validDimensions.map(x => world.getDimension(x))
}

/** Converts to a dimension location. */
export function toDimensionLocation(location: Vector3, dimension: Dimension): DimensionLocation {
  return Object.assign({ dimension: dimension }, location);
}
/** Similar to Kotlin's Substring after. Returns the string after a delimiter.
 * If the delimiter is not present, the entire string is returned
 */
export function substringAfter(str: string, delimiter: string) {
  let split = str.split(delimiter);
  if (split.length == 1)
    return str;
  split.shift();
  return split.join(delimiter);
}