import { BlockComponentOnPlaceEvent, BlockCustomComponent } from "@minecraft/server";
import { getRandomIntBetween } from "../Pokemon";


export default class ApricornGeneratedClass implements BlockCustomComponent {
  onPlace(arg: BlockComponentOnPlaceEvent) {
    let permutation = arg.block.permutation;
    if (permutation.getState("cobblemon:needs_generation") !== true)
      return;

    //Tries to orient itself to leaves
    if (arg.block.north(1)?.hasTag("leaves")) {
      permutation = permutation.withState("minecraft:cardinal_direction", "north");
    }
    else if (arg.block.south(1)?.hasTag("leaves")) {
      permutation = permutation.withState("minecraft:cardinal_direction", "south");
    }
    else if (arg.block.east(1)?.hasTag("leaves")) {
      permutation = permutation.withState("minecraft:cardinal_direction", "east");
    }
    else if (arg.block.west(1)?.hasTag("leaves")) {
      permutation = permutation.withState("minecraft:cardinal_direction", "west");
    }
    else {//No leaves nearby
      arg.block.setType("minecraft:air");
      return;
    }
    permutation = permutation.withState("cobblemon:growth_state", getRandomIntBetween(0, 3));
    permutation = permutation.withState("cobblemon:needs_generation", false);
    arg.block.setPermutation(permutation);
  }
}