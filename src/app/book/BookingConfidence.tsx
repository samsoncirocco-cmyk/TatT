import QuietCTA from "@/components/quiet/QuietCTA";

export type BookingPath = "reservation" | "request";

export function bookingReviewLabels(mode: BookingPath) {
  return mode === "reservation"
    ? {
        heading: "Review the selected time",
        timing: "Time to hold at checkout",
      }
    : {
        heading: "Review the request",
        timing: "Requested dates",
      };
}

export function checkoutEstimate(deposit: number, feePercent: number) {
  const bookingFee = Math.round(deposit * feePercent) / 100;
  return {
    deposit,
    bookingFee,
    totalBeforeTax: deposit + bookingFee,
  };
}

function money(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

export function BookingPathExplainer({
  mode,
  artistName,
}: {
  mode: BookingPath;
  artistName: string;
}) {
  const reservation = mode === "reservation";
  const stages = reservation
    ? [
        {
          n: "01",
          label: "Pick a live time",
          detail: `Choose one of ${artistName}'s published openings.`,
        },
        {
          n: "02",
          label: "We hold it",
          detail: "An exclusive, short hold is placed before Stripe opens.",
        },
        {
          n: "03",
          label: "Pay to secure it",
          detail: "The deposit goes toward your tattoo. Our booking fee is added separately.",
        },
      ]
    : [
        {
          n: "01",
          label: "Request up to 3 dates",
          detail: `Tell ${artistName} when you can make it. These are preferences, not bookings.`,
        },
        {
          n: "02",
          label: "Send deposit",
          detail: "The deposit starts the booking process. Our booking fee is added separately.",
        },
        {
          n: "03",
          label: "Artist confirms",
          detail: `${artistName} confirms one of your dates or offers another time.`,
        },
      ];

  return (
    <section className="mt-8 border hairline-quiet-soft" aria-labelledby="booking-path-title">
      <div className="px-6 py-5 border-b hairline-quiet-soft flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-quiet-dim font-body">
            Your booking path
          </p>
          <h2 id="booking-path-title" className="mt-2 font-display-quiet text-[18px] text-quiet">
            {reservation ? "A real time you can reserve" : "A request the artist confirms"}
          </h2>
        </div>
        <span className="border hairline-quiet px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-quiet font-body">
          {reservation ? "Live reservation" : "Date request"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3">
        {stages.map((stage) => (
          <div
            key={stage.n}
            className="p-6 border-b md:border-b-0 md:border-r hairline-quiet-soft last:border-0"
          >
            <div className="text-[11px] text-quiet-dim tabular-nums font-body">{stage.n}</div>
            <div className="mt-3 text-[13px] text-quiet font-body">{stage.label}</div>
            <p className="mt-2 text-[12px] text-quiet-dim font-body leading-[1.7]">
              {stage.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CheckoutEstimate({
  deposit,
  feePercent,
  artistClaimed,
}: {
  deposit: number;
  feePercent: number;
  artistClaimed: boolean;
}) {
  const estimate = checkoutEstimate(deposit, feePercent);

  return (
    <dl className="mt-5 pt-5 border-t border-black/15 text-[12px] font-body">
      <div className="flex items-center justify-between gap-6">
        <dt className="text-black/60">
          {artistClaimed ? "Deposit to artist" : "Artist deposit held by TattTester"}
        </dt>
        <dd className="text-black tabular-nums">{money(estimate.deposit)}</dd>
      </div>
      <div className="mt-2 flex items-center justify-between gap-6">
        <dt className="text-black/60">TattTester booking fee ({feePercent}%)</dt>
        <dd className="text-black tabular-nums">{money(estimate.bookingFee)}</dd>
      </div>
      <div className="mt-4 pt-4 border-t border-black/15 flex items-center justify-between gap-6">
        <dt className="text-black/80">Checkout estimate</dt>
        <dd className="font-display-quiet text-[18px] text-black tabular-nums">
          {money(estimate.totalBeforeTax)}
        </dd>
      </div>
      <p className="mt-2 text-[10px] text-black/50 leading-[1.6]">
        Before any tax shown by Stripe. Your remaining tattoo balance is set by the artist and
        settles at the shop.
      </p>
    </dl>
  );
}

export function TattooPrepPlan({
  artistName,
  showBookingsLink = true,
  stage = "request",
}: {
  artistName?: string | null;
  showBookingsLink?: boolean;
  stage?: "request" | "appointment";
}) {
  const artist = artistName || "your artist";
  const appointment = stage === "appointment";

  return (
    <section className="mt-10 border hairline-quiet-soft" aria-labelledby="prep-plan-title">
      <div className="p-6 md:p-8 border-b hairline-quiet-soft">
        <p className="text-[10px] uppercase tracking-[0.18em] text-quiet-dim font-body">
          Keep the momentum
        </p>
        <h2 id="prep-plan-title" className="mt-3 font-display-quiet text-[20px] text-quiet">
          {appointment ? "Your appointment game plan" : "Your booking-request plan"}
        </h2>
        <p className="mt-3 text-[12px] text-quiet-dim font-body leading-[1.8] max-w-2xl">
          {appointment
            ? "A short checklist for the details that are easiest to miss. The artist or shop's instructions always take priority."
            : "Keep the request together while the artist confirms whether, when, and where an appointment will happen."}
        </p>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-3">
        <li className="p-6 md:p-8 border-b md:border-b-0 md:border-r hairline-quiet-soft">
          <div className="text-[10px] uppercase tracking-[0.14em] text-quiet-dim font-body">
            Right now
          </div>
          <p className="mt-3 text-[13px] text-quiet font-body">Keep your reference handy</p>
          <p className="mt-2 text-[12px] text-quiet-dim font-body leading-[1.75]">
            Save the booking number and use Your bookings as the status source for this booking.
          </p>
        </li>
        <li className="p-6 md:p-8 border-b md:border-b-0 md:border-r hairline-quiet-soft">
          <div className="text-[10px] uppercase tracking-[0.14em] text-quiet-dim font-body">
            When {artist} replies
          </div>
          <p className="mt-3 text-[13px] text-quiet font-body">Close the open details</p>
          <p className="mt-2 text-[12px] text-quiet-dim font-body leading-[1.75]">
            Confirm the time, shop address, remaining quote, and cancellation or reschedule rules.
          </p>
        </li>
        <li className="p-6 md:p-8">
          <div className="text-[10px] uppercase tracking-[0.14em] text-quiet-dim font-body">
            {appointment ? "Before the appointment" : "Only after confirmation"}
          </div>
          <p className="mt-3 text-[13px] text-quiet font-body">
            {appointment ? "Make the chair easy" : "Then prepare for the chair"}
          </p>
          <p className="mt-2 text-[12px] text-quiet-dim font-body leading-[1.75]">
            {appointment
              ? "Follow the shop's prep instructions, bring required ID and payment, and wear clothing that gives easy access to the placement."
              : "Do not make appointment plans yet. Once the artist confirms, follow the shop's prep, ID, payment, and clothing instructions."}
          </p>
        </li>
      </ol>
      <div className="p-6 md:px-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t hairline-quiet-soft">
        {showBookingsLink && (
          <QuietCTA href="/bookings" size="sm">Open Your bookings</QuietCTA>
        )}
        <p className="text-[11px] text-quiet-dim font-body leading-[1.6]">
          Questions about skin, products, or aftercare belong with your artist or a qualified
          clinician—not a generic checklist.
        </p>
      </div>
    </section>
  );
}
