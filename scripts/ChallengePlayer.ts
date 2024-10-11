import { Player, system, world } from "@minecraft/server";
import { battleMap, cleanUpStaleBattleData, startBattleBetween2Players } from "./battle";

/** Key is Entity ID of player, and value is list of entity ids of other players challenging them */
const activeChallenges: Map<string, string[]> = new Map();
const ticksUntilChallengeExpires = 1200;

export default function handleChallenge(challenger: Player, challengee: Player) {
  cleanUpStaleBattleData(challenger);
  cleanUpStaleBattleData(challengee);

  let challengerInBattle = challenger.getDynamicProperty("in_battle");
  //If they are already in a battle together
  if (challengerInBattle && challengerInBattle === challengee.getDynamicProperty("in_battle")) {
    let battle = battleMap.get(challengerInBattle as string);

    if (battle === undefined)
      return;

    let playerParticipant = battle.actors.find(x => x.actor.id == challenger.id);
    playerParticipant?.promptPlayerForRequest();
    return;
  }

  if (challenger.getProperty("cobblemon:in_battle") === true) {
    challenger.sendMessage({ translate: "cobblemon.capture.in_battle" });
    return;
  }
  else if (challengee.getProperty("cobblemon:in_battle") === true) {
    challenger.sendMessage({ translate: "cobblemon.capture.in_battle" });
    return;
  }

  //If Player is accepting a challenge
  let challengers = activeChallenges.get(challenger.id);
  if (challengers != undefined && challengers.includes(challengee.id)) {
    acceptChallenge(challenger, challengee);
    return;
  }

  if (activeChallenges.has(challengee.id)) {
    //Ignores Attempt if they have already challenged this person
    if (!activeChallenges.get(challengee.id)!.includes(challenger.id)) {
      issueChallenge(challenger, challengee);
    }
  } //If Player has no active challenges
  else {
    issueChallenge(challenger, challengee);
  }
}

function issueChallenge(challenger: Player, challengee: Player) {
  if (!activeChallenges.has(challengee.id)) {
    activeChallenges.set(challengee.id, []);
  }

  let challengers = activeChallenges.get(challengee.id);
  challengers!.push(challenger.id);
  challenger.sendMessage({ translate: "cobblemon.challenge.sender", with: [challengee.name] });
  challengee.sendMessage({ translate: "cobblemon.challenge.receiver", with: [challenger.name] });
  system.runTimeout(() => { tryExpireChallenge(challenger, challengee) }, ticksUntilChallengeExpires);
}

function acceptChallenge(accepter: Player, challenger: Player) {
  tryExpireChallenge(challenger, accepter);
  startBattleBetween2Players(accepter, challenger);
}

function tryExpireChallenge(challenger: Player, challengee: Player) {
  if (!activeChallenges.has(challengee.id))
    return;
  let challengers = activeChallenges.get(challengee.id)!;
  challengers.splice(challengers.indexOf(challenger.id), 1);
  if (challengers.length == 0)
    activeChallenges.delete(challengee.id);
}