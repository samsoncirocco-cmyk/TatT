// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import ShareDesignAction from "../ShareDesignAction";

afterEach(cleanup);

const signedInUser = { id: "u1", email: "a@b.com", createdAt: 0 };
let currentUser: typeof signedInUser | null = signedInUser;

vi.mock("@/lib/tattStorage", () => ({
  useUser: () => ({ user: currentUser, hydrated: true }),
}));

const getApiAuthHeaders = vi.fn(async () => ({ Authorization: "Bearer token" }));
vi.mock("@/lib/client-api-auth", () => ({
  getApiAuthHeaders: (...args: unknown[]) => getApiAuthHeaders(...(args as [])),
}));

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Nothing anywhere on screen may look like a share link. */
function expectNoLinkRendered() {
  expect(screen.queryByLabelText("Share link")).toBeNull();
  expect(screen.queryByText("Copy")).toBeNull();
  expect(screen.queryByText("▸ Open link")).toBeNull();
  expect(document.body.textContent).not.toContain("/share/");
}

const props = {
  imageUrls: ["https://cdn.example.com/cut.png"],
  prompt: "a tiger, blackwork",
  redirectTo: "/designs/abc",
};

describe("ShareDesignAction", () => {
  beforeEach(() => {
    currentUser = signedInUser;
    getApiAuthHeaders.mockClear();
    getApiAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("sends an unknown device to signup rather than offering a button that cannot work", () => {
    currentUser = null;
    window.localStorage.clear();
    render(<ShareDesignAction {...props} />);

    const link = screen.getByText("▸ Sign in to share");
    expect(link.getAttribute("href")).toBe("/signup?redirect=%2Fdesigns%2Fabc");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sends a device that has signed in before to login instead", () => {
    currentUser = null;
    window.localStorage.setItem("tatt:known-user", "1");
    render(<ShareDesignAction {...props} />);

    const link = screen.getByText("▸ Sign in to share");
    expect(link.getAttribute("href")).toBe("/login?redirect=%2Fdesigns%2Fabc");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("disables sharing when the design has no cut yet, and says why", () => {
    render(<ShareDesignAction {...props} imageUrls={[]} />);

    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/nothing to share/i)).toBeTruthy();
  });

  it("shows an in-flight state and blocks a second submit while minting", async () => {
    let resolve: (r: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((r) => (resolve = r)))
    );

    render(<ShareDesignAction {...props} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true)
    );
    expect(screen.getByRole("button").textContent).toContain("Minting link");
    expect(screen.getByRole("status").textContent).toContain("Minting a durable link");
    expectNoLinkRendered();

    resolve(
      jsonResponse(200, {
        success: true,
        shareId: "abc1234567",
        shareUrl: "https://tatt.app/share/abc1234567",
      })
    );
    await screen.findByLabelText("Share link");
    vi.unstubAllGlobals();
  });

  it("renders the link the API returned, and copies it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, {
          success: true,
          shareId: "abc1234567",
          shareUrl: "https://tatt.app/share/abc1234567",
        })
      )
    );

    render(<ShareDesignAction {...props} />);
    fireEvent.click(screen.getByRole("button"));

    const field = (await screen.findByLabelText("Share link")) as HTMLInputElement;
    expect(field.value).toBe("https://tatt.app/share/abc1234567");

    fireEvent.click(screen.getByText("Copy"));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://tatt.app/share/abc1234567"
      )
    );
    expect(await screen.findByText("Copied ✓")).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("sends imageUrls and prompt — the fields the viewer page renders", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        success: true,
        shareId: "abc1234567",
        shareUrl: "https://tatt.app/share/abc1234567",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ShareDesignAction {...props} />);
    fireEvent.click(screen.getByRole("button"));
    await screen.findByLabelText("Share link");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/designs/share");
    expect(JSON.parse(init.body as string)).toEqual({
      imageUrls: ["https://cdn.example.com/cut.png"],
      prompt: "a tiger, blackwork",
    });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token");
    vi.unstubAllGlobals();
  });

  it("shows no link at all when the store is unavailable (503)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(503, {
          success: false,
          error: "Sharing is temporarily unavailable.",
          code: "SHARE_STORE_UNAVAILABLE",
        })
      )
    );

    render(<ShareDesignAction {...props} />);
    fireEvent.click(screen.getByRole("button"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Sharing is temporarily unavailable.");
    expect(alert.textContent).toContain("No link was created");
    expectNoLinkRendered();
    // ...and the action offers a retry rather than a dead end.
    expect(screen.getByRole("button").textContent).toContain("Try share again");
    vi.unstubAllGlobals();
  });

  it("treats a 2xx without a shareId as a failure, not a share", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, { success: true })));

    render(<ShareDesignAction {...props} />);
    fireEvent.click(screen.getByRole("button"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No link was created");
    expectNoLinkRendered();
    vi.unstubAllGlobals();
  });

  it("says the session expired on a 401 instead of showing a link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(401, { error: "Invalid authorization token", code: "AUTH_INVALID" })
      )
    );

    render(<ShareDesignAction {...props} />);
    fireEvent.click(screen.getByRole("button"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Your session expired");
    expectNoLinkRendered();
    vi.unstubAllGlobals();
  });

  it("surfaces a missing session before any request is made", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    getApiAuthHeaders.mockRejectedValue(new Error("Sign in to continue."));

    render(<ShareDesignAction {...props} />);
    fireEvent.click(screen.getByRole("button"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Sign in to share this design.");
    expect(fetchMock).not.toHaveBeenCalled();
    expectNoLinkRendered();
    vi.unstubAllGlobals();
  });

  it("keeps the link visible and admits it when the clipboard is blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, {
          success: true,
          shareId: "abc1234567",
          shareUrl: "https://tatt.app/share/abc1234567",
        })
      )
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    render(<ShareDesignAction {...props} />);
    fireEvent.click(screen.getByRole("button"));
    await screen.findByLabelText("Share link");

    fireEvent.click(screen.getByText("Copy"));
    expect(await screen.findByText(/copy blocked by the browser/i)).toBeTruthy();
    expect(screen.queryByText("Copied ✓")).toBeNull();
    expect((screen.getByLabelText("Share link") as HTMLInputElement).value).toBe(
      "https://tatt.app/share/abc1234567"
    );
    vi.unstubAllGlobals();
  });
});

