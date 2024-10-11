import { Player, RawMessage } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";

/** Shows an ok dialog to the player. */
export async function okDialog(player: Player, bodyText: string | RawMessage, title?: string | RawMessage) {
  let gui = new MessageFormData()
    .body(bodyText)
    .button1({ translate: "dr.button.ok" })

  if (title)
    gui.title(title);
  await gui.show(player);
}