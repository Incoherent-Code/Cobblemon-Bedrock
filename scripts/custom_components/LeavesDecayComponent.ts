import { Block, BlockComponentOnPlaceEvent, BlockComponentPlayerDestroyEvent, BlockComponentPlayerPlaceBeforeEvent, BlockComponentRandomTickEvent, BlockComponentTickEvent, BlockCustomComponent, BlockPermutation, GameMode, ItemStack } from "@minecraft/server";
import { changeBlockState, tryChangeBlockState } from "../utils/BlockUtils";
import { decrementDurability, getItemInHand, spawnLootFromTable } from "../utils/ItemUtils";

export default class LeavesDecayComponent implements BlockCustomComponent {
  constructor(
    public blockIdentifier: string,
    public lootTable: string,
    public distanceFromLogState: string = "cobblemon:distance_from_log",
    public maxLogDistance: number = 4,
    public shouldDecayState: string = "cobblemon:decayable",
  ) { }
  beforeOnPlayerPlace(arg: BlockComponentPlayerPlaceBeforeEvent) {
    arg.permutationToPlace = BlockPermutation.resolve(this.blockIdentifier, { [this.shouldDecayState]: false });
  }
  //please set "minecraft:tick" interval to 10 ticks or so in the block
  onTick(arg: BlockComponentTickEvent) {
    this.refreshLogState(arg.block);
  }
  onRandomTick(arg: BlockComponentRandomTickEvent) {
    if (arg.block.permutation.getState(this.shouldDecayState) === false)
      return;
    let newLogDistance = this.refreshLogState(arg.block);
    if (newLogDistance >= this.maxLogDistance) {
      this.decay(arg.block);
    }
  }
  decay(block: Block) {
    block.setType("minecraft:air");
    spawnLootFromTable(block.location, block.dimension, this.lootTable);
  }
  refreshLogState(block: Block): number {
    var distNumbers = getNearbyBlocks(block)
      .filter(x => x != undefined)
      .map(x => {
        if (x.hasTag("log"))
          return 0;
        else if (x.typeId == this.blockIdentifier)
          return x.permutation.getState(this.distanceFromLogState)! as number
        else
          return this.maxLogDistance;
      });
    //Makes sure the result of this expression is always at most this.maxLogDistance
    let newLogDistance = Math.min((this.maxLogDistance - 1), ...distNumbers) + 1;
    tryChangeBlockState(block, this.distanceFromLogState, newLogDistance);
    return newLogDistance;
  }
  onPlayerDestroy(arg: BlockComponentPlayerDestroyEvent) {
    if (arg.player?.getGameMode() == GameMode.creative)
      return;
    if (arg.player !== undefined && getItemInHand(arg.player)?.typeId == "minecraft:shears") {
      arg.dimension.spawnItem(new ItemStack(this.blockIdentifier), arg.block.location);
      decrementDurability(arg.player);
    }
    else {
      spawnLootFromTable(arg.block.location, arg.dimension, this.lootTable);
    }
  }
}

function getNearbyBlocks(block: Block) {
  return [block.above(1), block.below(1), block.north(1), block.south(1), block.east(1), block.west(1)];
}