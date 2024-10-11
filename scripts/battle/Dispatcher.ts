import { system, world } from "@minecraft/server";

export interface DispatchResult {
  canProceed(): boolean;
}

export const GoDispatch: DispatchResult = { canProceed: () => true }

export class WaitDispatch implements DispatchResult {
  readyTime: number;
  /** @param waitSeconds The time to wait in seconds */
  constructor(waitSeconds: number) {
    this.readyTime = system.currentTick + (waitSeconds * 20);
    //console.log(`New Waitdispatcher: seconds:${waitSeconds}, currentTick: ${system.currentTick}, readyTime: ${this.readyTime}`);
  }
  canProceed(): boolean {
    //console.log(`check Waitdispatcher: currentTick: ${system.currentTick}, readyTime: ${this.readyTime}, result${(system.currentTick >= this.readyTime)}`);
    return (system.currentTick >= this.readyTime);
  }
}

export type BattleDispatch = () => DispatchResult;

export class BattleDispatcher {
  dispatches: BattleDispatch[] = [];
  afterDispatches: (() => void)[] = [];
  lastDispatchResult: DispatchResult = GoDispatch;
  constructor(public onError: (Error) => void) { }
  tick() {
    try {
      while (this.lastDispatchResult.canProceed()) {
        let dispatch = this.dispatches.shift();
        if (dispatch == undefined)
          break;
        this.lastDispatchResult = dispatch();
      }

      if (this.dispatches.length === 0) {
        this.afterDispatches.forEach(x => x());
        this.afterDispatches = [];
      }
    }
    catch (e) {
      if (e instanceof Error)
        this.onError(e);
      else
        this.onError(new Error("Unknown Error:" + e));
    }
  }
  dispatch(dispatch: BattleDispatch) {
    this.dispatches.push(dispatch);
  }
  dispatchToFront(dispatch: BattleDispatch) {
    this.dispatches.splice(0, 0, dispatch);
  }
  /** Appearently this inserts a ton of battle dispatches at the front conditionally when activated.*/
  dispatchInsert(dispatches: () => BattleDispatch[]) {
    this.dispatch(() => {
      this.dispatches.splice(0, 0, ...dispatches());
      return GoDispatch;
    });
  }
  dispatchWaiting(delaySeconds: number, dispatcher: () => void) {
    this.dispatch(() => {
      dispatcher();
      return new WaitDispatch(delaySeconds);
    })
  }
  dispatchGo(dispatcher: () => void) {
    this.dispatch(() => {
      dispatcher();
      return GoDispatch;
    })
  }
  doWhenClear(run: () => void) {
    this.afterDispatches.push(run);
  }
}