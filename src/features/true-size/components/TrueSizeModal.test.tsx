import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrueSizeModal from "./TrueSizeModal";
import { CALIBRATION_STORAGE_KEY } from "../utils/calibrationStore";
import { CARD_WIDTH_MM } from "../utils/trueSizeMath";
import { PRINT_TOO_BIG_MESSAGE } from "../utils/printAtScale";

/** jsdom never loads images — fire onLoad by hand with chosen dimensions. */
function loadPreviewImage(width: number, height: number) {
  const img = screen.getByTestId("true-size-image");
  Object.defineProperty(img, "naturalWidth", { value: width });
  Object.defineProperty(img, "naturalHeight", { value: height });
  fireEvent.load(img);
}

function seedCalibration(pxPerMm: number) {
  window.localStorage.setItem(
    CALIBRATION_STORAGE_KEY,
    JSON.stringify({ pxPerMm, calibratedAt: Date.now() })
  );
}

function renderModal() {
  return render(
    <TrueSizeModal
      imageUrl="data:image/png;base64,x"
      designName="Snake"
      designId="d1"
      onClose={vi.fn()}
    />
  );
}

describe("TrueSizeModal", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("asks for the card calibration when the screen is unknown", () => {
    renderModal();
    expect(screen.getByText(/your card goes here/i)).toBeTruthy();
    expect(screen.queryByTestId("true-size-image")).toBeNull();
  });

  it("locking the card match stores px/mm and reveals the true-size view", () => {
    renderModal();

    const slider = screen.getByLabelText(/match the outline/i);
    fireEvent.change(slider, { target: { value: "342" } });
    fireEvent.click(screen.getByRole("button", { name: /lock it in/i }));

    const stored = JSON.parse(
      window.localStorage.getItem(CALIBRATION_STORAGE_KEY) as string
    );
    expect(stored.pxPerMm).toBeCloseTo(342 / CARD_WIDTH_MM, 10);

    // Default 10cm, rendered at the calibrated scale.
    const img = screen.getByTestId("true-size-image");
    expect(img.style.width).toBe(`${100 * stored.pxPerMm}px`);
  });

  it("skips calibration when this screen already has one", () => {
    seedCalibration(4);
    renderModal();
    expect(screen.queryByText(/your card goes here/i)).toBeNull();
    expect(screen.getByTestId("true-size-image")).toBeTruthy();
  });

  it("renders the chosen width at true scale", () => {
    seedCalibration(4);
    renderModal();

    fireEvent.change(screen.getByLabelText(/width/i), {
      target: { value: "5" },
    });

    // 5cm on a 4 px/mm screen is exactly 200 screen pixels.
    expect(screen.getByTestId("true-size-image").style.width).toBe("200px");
  });

  it("unit toggle converts the number but keeps the physical size", () => {
    seedCalibration(4);
    renderModal();

    const input = screen.getByLabelText(/width/i) as HTMLInputElement;
    expect(input.value).toBe("10"); // 10cm default

    fireEvent.click(screen.getByRole("button", { name: "in" }));
    expect(input.value).toBe("3.9"); // same tattoo, inch label

    // Rendered size moves only by the 0.1-unit display rounding.
    const px = parseFloat(
      screen.getByTestId("true-size-image").style.width
    );
    expect(px).toBeCloseTo(3.9 * 25.4 * 4, 5);

    fireEvent.click(screen.getByRole("button", { name: "cm" }));
    expect(input.value).toBe("9.9"); // 3.9in re-displayed in cm
  });

  it("disables print while the preview is still loading — without claiming it's too big", () => {
    seedCalibration(4);
    renderModal();

    const download = screen.getByRole("button", {
      name: /download print-ready pdf/i,
    }) as HTMLButtonElement;
    expect(download.disabled).toBe(true);
    expect(screen.queryByText(PRINT_TOO_BIG_MESSAGE)).toBeNull();

    loadPreviewImage(1000, 1000);
    expect(download.disabled).toBe(false);
  });

  it("refuses honestly when the chosen width cannot print on one sheet", () => {
    seedCalibration(4);
    renderModal();
    loadPreviewImage(1000, 1000);

    fireEvent.change(screen.getByLabelText(/width/i), {
      target: { value: "25" }, // 25cm — wider than letter/A4 printable width
    });

    const download = screen.getByRole("button", {
      name: /download print-ready pdf/i,
    }) as HTMLButtonElement;
    expect(download.disabled).toBe(true);
    expect(screen.getByText(PRINT_TOO_BIG_MESSAGE)).toBeTruthy();
  });

  it("offers the plain print instruction", () => {
    seedCalibration(4);
    renderModal();
    expect(screen.getByText(/no fit-to-page/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /download print-ready pdf/i })
    ).toBeTruthy();
  });
});
