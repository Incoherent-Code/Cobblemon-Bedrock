import { world } from "@minecraft/server";

export class TimeRange {
  ranges: [number, number][] = [];
  constructor(...ranges: [min: number, max: number][]) {
    this.ranges = ranges;
  }
  /** Verifies the current time of day */
  validate(): boolean {
    let currentTime = world.getTimeOfDay();
    return this.ranges.some(r => r[0] < currentTime && currentTime < r[1])
  }
}

export const TimeRanges: Record<string, TimeRange> = {
  "any": new TimeRange([0, 23999]),
  "day": new TimeRange([23460, 23999], [0, 12541]),
  "night": new TimeRange([12542, 23459]),
  "noon": new TimeRange([5000, 6999]),
  "midnight": new TimeRange([17000, 18999]),
  "dawn": new TimeRange([22300, 23999], [0, 166]),
  "dusk": new TimeRange([11834, 13701]),
  "twilight": new TimeRange([11834, 13701], [22300, 23999], [0, 166]),
  "morning": new TimeRange([0, 4999]),
  "afternoon": new TimeRange([7000, 12039])
};