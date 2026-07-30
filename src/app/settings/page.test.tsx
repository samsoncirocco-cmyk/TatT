// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettingsPage from "./page";

const push = vi.fn();
const setStylePreferences = vi.fn();
const updateUser = vi.fn();
let savedStyles = ["Fine Line"];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/studio/StudioShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/quiet/QuietHeadline", () => ({
  default: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

vi.mock("@/components/punk/PunkToggle", () => ({
  default: () => null,
}));

vi.mock("@/lib/tattStorage", () => ({
  useUser: () => ({
    user: null,
    hydrated: true,
    updateUser,
    signOut: vi.fn(),
    error: null,
  }),
  useStylePreferences: () => ({
    stylePreferences: savedStyles,
    hydrated: true,
    setStylePreferences,
  }),
}));

vi.mock("@/lib/knownUser", () => ({
  authDoorHref: () => "/signin",
}));

describe("SettingsPage taste profile", () => {
  beforeEach(() => {
    savedStyles = ["Fine Line"];
    setStylePreferences.mockClear();
    updateUser.mockClear();
    push.mockClear();
  });

  it("lets a signed-out visitor edit and save taste on this device", async () => {
    render(<SettingsPage />);

    expect(
      screen.getByRole("group", { name: "Default style preferences" }),
    ).toBeTruthy();

    const fineLine = screen.getByRole("button", { name: /fine line/i });
    await waitFor(() =>
      expect(fineLine.getAttribute("aria-pressed")).toBe("true"),
    );

    const blackwork = screen.getByRole("button", { name: /blackwork/i });
    expect(blackwork.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(blackwork);
    expect(blackwork.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(setStylePreferences).toHaveBeenCalledWith(["Fine Line", "Blackwork"]);
    expect(updateUser).not.toHaveBeenCalled();
    expect(await screen.findByText("Preferences saved")).toBeTruthy();
    expect(screen.getByText(/saved on this device/i)).toBeTruthy();
  });
});
