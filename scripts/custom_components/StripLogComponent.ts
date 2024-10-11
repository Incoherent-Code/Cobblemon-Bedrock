import { BlockComponentPlayerInteractEvent, BlockCustomComponent, EntityInventoryComponent } from "@minecraft/server";
import { decrementDurability } from "../utils/ItemUtils";

export default class StripLogComponent implements BlockCustomComponent {
  /** Pass in the identifier for the stripped log block. */
  constructor(public strippedBlockName: string) { }
  onPlayerInteract(arg: BlockComponentPlayerInteractEvent) {
    if (!arg.player)
      return;
    let inventory = arg.player.getComponent("minecraft:inventory") as EntityInventoryComponent;
    if (inventory.container!.getSlot(arg.player.selectedSlotIndex).hasTag("minecraft:is_axe")) {
      let thisBlockState = arg.block.permutation.getState("minecraft:facing_direction");
      arg.block.setType(this.strippedBlockName);
      if (thisBlockState == undefined)
        throw new Error(`Block ${arg.block.typeId} does not have the block state ${"minecraft:facing_direction"}`);
      arg.block.setPermutation(arg.block.permutation.withState("minecraft:facing_direction", thisBlockState));
      decrementDurability(arg.player);
      arg.dimension.playSound("hit.wood", arg.block.location);
    }
  }
}