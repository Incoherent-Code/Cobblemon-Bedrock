import { Entity, Vector3 } from "@minecraft/server";

/** Calculates the distance between two locations / entities. */
export function DistanceBetween(location1: Entity | Vector3, location2: Entity | Vector3) {
  location1 = (location1 instanceof Entity) ? location1.location : location1;
  location2 = (location2 instanceof Entity) ? location2.location : location2;
  return Math.sqrt((location2.x - location1.x) ** 2 + (location2.y - location1.y) ** 2 + (location2.z - location1.z) ** 2);
}