import { ItemCustomComponent, ItemComponentConsumeEvent, Player, ItemStack } from "@minecraft/server";

export default class GiveLeftoversComponent implements ItemCustomComponent {
  onConsume(arg: ItemComponentConsumeEvent) {
    if (!(arg.source instanceof Player))
      return;
    let player = arg.source as Player;
    //1 and 16 chance to get leftovers
    if ((Math.random() * 16) > 15) {
      player.getComponent("inventory")?.container?.addItem(new ItemStack("cobblemon:leftovers", 1));
    }
  }
}