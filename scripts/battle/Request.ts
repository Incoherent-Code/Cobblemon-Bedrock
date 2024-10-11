import "../showdown/sim/global-types";
import { gimmickMove } from "./BattleMoveset"
/** Interface of the JSON data sent with the |REQUEST| header */
export interface RequestData {
  active?: ActiveMoveset[]
  side: RequestSide

  forceSwitch?: boolean[]
  noCancel: boolean
  /** I've never seen this, but cobblemon base seems to have this as a property */
  wait?: boolean
}

export interface ActiveMoveset {
  moves: RequestMove[]
  trapped?: boolean
  canMegaEvo?: boolean
  canUltraBurst?: boolean
  canZMove?: (gimmickMove | undefined)[]
  canDynamax?: boolean
  maxMoves?: (gimmickMove | undefined)[]
  canTerastallize?: string
}

interface RequestSide {
  name: string
  id: string // ex: p1 or p2
  pokemon: RequestPokemon[]
}

export interface RequestMove {
  move: string
  id: string
  pp: number
  maxpp: number
  target: string
  disabled: boolean
  gimmickMove?: gimmickMove
}

interface RequestPokemon {
  ident: string //Identifier and position ex: p1: Cyndaquill
  details: string
  condition: string // Number/Number or 0 and STATUS
  active: boolean
  stats: StatsTable
  moves: string[]
  baseAbility: string
  item: string
  pokeball: string
  ability: string

  commanding?: boolean
  reviving?: boolean
  teraType?: string
  terastallized?: string
}