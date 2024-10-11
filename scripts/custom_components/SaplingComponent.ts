import { Block, BlockComponentPlayerInteractEvent, BlockComponentRandomTickEvent, BlockCustomComponent, EntityInventoryComponent, ItemStack, StructureManager, Vector3 } from "@minecraft/server";
import { decrementItemInHand } from "../utils/ItemUtils";

export default class SaplingComponent implements BlockCustomComponent {
  /**
   * Component used for saplings
   * @param structureID Structure to load when the sapling grows
   * @param offset Offset from corner to place the structure
   * @param chanceToGrowPerRandomTick Chance to grow per random tick
   * @param maxGrowth Maximum growth state
   * @param growthBlockState id of state used to keep track of growth
   */
  constructor(
    public structureID: string,
    public offset: Vector3 = { x: -3, y: 0, z: -3 },
    public chanceToGrowPerRandomTick = 1 / 10,
    public maxGrowth = 3,
    public growthBlockState = "cobblemon:growth_state"
  ) { }
  becomeTree(block: Block) {
    //I have no idea how you are supposed to get an instance of the StructureManager class.
    block.dimension.runCommand(`structure load ${this.structureID} ${block.location.x + this.offset.x} ${block.location.y + this.offset.y} ${block.location.z + this.offset.z}`);
  }
  grow(block: Block) {
    let currentGrowthState = block.permutation.getState(this.growthBlockState);
    if (typeof currentGrowthState == "number") {
      if (currentGrowthState < (this.maxGrowth)) {
        block.setPermutation(block.permutation.withState(this.growthBlockState, currentGrowthState + 1));
      }
      else if (currentGrowthState == this.maxGrowth) {
        this.becomeTree(block);
      }
    }
  }
  onRandomTick(arg: BlockComponentRandomTickEvent) {
    if (Math.random() <= (this.chanceToGrowPerRandomTick))
      this.grow(arg.block);
  }
  onPlayerInteract(arg: BlockComponentPlayerInteractEvent) {
    if (arg.player == undefined)
      return;
    let inventory = arg.player.getComponent("minecraft:inventory") as EntityInventoryComponent;
    let currentSlot = inventory.container!.getSlot(arg.player.selectedSlotIndex);
    let currentItem = currentSlot.getItem();
    let currentGrowthState = arg.block.permutation.getState(this.growthBlockState);
    //If there's nothing in their hand
    if (currentItem == undefined)
      return;
    if (typeof currentGrowthState != "number")
      throw new Error(`Block ${arg.block.typeId} does not have growth state ${this.growthBlockState}`);
    if (currentItem.typeId == "minecraft:bone_meal" && currentGrowthState <= this.maxGrowth) {

      decrementItemInHand(arg.player);
      this.grow(arg.block);
      arg.dimension.spawnParticle("minecraft:crop_growth_emitter", arg.block.location);
      arg.dimension.playSound("item.bone_meal.use", arg.block.location);
    }
  }
}