import type { Clock } from "../ports/driven/Clock.js";

export class FixedClock implements Clock {
  constructor(private readonly fixed: Date = new Date("2026-06-28T00:00:00Z")) {}
  now(): Date {
    return this.fixed;
  }
}
