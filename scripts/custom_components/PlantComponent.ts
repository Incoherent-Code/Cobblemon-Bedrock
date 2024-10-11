import { BlockComponentPlayerInteractEvent, BlockComponentRandomTickEvent, BlockCustomComponent, EntityInventoryComponent, ItemStack } from "@minecraft/server";
import { decrementItemInHand } from "../utils/ItemUtils";

export default class PlantComponent implements BlockCustomComponent {
  /**
   * Custom Component that makes plant growth work
   * @param changeToGrowPerRandomTick Percent chance to grow each tick
   * @param lootTable Leave undefined if you don't want the plant to be harvestable by hand. (ex: blocks/apricorns/black_apricorn)
   * @param maxGrowth Higest the growth block state can reach
   * @param growthBlockState the state that the block uses to grow
   */
  constructor(
    public lootTable?: string,
    public changeToGrowPerRandomTick = 1 / 10,
    public maxGrowth = 3,
    public growthBlockState = "cobblemon:growth_state"
  ) { }
  onRandomTick(arg: BlockComponentRandomTickEvent) {
    if (!(Math.random() <= this.changeToGrowPerRandomTick))
      return;
    let currentGrowthState = arg.block.permutation.getState(this.growthBlockState);
    if (typeof currentGrowthState == "number" && currentGrowthState < (this.maxGrowth)) {
      arg.block.setPermutation(arg.block.permutation.withState((this.growthBlockState), currentGrowthState + 1));
    }
  }
  onPlayerInteract(arg: BlockComponentPlayerInteractEvent) {
    if (arg.player == undefined)
      return;
    let inventory = arg.player.getComponent("minecraft:inventory") as EntityInventoryComponent;
    let currentSlot = inventory.container!.getSlot(arg.player.selectedSlotIndex);
    let currentGrowthState = arg.block.permutation.getState(this.growthBlockState);
    if (typeof currentGrowthState != "number")
      throw new Error(`Block ${arg.block.typeId} does not have growth state ${this.growthBlockState}`);
    if (currentSlot.getItem()?.typeId == "minecraft:bone_meal" && currentGrowthState < (this.maxGrowth)) {

      decrementItemInHand(arg.player);
      arg.block.setPermutation(arg.block.permutation.withState(this.growthBlockState, currentGrowthState + 1));
      arg.dimension.spawnParticle("minecraft:crop_growth_emitter", arg.block.location);
      arg.dimension.playSound("item.bone_meal.use", arg.block.location)
    }
    //If not being bonemealed
    else {
      if (typeof currentGrowthState == "number" && currentGrowthState == this.maxGrowth) {
        arg.block.setPermutation(arg.block.permutation.withState(this.growthBlockState, 0));
        arg.dimension.runCommandAsync(`loot spawn ${arg.block.location.x} ${arg.block.location.y} ${arg.block.location.z} loot "${this.lootTable}"`);
      }

    }
  }
}