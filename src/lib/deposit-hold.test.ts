import { afterEach, describe, expect, it } from "vitest";
import { depositHoldDays } from "./deposit-hold";

describe("depositHoldDays", () => {
  const original = process.env.DEPOSIT_HOLD_DAYS;

  afterEach(() => {
    if (original === undefined) delete process.env.DEPOSIT_HOLD_DAYS;
    else process.env.DEPOSIT_HOLD_DAYS = original;
  });

  it("defaults to 7 when unset or invalid", () => {
    delete process.env.DEPOSIT_HOLD_DAYS;
    expect(depositHoldDays()).toBe(7);
    process.env.DEPOSIT_HOLD_DAYS = "0";
    expect(depositHoldDays()).toBe(7);
    process.env.DEPOSIT_HOLD_DAYS = "nope";
    expect(depositHoldDays()).toBe(7);
  });

  it("honours a positive override", () => {
    process.env.DEPOSIT_HOLD_DAYS = "3";
    expect(depositHoldDays()).toBe(3);
  });
});