/**
 * Selecting several cuts must produce ONE link holding the set. The whole
 * point of selection was to avoid a share button — and therefore a link —
 * per cut, so "N picks, N links" is the failure mode these pin down.
 */
describe("ShareDesignAction — a selection of several cuts", () => {
  const three = [
    "https://cdn.example.com/one.png",
    "https://cdn.example.com/two.png",
    "https://cdn.example.com/three.png",
  ];

  beforeEach(() => {
    currentUser = signedInUser;
    getApiAuthHeaders.mockClear();
    getApiAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("mints one link for the whole selection, not one per cut", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        success: true,
        shareId: "set1234567",
        shareUrl: "https://tatt.app/share/set1234567",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ShareDesignAction {...props} imageUrls={three} />);
    expect(screen.getByRole("button").textContent).toContain("Share 3 cuts");

    fireEvent.click(screen.getByRole("button"));
    const field = (await screen.findByLabelText("Share link")) as HTMLInputElement;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByLabelText("Share link")).toHaveLength(1);
    expect(field.value).toBe("https://tatt.app/share/set1234567");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).imageUrls).toEqual(three);
    vi.unstubAllGlobals();
  });

  it("sends every cut when the user selects all of them", async () => {
    const all = [...three, "https://cdn.example.com/four.png"];
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        success: true,
        shareId: "all1234567",
        shareUrl: "https://tatt.app/share/all1234567",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ShareDesignAction {...props} imageUrls={all} />);
    expect(screen.getByRole("button").textContent).toContain("Share 4 cuts");

    fireEvent.click(screen.getByRole("button"));
    await screen.findByLabelText("Share link");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).imageUrls).toEqual(all);
    // ...and the panel is honest about what the one link contains.
    expect(document.body.textContent).toContain("all 4 cuts");
    vi.unstubAllGlobals();
  });

  it("drops a minted link when the selection changes under it", async () => {
    // A link belongs to the exact set it was minted from. Leaving it on
    // screen after the user ticks another cut says the link contains
    // something it does not.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, {
          success: true,
          shareId: "abc1234567",
          shareUrl: "https://tatt.app/share/abc1234567",
        })
      )
    );

    const { rerender } = render(
      <ShareDesignAction {...props} imageUrls={three.slice(0, 1)} />
    );
    fireEvent.click(screen.getByRole("button"));
    await screen.findByLabelText("Share link");

    rerender(<ShareDesignAction {...props} imageUrls={three.slice(0, 2)} />);

    await waitFor(() => expect(screen.queryByLabelText("Share link")).toBeNull());
    expectNoLinkRendered();
    expect(screen.getByRole("button").textContent).toContain("Share 2 cuts");
    vi.unstubAllGlobals();
  });

  it("shows no link for a multi-cut selection when the store is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(503, {
          success: false,
          error: "Sharing is temporarily unavailable.",
          code: "SHARE_STORE_UNAVAILABLE",
        })
      )
    );

    render(<ShareDesignAction {...props} imageUrls={three} />);
    fireEvent.click(screen.getByRole("button"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No link was created");
    expectNoLinkRendered();
    vi.unstubAllGlobals();
  });

  it("explains why sharing is disabled before anything is selected", () => {
    render(
      <ShareDesignAction
        {...props}
        imageUrls={[]}
        emptyHint="Select a cut above — everything you select goes in one link."
      />
    );

    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/everything you select goes in one link/i)).toBeTruthy();
  });
});
