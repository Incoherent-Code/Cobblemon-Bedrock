//Fuck you mojang we cant have anything cool
//import { disableWatchdog } from "@minecraft/debug-utilities";
import { Player, ScriptEventCommandMessageAfterEvent, system } from "@minecraft/server";
import { battleMap } from "../battle";

export function registerDebugSettings() {
  //disableWatchdog(true);
  system.afterEvents.scriptEventReceive.subscribe(debugEventHandler)
}

export default function debugEventHandler(event: ScriptEventCommandMessageAfterEvent) {
  if (debugIDDictionary[event.id]) {
    if (event.sourceEntity && event.sourceEntity instanceof Player) {
      let player = event.sourceEntity as Player
      player.sendMessage("§eThe Debug Gods have heard you!");
    }
    debugIDDictionary[event.id](event);
  }
}

const debugIDDictionary: { [key: string]: Function } = {
  "cobblemon:get_own_dynamic_property": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!(event.sourceEntity && event.sourceEntity instanceof Player)) return;
    let player = event.sourceEntity as Player;
    player.sendMessage(`Property ${event.message}: ${player.getDynamicProperty(event.message)}`);
  },
  "cobblemon:set_own_dynamic_property": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!(event.sourceEntity && event.sourceEntity instanceof Player)) return;
    let player = event.sourceEntity as Player;
    let messageArray = event.message.split(" ");
    if (!(messageArray.length == 2)) {
      player.sendMessage("Syntax: <property> <value>");
      return
    }
    player.setDynamicProperty(messageArray[0], messageArray[1] === "undefined" ? undefined : messageArray[1]);
    player.sendMessage(`Set Dynamic Property ${messageArray[0]} to ${messageArray[1]}`);
  },
  "cobblemon:clear_own_dynamic_properties": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!event.sourceEntity) return;
    event.sourceEntity.clearDynamicProperties();
    if (event.sourceEntity instanceof Player) {
      (event.sourceEntity as Player).sendMessage(`Sucesfully applied "Dementia" to ${event.sourceEntity.name}`);
    }
  },
  "cobblemon:get_own_property": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!(event.sourceEntity && event.sourceEntity instanceof Player)) return;
    let player = event.sourceEntity as Player;
    player.sendMessage(`Property ${event.message}: ${player.getProperty(event.message)}`);
  },
  "cobblemon:set_own_property": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!(event.sourceEntity && event.sourceEntity instanceof Player)) return;
    let player = event.sourceEntity as Player;
    let messageArray: any[] = event.message.split(" ");
    if (!(messageArray.length == 2)) {
      player.sendMessage("Syntax: <property> <value>");
      return
    }
    if (Number(messageArray[1])) messageArray[1] = Number(messageArray[1])
    player.setProperty(messageArray[0], messageArray[1]);
    player.sendMessage(`Set Property ${messageArray[0]} to ${messageArray[1]}`);
  },
  "cobblemon:send_input_to_battle": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!(event.sourceEntity && event.sourceEntity instanceof Player)) return;
    let player = event.sourceEntity as Player;
    let messageArray: any[] = event.message.split(" ");
    if (messageArray.length < 2) {
      player.sendMessage("Syntax: <battleid> <input>");
      return
    }
    if (!battleMap.has(messageArray[0])) {
      player.sendMessage("Battle does not exist");
      return
    }
    let input = messageArray.slice(1).join(" ");
    battleMap.get(messageArray[0])?.battleStream.write(input);
  },
  "cobblemon:testResultOfCommand": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!(event.sourceEntity && event.sourceEntity instanceof Player)) return;
    let player = event.sourceEntity as Player;
    try {
      let response = player.runCommand(event.message);
      player.sendMessage(`Sucess count: ${response.successCount}`);
    }
    catch (e: any) {
      player.sendMessage(`Error: ${e.message}`);
    }
  },
  "cobblemon:get_own_id": function (event: ScriptEventCommandMessageAfterEvent) {
    if (!(event.sourceEntity && event.sourceEntity instanceof Player)) return;
    let player = event.sourceEntity as Player;
    player.sendMessage(player.id);
  }
};