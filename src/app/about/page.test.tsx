// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutPage from "./page";

vi.mock("@/components/studio/StudioShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/punk/SlashHeadline", () => ({
  default: ({
    before,
    slashed,
    after,
  }: {
    before?: React.ReactNode;
    slashed?: React.ReactNode;
    after?: React.ReactNode;
  }) => (
    <h2>
      {before} {slashed} {after}
    </h2>
  ),
}));

describe("AboutPage product promises", () => {
  it("explains generation recovery without invented timing or credits", () => {
    render(<AboutPage />);

    expect(screen.getByText(/render time varies/i)).toBeTruthy();
    expect(screen.getByText(/your prompt and settings stay put/i)).toBeTruthy();
    expect(screen.queryByText(/under thirty seconds/i)).toBeNull();
    expect(screen.queryByText(/credits don't tick/i)).toBeNull();
  });

  it("distinguishes live reservations from date requests", () => {
    render(<AboutPage />);

    expect(screen.getByText(/some artists offer live times/i)).toBeTruthy();
    expect(screen.getByText(/everyone else receives a date request/i)).toBeTruthy();
    expect(screen.getByText(/claimed and unclaimed profiles are labeled/i)).toBeTruthy();
  });
});
