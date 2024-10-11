//https://learn.microsoft.com/en-us/minecraft/creator/documents/customcomponents?view=minecraft-bedrock-stable
import { BlockCustomComponent, ItemCustomComponent, WorldInitializeBeforeEvent } from "@minecraft/server";
import { PCBottomComponent, PCTopComponent } from "./PCComponents";
import { EnforceTopHalfComponent, EnforceBottomHalfComponent } from "./DoubleBlockComponents";
import DoorComponent from "./DoorComponent"
import HealingMachineComponent from "./HealingMachineComponent";
import GiveLeftoversComponent from "./GiveLeftoversComponent";
import StripLogComponent from "./StripLogComponent";
import DropExpRewardComponent from "./DropExpRewardComponent";
import PlantComponent from "./PlantComponent";
import ApricornGeneratedComponent from "./ApricornGeneratedComponent";
import SaplingComponent from "./SaplingComponent";
import LeavesDecayComponent from "./LeavesDecayComponent";
import SlabComponent from "./SlabComponent";
import PressurePlateComponent from "./PressurePlateComponent";
import ButtonComponent from "./ButtonComponent";
import CannotFloatComponent from "./CannotFloatComponent";

const blockComponents: Record<string, BlockCustomComponent> = {
  "cobblemon:pc_bottom_component": new PCBottomComponent(),
  "cobblemon:pc_top_component": new PCTopComponent(),
  "cobblemon:healing_machine_component": new HealingMachineComponent(),
  "cobblemon:give_xp_reward_component": new DropExpRewardComponent(),
  "cobblemon:strip_apricorn_log": new StripLogComponent("cobblemon:stripped_apricorn_log"),
  "cobblemon:strip_apricorn_wood": new StripLogComponent("cobblemon:stripped_apricorn_wood"),
  "cobblemon:enforce_pc_top_half_component": new EnforceTopHalfComponent("cobblemon:pc_top", "minecraft:cardinal_direction"),
  "cobblemon:enforce_pc_bottom_half_component": new EnforceBottomHalfComponent("cobblemon:pc", "minecraft:cardinal_direction"),
  "cobblemon:black_apricorn_growth_component": new PlantComponent("blocks/apricorns/black_apricorn"),
  "cobblemon:blue_apricorn_growth_component": new PlantComponent("blocks/apricorns/blue_apricorn"),
  "cobblemon:green_apricorn_growth_component": new PlantComponent("blocks/apricorns/green_apricorn"),
  "cobblemon:pink_apricorn_growth_component": new PlantComponent("blocks/apricorns/pink_apricorn"),
  "cobblemon:red_apricorn_growth_component": new PlantComponent("blocks/apricorns/red_apricorn"),
  "cobblemon:white_apricorn_growth_component": new PlantComponent("blocks/apricorns/white_apricorn"),
  "cobblemon:yellow_apricorn_growth_component": new PlantComponent("blocks/apricorns/yellow_apricorn"),
  "cobblemon:apricorn_generated_component": new ApricornGeneratedComponent(),
  "cobblemon:black_apricorn_seed_component": new SaplingComponent("cobblemon:black_apricorn_tree"),
  "cobblemon:blue_apricorn_seed_component": new SaplingComponent("cobblemon:blue_apricorn_tree"),
  "cobblemon:green_apricorn_seed_component": new SaplingComponent("cobblemon:green_apricorn_tree"),
  "cobblemon:pink_apricorn_seed_component": new SaplingComponent("cobblemon:pink_apricorn_tree"),
  "cobblemon:red_apricorn_seed_component": new SaplingComponent("cobblemon:red_apricorn_tree"),
  "cobblemon:white_apricorn_seed_component": new SaplingComponent("cobblemon:white_apricorn_tree"),
  "cobblemon:yellow_apricorn_seed_component": new SaplingComponent("cobblemon:yellow_apricorn_tree"),
  "cobblemon:apricorn_leaves_component": new LeavesDecayComponent("cobblemon:apricorn_leaves", "empty"),
  "cobblemon:apricorn_slab_component": new SlabComponent("cobblemon:apricorn_slab", "dig.wood"),
  "cobblemon:pressure_plate_component": new PressurePlateComponent(),
  "cobblemon:button_component": new ButtonComponent(),
  "cobblemon:cannot_float_component": new CannotFloatComponent(),
  "cobblemon:door_component": new DoorComponent(),
  "cobblemon:apricorn_door_enforce_top_component": new EnforceTopHalfComponent("cobblemon:apricorn_door_top_left", "minecraft:cardinal_direction", "cobblemon:opened"),
  "cobblemon:apricorn_door_enforce_bottom_component": new EnforceBottomHalfComponent("cobblemon:apricorn_door_bottom_left", "minecraft:cardinal_direction", "cobblemon:opened")
}

const itemComponents: Record<string, ItemCustomComponent> = {
  "cobblemon:give_leftovers_component": new GiveLeftoversComponent()
}

export function registerCustomComponents(event: WorldInitializeBeforeEvent) {
  //Register Blocks
  Object.entries(blockComponents).forEach(([key, value]) => {
    event.blockComponentRegistry.registerCustomComponent(key, workAroundBlockWrapper(key));
  })
  //Register Items
  Object.entries(itemComponents).forEach(([key, value]) => {
    event.itemComponentRegistry.registerCustomComponent(key, value);
  })
}
/** Attempts to work around wierd bug where Component cannot make refrences to itself */
function workAroundBlockWrapper(key: string): BlockCustomComponent {
  let returnObj: BlockCustomComponent = {};
  if (blockComponents[key].beforeOnPlayerPlace != undefined) {
    returnObj.beforeOnPlayerPlace = (arg) => { blockComponents[key].beforeOnPlayerPlace?.(arg) }
  }
  if (blockComponents[key].onEntityFallOn != undefined) {
    returnObj.onEntityFallOn = (arg) => { blockComponents[key].onEntityFallOn?.(arg) }
  }
  if (blockComponents[key].onPlace != undefined) {
    returnObj.onPlace = (arg) => { blockComponents[key].onPlace?.(arg) }
  }
  if (blockComponents[key].onPlayerDestroy != undefined) {
    returnObj.onPlayerDestroy = (arg) => { blockComponents[key].onPlayerDestroy?.(arg) }
  }
  if (blockComponents[key].onPlayerInteract != undefined) {
    returnObj.onPlayerInteract = (arg) => { blockComponents[key].onPlayerInteract?.(arg) }
  }
  if (blockComponents[key].onRandomTick != undefined) {
    returnObj.onRandomTick = (arg) => { blockComponents[key].onRandomTick?.(arg) }
  }
  if (blockComponents[key].onStepOff != undefined) {
    returnObj.onStepOff = (arg) => { blockComponents[key].onStepOff?.(arg) }
  }
  if (blockComponents[key].onStepOn != undefined) {
    returnObj.onStepOn = (arg) => { blockComponents[key].onStepOn?.(arg) }
  }
  if (blockComponents[key].onTick != undefined) {
    returnObj.onTick = (arg) => { blockComponents[key].onTick?.(arg) }
  }

  return returnObj;
}