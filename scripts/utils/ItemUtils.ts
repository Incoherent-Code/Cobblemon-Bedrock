import { Dimension, DimensionLocation, EnchantmentType, EnchantmentTypes, EntityInventoryComponent, GameMode, ItemStack, Player, Vector3, } from "@minecraft/server";

export function getItemInHand(player: Player) {
  let inventory = player.getComponent("minecraft:inventory")!;
  return inventory.container!.getItem(player.selectedSlotIndex);
}
/** Decrements the item stack in the players hand if not in creative */
export function decrementItemInHand(player: Player) {
  if (player.getGameMode() == GameMode.creative)
    return;
  let inventory = player.getComponent("minecraft:inventory")!;
  let currentSlot = inventory.container!.getSlot(player.selectedSlotIndex);
  let item = currentSlot.getItem();
  //Nothing in hand
  if (item == undefined || item.amount == 0)
    return;
  if (item.amount == 1) {
    currentSlot.setItem(new ItemStack("minecraft:air"));
  }
  else {
    currentSlot.amount--;
  }
}

export function spawnLootFromTable(location: Vector3, dimension: Dimension, lootTable: string) {
  dimension.runCommandAsync(`loot spawn ${location.x} ${location.y} ${location.z} loot ${lootTable}`);
}
/** Decrements the durability of the item in the players hand if not in creative */
export function decrementDurability(player: Player) {
  if (player.getGameMode() == GameMode.creative)
    return;
  let inventory = player.getComponent("minecraft:inventory")!;
  let currentSlot = inventory.container!.getSlot(player.selectedSlotIndex);
  let item = currentSlot.getItem();
  //Nothing in hand or no durability
  if (item == undefined || item.amount == 0 || !item.hasComponent("minecraft:durability"))
    return;
  let enchants = item.getComponent("minecraft:enchantable");
  let unbreakingLevel = enchants?.getEnchantment("unbreaking")?.level ?? 0;
  let durability = item.getComponent("minecraft:durability")!;
  if (durability.getDamageChance(unbreakingLevel) < Math.random()) {
    durability.damage--;
    currentSlot.setItem(item);
  }
}

export function givePlayerItem(player: Player, item: ItemStack) {
  let inventory = player.getComponent("inventory")?.container;
  if (inventory === undefined)
    throw new Error(`Could not retrieve inventory from ${player.name}!`);
  inventory.addItem(item);
}