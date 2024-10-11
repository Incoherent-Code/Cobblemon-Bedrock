import { BlockComponentPlayerInteractEvent, BlockCustomComponent, system } from "@minecraft/server";
import { BlockUtils } from "../utils";

export default class ButtonCompnent implements BlockCustomComponent {
  constructor(
    public pressedState = "cobblemon:pressed"
  ) { }
  onPlayerInteract(arg: BlockComponentPlayerInteractEvent) {
    if (arg.block.permutation.getState(this.pressedState) === true)
      return;
    BlockUtils.changeBlockState(arg.block, this.pressedState, true);
    arg.block.dimension.playSound("click_on.cherry_wood_button", arg.block.location, { pitch: 0.6 });
    //Not great solution but ok for now (its not like these blocks are functional anyways)
    system.runTimeout(() => {
      if (arg.block.isValid()) {
        BlockUtils.changeBlockState(arg.block, this.pressedState, false);
        arg.block.dimension.playSound("click_off.cherry_wood_button", arg.block.location, { pitch: 0.5 });
      }
    }, 25);
  }
}