import { BlockComponentOnPlaceEvent, BlockComponentPlayerDestroyEvent, BlockComponentRandomTickEvent, BlockComponentTickEvent, BlockCustomComponent } from "@minecraft/server";
import { BlockUtils } from "../utils";

export class EnforceTopHalfComponent implements BlockCustomComponent {
  directionStates: string[]
  constructor(public topHalfIdentifier: string, ...directionStates: string[]) {
    this.directionStates = directionStates;
  }
  onTick(arg: BlockComponentTickEvent) {
    if (!(arg.block.above(1)?.typeId == this.topHalfIdentifier)) {
      let location = arg.block.location;
      arg.dimension.runCommandAsync(`setblock ${location.x} ${location.y} ${location.z} air destroy`);
    }
  }
  onPlayerDestroy(arg: BlockComponentPlayerDestroyEvent) {
    let location = arg.block.location;
    arg.dimension.runCommandAsync(`setblock ${location.x} ${location.y + 1} ${location.z} air destroy`);
  }
  onPlace(arg: BlockComponentOnPlaceEvent) {
    let aboveBlock = arg.block.above(1);
    if (aboveBlock == undefined)
      throw new Error("Unable to get or set top half block.");
    if (BlockUtils.replacableBlocks.includes(aboveBlock.typeId)) {
      aboveBlock.setType(this.topHalfIdentifier);
    }
    else if (!(aboveBlock.typeId == this.topHalfIdentifier)) {
      let location = arg.block.location;
      arg.dimension.runCommandAsync(`setblock ${location.x} ${location.y} ${location.z} air destroy`);
      return;
    }
    if (this.directionStates.length > 0) {
      BlockUtils.loadStates(aboveBlock, Object.fromEntries(
        Object.entries(arg.block.permutation.getAllStates())
          .filter(x => this.directionStates.includes(x[0]))
      ));
    }
  }
}

export class EnforceBottomHalfComponent implements BlockCustomComponent {
  directionStates: string[]
  constructor(public bottomHalfIdentifier: string, ...directionStates: string[]) {
    this.directionStates = directionStates;
  }
  onTick(arg: BlockComponentTickEvent) {
    if (!(arg.block.below(1)?.typeId == this.bottomHalfIdentifier)) {
      let location = arg.block.location;
      arg.dimension.runCommandAsync(`setblock ${location.x} ${location.y} ${location.z} air destroy`);
    }
  }
  onPlayerDestroy(arg: BlockComponentPlayerDestroyEvent) {
    let location = arg.block.location;
    arg.dimension.runCommandAsync(`setblock ${location.x} ${location.y - 1} ${location.z} air destroy`);
  }
  onPlace(arg: BlockComponentOnPlaceEvent) {
    let aboveBlock = arg.block.below(1);
    if (aboveBlock == undefined)
      throw new Error("Unable to get or set top half block.");
    if (BlockUtils.replacableBlocks.includes(aboveBlock.typeId)) {
      aboveBlock.setType(this.bottomHalfIdentifier);
    }
    else if (!(aboveBlock.typeId == this.bottomHalfIdentifier)) {
      let location = arg.block.location;
      arg.dimension.runCommandAsync(`setblock ${location.x} ${location.y} ${location.z} air destroy`);
      return;
    }
    if (this.directionStates.length > 0) {
      BlockUtils.loadStates(aboveBlock, Object.fromEntries(
        Object.entries(arg.block.permutation.getAllStates())
          .filter(x => this.directionStates.includes(x[0]))
      ));
    }
  }
}