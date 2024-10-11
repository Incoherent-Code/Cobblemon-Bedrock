import { Block, BlockComponentOnPlaceEvent, BlockComponentPlayerInteractEvent, BlockComponentTickEvent, BlockCustomComponent } from "@minecraft/server";
import { BlockUtils } from "../utils";


export default class DoorComponent implements BlockCustomComponent {
  /**
   * Component for managing door states
   * @param openedState Boolean state that determines whether or not the door is open
   * @param lastRedstoneState Boolean state that determines whether the door was last activated by redstone
   */
  constructor(
    public openedState = "cobblemon:opened",
    public lastRedstoneState = "cobblemon:activated_by_redstone"
  ) { }
  onPlayerInteract(arg: BlockComponentPlayerInteractEvent) {
    let currentState = arg.block.permutation.getState(this.openedState);
    if (currentState === true) {
      this.close(arg.block);
    }
    else {
      this.open(arg.block);
    }
  }
  //This doesn't work on custom blocks, so theres no point binding an onTick()
  // onTick(arg: BlockComponentTickEvent) {
  //   let { [this.lastRedstoneState]: lastRedstoneState, [this.openedState]: openedState } = arg.block.permutation.getAllStates();
  //   let redstoneState = (arg.block.getRedstonePower()! > 0);
  //   if (redstoneState === lastRedstoneState)
  //     return;
  //   if (redstoneState && !lastRedstoneState) {
  //     if (!openedState)
  //       this.open(arg.block);
  //     BlockUtils.changeBlockState(arg.block, this.lastRedstoneState, true);
  //     return;
  //   }
  //   if (!redstoneState && lastRedstoneState) {
  //     if (openedState)
  //       this.close(arg.block);
  //     BlockUtils.changeBlockState(arg.block, this.lastRedstoneState, false);
  //     return;
  //   }
  // }
  open(block: Block) {
    BlockUtils.reloadBlock(block, { [this.openedState]: true })
    block.dimension.playSound("open.wooden_door", block);
  }
  close(block: Block) {
    BlockUtils.reloadBlock(block, { [this.openedState]: false })
    block.dimension.playSound("close.wooden_door", block);

  }
}