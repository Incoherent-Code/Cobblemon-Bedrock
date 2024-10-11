import { BlockComponentStepOffEvent, BlockComponentStepOnEvent, BlockCustomComponent } from "@minecraft/server";
import { changeBlockState } from "../utils/BlockUtils";

export default class PressurePlateComponent implements BlockCustomComponent {
  constructor(
    public pressedState = "cobblemon:pressed"
  ) { }
  onStepOn(arg: BlockComponentStepOnEvent) {
    changeBlockState(arg.block, this.pressedState, true);
    arg.dimension.playSound("random.click", arg.block.location, { pitch: 0.8, volume: 0.3 });
  }
  onStepOff(arg: BlockComponentStepOffEvent) {
    changeBlockState(arg.block, this.pressedState, false);
    arg.dimension.playSound("random.click", arg.block.location, { pitch: 0.7, volume: 0.3 });
  }
}