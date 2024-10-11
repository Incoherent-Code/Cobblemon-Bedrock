import { Vector3, BlockCustomComponent, BlockComponentPlayerDestroyEvent, BlockComponentPlayerInteractEvent, system, Block, BlockComponentOnPlaceEvent, BlockComponentRandomTickEvent, BlockComponentPlayerPlaceBeforeEvent, GameMode, BlockPermutation, Dimension } from "@minecraft/server";
import { getRandomIntBetween, PokemonData } from "../Pokemon";
import { getTeam, healPlayerTeam } from "../pokemonStorage";
import { message } from "../language";
import { cleanUpStaleBattleData } from "../battle";

const ticksPerPokeballPlace = 10;
const waitTicks = 10;
const pokemonHealedPerUnit = 2;

const pokeballLocations: { [key: number]: Vector3 } = {
  0: { x: 0.36, y: 0.7, z: 0.25 },
  1: { x: 0.64, y: 0.7, z: 0.25 },
  2: { x: 0.36, y: 0.7, z: 0.5 },
  3: { x: 0.64, y: 0.7, z: 0.5 },
  4: { x: 0.36, y: 0.7, z: 0.75 },
  5: { x: 0.64, y: 0.7, z: 0.75 }
}

export default class HealingMachineComponent implements BlockCustomComponent {
  onPlayerDestroy(arg: BlockComponentPlayerDestroyEvent) {
    arg.block.dimension.getEntities({ location: arg.block.location, families: ["pokeball_dummy"], maxDistance: 1 }).forEach(x => x.triggerEvent("cobblemon:instant_kill"));
  }
  async onPlayerInteract(arg: BlockComponentPlayerInteractEvent) {
    if (arg.block.permutation.getState("cobblemon:busy")) return;
    if (!arg.player) return;
    cleanUpStaleBattleData(arg.player);
    if (arg.player.getDynamicProperty('in_battle') !== undefined) {
      arg.player.sendMessage(message.color("Red", { translate: "cobblemon.healingmachine.inbattle" }));
      return;
    }
    let team = getTeam(arg.player);
    if (team === undefined) return;
    let validTeam = team.filter(x => x != null);
    if (validTeam.length === 0) return;
    let healTeam = validTeam.filter(x => x!.currentHealth != x!.maxHealth || x!.status != undefined || !x.movesInfo.every(x => x.pp == x.maxPp));
    if (healTeam.length === 0) {
      arg.player.sendMessage({ translate: "cobblemon.healingmachine.alreadyhealed" });
      return;
    }
    let currentCharge = arg.block.permutation.getState("cobblemon:charge")! as number;
    let needeCharge = Math.floor(healTeam.length / pokemonHealedPerUnit)
    if (currentCharge < needeCharge) {
      arg.player.sendMessage(message.With("cobblemon.healingmachine.notenoughcharge", [(needeCharge - currentCharge).toString()]));
      return;
    }
    arg.block.setPermutation(arg.block.permutation
      .withState("cobblemon:busy", true)
      .withState("cobblemon:charge", arg.block.permutation.getState("cobblemon:charge") as number - Math.floor(healTeam.length / pokemonHealedPerUnit)));
    team.forEach(x => x?.return(arg.player!))
    system.runTimeout(() => this.spawnPokeball(arg, team.filter(x => x !== null), 0), waitTicks);
  }
  spawnPokeball(arg: BlockComponentPlayerInteractEvent, pokemonData: PokemonData[], currentIndex: number) {
    if (!arg.block.isValid() || arg.block.typeId != "cobblemon:healing_machine") {
      this.killAllPokeballs(arg.dimension, arg.block.location);
      return;
    }
    if (arg.player === undefined || !arg.player.isValid()) {
      this.cleanup(arg.block);
      return;
    }
    if (pokemonData[currentIndex] != null) {
      let direction = arg.block.permutation.getState("minecraft:cardinal_direction") as string | undefined;
      let pLocation = pokeballLocations[currentIndex];
      let location: Vector3;
      let facingLocation: Vector3;
      switch (direction) {
        case "north":
          location = Vector3Math.add(pLocation, arg.block.location);
          facingLocation = Vector3Math.add(location, { x: 0, y: 0, z: 1 });
          break;
        case "south":
          location = Vector3Math.add({ x: (1 - pLocation.x), y: pLocation.y, z: (1 - pLocation.z) }, arg.block.location);
          facingLocation = Vector3Math.add(location, { x: 0, y: 0, z: -1 });
          break;
        case "west":
          location = Vector3Math.add({ x: (1 - pLocation.z), y: pLocation.y, z: pLocation.x }, arg.block.location);
          facingLocation = Vector3Math.add(location, { x: 1, y: 0, z: 0 });
          break;
        case "east":
        default:
          location = Vector3Math.add({ x: pLocation.z, y: pLocation.y, z: (1 - pLocation.x) }, arg.block.location);
          facingLocation = Vector3Math.add(location, { x: -1, y: 0, z: 0 });
          break;
      }
      //There are not enough options with dimension.spawnEntity
      arg.dimension.runCommand(`summon cobblemon:${pokemonData[currentIndex]!.pokeball || "poke_ball"}_dummy ${location.x} ${location.y} ${location.z} facing ${facingLocation.x} ${facingLocation.y} ${facingLocation.z}`);
    }
    //Finish the heal
    if (pokemonData.length == currentIndex + 1 || currentIndex >= pokemonData.length - 1) {
      system.runTimeout(() => this.healTeam(arg), waitTicks);
    }
    //Continue Iterating
    else {
      system.runTimeout(() => this.spawnPokeball(arg, pokemonData, currentIndex + 1), ticksPerPokeballPlace);
    }
  }
  healTeam(arg: BlockComponentPlayerInteractEvent) {
    if (!arg.block.isValid() || arg.block.typeId != "cobblemon:healing_machine") {
      this.killAllPokeballs(arg.dimension, arg.block.location);
      return;
    }
    if (arg.player === undefined || !arg.player.isValid()) {
      this.cleanup(arg.block);
      return;
    }
    arg.block.setPermutation(arg.block.permutation.withState("cobblemon:active", true));
    arg.dimension.playSound("healing_machine.active", arg.block.location);
    system.runTimeout(() => {
      this.cleanup(arg.block);
      healPlayerTeam(arg.player!);
    }, 37);
  }
  cleanup(block: Block) {
    block.setPermutation(block.permutation.withState("cobblemon:busy", false).withState("cobblemon:active", false));
    this.killAllPokeballs(block.dimension, block.location);
  }
  killAllPokeballs(dimension: Dimension, location: Vector3) {
    dimension.getEntities({ location: location, families: ["pokeball_dummy"], maxDistance: 2 }).forEach(x => x.triggerEvent("cobblemon:instant_kill"));
  }
  onRandomTick(arg: BlockComponentRandomTickEvent) {
    let charge = arg.block.permutation.getState("cobblemon:charge")
    if (!(typeof charge == "number"))
      return;
    if (charge < 15 && getRandomIntBetween(1, 3) == 3) {
      arg.block.setPermutation(arg.block.permutation.withState("cobblemon:charge", charge + 1));
    }
  }
  beforeOnPlayerPlace(arg: BlockComponentPlayerPlaceBeforeEvent) {
    if (arg.player != undefined && arg.player.getGameMode() == GameMode.creative) {
      arg.permutationToPlace = arg.permutationToPlace.withState("cobblemon:charge", 15);
    }
  }
}

class Vector3Math {
  static add(one: Vector3, two: Vector3) {
    return { x: one.x + two.x, y: one.y + two.y, z: one.z + two.z }
  }
}