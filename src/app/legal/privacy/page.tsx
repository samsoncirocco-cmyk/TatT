/**
 * Privacy policy. DRAFT — NOT REVIEWED BY COUNSEL.
 *
 * Section 4 ("Artists we listed without asking") is the part that matters and
 * the part that is unusual. It is written for TatT's actual position — roughly
 * 7,800 artists were collected without consent and about 62,000 of their
 * portfolio photographs re-hosted on TatT's own storage — rather than adapted
 * from a generic cookie-and-analytics notice. Those templates address data a
 * user hands you; they have nothing to say about data taken from third parties
 * without consent, which is the whole of the problem here.
 *
 * Why this is live rather than sitting in docs/: the collection is already
 * public — those photographs are served from TatT right now — so the notice is
 * what is missing, not the processing. Where data is obtained from someone other
 * than the data subject, disclosure is the remedy and silence is the exposure.
 * An artist who reaches /takedown currently has nowhere to read what removal
 * actually does. The page already carried a "pending counsel review" banner and
 * placeholder lorem ipsum, so this replaces filler with something honest at the
 * same status — it does not promote unreviewed text to settled policy.
 *
 * Every factual claim below is traceable to behaviour in this repo:
 *   §4.3 removal mechanics      → docs/adr/0025, scripts/execute-takedown.mjs
 *   §4.4 the retained tombstone → docs/adr/0025 §3, scripts/lib/takedown-tombstone.mjs
 *   §4.5 coming back            → docs/adr/0026, scripts/execute-reinstatement.mjs
 *
 * If any of those change, this text becomes false. It is not decoration.
 *
 * Open questions for counsel: docs/legal/artist-data-counsel-notes.md.
 */
import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import QuietHeadline from "@/components/quiet/QuietHeadline";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display-quiet text-quiet text-[20px] md:text-[22px] pt-12 pb-1">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display-quiet text-quiet/90 text-[15px] md:text-[16px] pt-8 pb-1">
      {children}
    </h3>
  );
}

export default function PrivacyPage() {
  return (
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim tabular-nums font-body">
          <span>Legal / Privacy</span>
          <span>v0.2 draft</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-3xl mx-auto">
          <QuietHeadline>Privacy policy</QuietHeadline>
          <p className="mt-6 text-[12px] text-quiet-dim font-body tabular-nums">
            Last updated: 26 July 2026
          </p>

          {/* Not boilerplate. This text has not been through counsel, and
              section 4 makes commitments about other people's data — readers
              are entitled to know its status. */}
          <div className="mt-14 border hairline-quiet p-6 md:p-8 bg-white/[0.03]">
            <div className="font-display-quiet text-quiet text-[15px]">
              Draft — not yet reviewed by a lawyer
            </div>
            <p className="mt-4 text-[13px] text-quiet-dim font-body leading-[1.7]">
              This document is published in draft so that it is available to the people it
              concerns, particularly the artists described in section 4. It has not been
              reviewed by counsel and its wording may change. What will not change without
              being announced here is the substance of section 4: the removal right, and what
              removal actually does.
            </p>
          </div>

          <div className="mt-16 space-y-5 text-[14px] text-quiet-dim font-body leading-[1.8] border-t hairline-quiet-soft pt-12">
            <p className="text-[15px] text-quiet">
              TattTester holds personal data about two groups of people who are in very different
              positions. Sections 1 to 3 cover people who signed up. Section 4 covers tattoo
              artists whose details we collected from the public internet without asking them
              first. If you are an artist who found your name or your work on this site and
              did not put it there,{" "}
              <a href="#artists" className="text-quiet underline underline-offset-4 hover:text-white">
                section 4 is the one you want
              </a>
              .
            </p>

            {/* ─────────── Users ─────────── */}
            <H2>1.&nbsp;Information we collect from you</H2>
            <p>
              If you create an account or use the design tools, we collect what you give us
              (account details, design prompts, uploaded reference images) and what your use
              generates (generation history, saved designs, artist matches, booking records).
              Payments are processed by Stripe; we do not receive or store your card number.
            </p>

            <H2>2.&nbsp;How we use it</H2>
            <p>
              To operate the service, generate and store your designs, match you with artists,
              take and settle bookings, and meet legal and tax obligations. We do not sell
              personal data.
            </p>

            <H2>3.&nbsp;Your rights as a user</H2>
            <p>
              You can access, correct, export or delete your account information from Settings,
              or by contacting us. Deleting your account removes your designs and your
              generation history. Booking and payment records are retained where we are
              required to keep them.
            </p>

            {/* ─────────── The part that matters ─────────── */}
            <div id="artists" className="scroll-mt-24" />
            <H2>4.&nbsp;Artists we listed without asking</H2>

            <div className="border-l-2 border-quiet/50 pl-5 py-1 my-6">
              <p className="text-quiet text-[15px]">
                We built TattTester&rsquo;s artist directory by collecting public information about
                tattoo artists from the internet, and we did not ask permission first. If you
                are one of those artists, you did not agree to any of this, and you can have it
                removed. Section 4.2 tells you how.
              </p>
            </div>

            <H3>4.1&nbsp;&mdash;&nbsp;What we collected, and from where</H3>
            <p>
              We gathered information about roughly{" "}
              <strong className="text-quiet">7,800 tattoo artists</strong> from publicly
              accessible sources: studio and shop websites, public artist directories, and
              public Instagram profiles. For each artist this typically included some
              combination of name, Instagram handle, studio or shop name, city and state,
              approximate location, tattoo styles, public ratings and review counts, and a link
              to the page we found them on.
            </p>
            <p>
              We also{" "}
              <strong className="text-quiet">
                downloaded portfolio photographs and re-hosted approximately 62,000 of them on
                TattTester&rsquo;s own storage
              </strong>
              , rather than linking to them where they were published. Those images have been
              served from our infrastructure and displayed on artist profiles. We derived
              mathematical representations (&ldquo;embeddings&rdquo;) from them so that our
              matching engine could recommend artists by visual style.
            </p>
            <p>
              We did this so the directory would be useful on day one rather than empty. That
              was our commercial interest, not the artists&rsquo;, and we are naming it as such
              rather than describing it as a benefit to them.
            </p>

            <H3>4.2&nbsp;&mdash;&nbsp;Your right to have it removed, and how to use it</H3>
            <p>
              You can ask us to remove you. You do not need a TattTester account, a lawyer, or a
              reason.
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-quiet-dim">
              <li>
                Use the removal link on your profile page, which goes to a form at{" "}
                <span className="text-quiet">/takedown</span>.
              </li>
              <li>
                Or email us. Either way, tell us which profile is yours and how to reach you.
              </li>
              <li>
                You can ask us to remove{" "}
                <strong className="text-quiet">your photographs only</strong> and leave the
                basic listing, or to remove <strong className="text-quiet">everything</strong>.
                If you do not say, we remove everything.
              </li>
            </ul>
            <p>
              Submitting the form does not delete anything by itself, and we will not tell you
              that it has. A person reviews every request. We do this deliberately: if a form
              submission could erase an artist, anyone could use it to erase a competitor. We
              will confirm to you when removal has actually happened.
            </p>

            <H3>4.3&nbsp;&mdash;&nbsp;What removal deletes, and what it does not</H3>
            <p>You are entitled to the exact answer rather than a reassuring one.</p>

            <p className="text-quiet pt-2">Permanently deleted:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-quiet-dim">
              <li>
                Every portfolio photograph of yours that we re-hosted. Deleted from our
                storage, not hidden.
              </li>
              <li>
                The style embedding derived from your work, so it no longer influences
                matching.
              </li>
              <li>
                Your name, biography, Instagram handle, studio name, location, ratings, review
                counts and portfolio links, which are erased from our database record.
              </li>
              <li>
                Your profile page, and your presence in search, browsing, recommendations and
                the homepage.
              </li>
            </ul>

            <p className="text-quiet pt-4">Retained, and why:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-quiet-dim">
              <li>
                <strong className="text-quiet">An emptied database record.</strong> We keep a
                stripped record identified only by an internal ID, with the date of your
                removal. It holds no personal details. It exists because deleting the record
                outright would break links to any payment held in your name, and would destroy
                our own proof that we honoured your request.
              </li>
              <li>
                <strong className="text-quiet">Any payment record</strong> created by a client
                leaving a deposit for you. Where a client&rsquo;s money is involved we cannot
                simply delete the record; we resolve the payment first, and our removal tool
                refuses to run while one is outstanding.
              </li>
              <li>
                <strong className="text-quiet">A record of the removal itself.</strong> See 4.4
                — this one deserves its own explanation.
              </li>
            </ul>

            <p className="text-quiet pt-4">What we cannot promise:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-quiet-dim">
              <li>
                Copies held elsewhere. Search engines, caches and content delivery networks may
                serve old copies of images for a period after we delete them. We cannot reach
                into those, but we can tell you what the URLs were so you can ask them
                directly.
              </li>
              <li>
                Backups. Our infrastructure keeps operational backups on a rolling schedule, so
                deleted content may persist in those for a period before ageing out.
              </li>
            </ul>

            <H3>4.4&nbsp;&mdash;&nbsp;We keep one permanent record so you are not re-added</H3>
            <p>
              Our directory was built by automated collection, and we may run that again. If we
              kept no record of your removal, the next run would find your public Instagram
              profile and add you back — and you would have to ask us again, forever.
            </p>
            <p>
              So when we remove you, we permanently record{" "}
              <strong className="text-quiet">your Instagram handle</strong> (and internal
              identifiers) on a suppression list that every collection process checks before
              adding anyone. Your handle is the only identifier that stays stable between runs,
              which is why we keep that specifically.
            </p>
            <div className="border-l-2 border-quiet/30 pl-5 py-1 my-5">
              <p>
                Being straightforward about the trade-off:{" "}
                <strong className="text-quiet">
                  this suppression list is itself retained personal data
                </strong>
                . We keep one piece of information about you indefinitely, for the specific and
                only purpose of never processing anything else about you again. We think that
                is the right balance, and it is why we are stating it plainly rather than
                leaving you to discover it. The entry holds your handle, the date, and nothing
                else — no photographs, no name, no location, no contact details.
              </p>
            </div>
            <p>
              If you would rather we did not keep even that, tell us and we will delete it. We
              will also tell you honestly that we can then no longer guarantee a future
              collection run will not re-add you.
            </p>

            <H3>4.5&nbsp;&mdash;&nbsp;Coming back, if you ever want to</H3>
            <p>
              Removal is not a ban. The suppression list stops{" "}
              <em className="text-quiet/90">us</em> adding you; it does not stop{" "}
              <em className="text-quiet/90">you</em> joining. If you later decide you want a
              TattTester profile, you can create an account and claim one deliberately.
            </p>
            <p>Two things are worth knowing before you do:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-quiet-dim">
              <li>
                <strong className="text-quiet">Nothing comes back.</strong> Your photographs and
                details were genuinely destroyed. You would start from an empty profile and fill
                it in yourself. We cannot undo the deletion, and we would not want to be able
                to.
              </li>
              <li>
                <strong className="text-quiet">
                  Our automated collection stays blocked permanently
                </strong>
                , even after you join. Your profile is yours; a later collection run must never
                overwrite what you wrote with scraped data.
              </li>
            </ul>

            <H3>4.6&nbsp;&mdash;&nbsp;Proving it is you</H3>
            <p>
              We have to be careful in both directions: a removal request must not be usable to
              erase a rival, and a request to take ownership of a profile must not be usable to
              take someone else&rsquo;s.
            </p>
            <p className="pt-1">
              <strong className="text-quiet">To have yourself removed</strong>, we normally ask
              you to show control of the Instagram account shown on the profile — usually by
              posting a short code we send you, or messaging us from that account. If you no
              longer have that account, or never had one, tell us and we will find another way.
              We would rather remove someone on imperfect evidence than leave a real artist
              listed against their wishes.
            </p>
            <p className="pt-1">
              <strong className="text-quiet">To claim or reinstate a profile</strong>, the bar
              is higher, because a claimed profile can receive client deposits. We require an
              account, proof of control of the Instagram handle, and review by a person before
              any profile is bound to you.
            </p>
            <p className="pt-1">
              We are not able to establish who owns the copyright in a photograph. If an artist
              and a studio disagree about whose work a portfolio is, we cannot adjudicate that,
              and we will say so rather than pick a side.
            </p>

            <H3>4.7&nbsp;&mdash;&nbsp;How long we take</H3>
            <p>
              We aim to acknowledge a removal request within a few days and to action it
              promptly after that. If you tell us your request is made under a specific legal
              right, say so and we will treat the applicable statutory deadline as binding.
            </p>

            <H2>5.&nbsp;Who else sees this data</H2>
            <p>
              We use third-party providers to run the service, including cloud hosting and
              storage, database providers, AI model providers for design generation, email
              delivery, and Stripe for payments. They process data on our instructions. We do
              not sell personal data to anyone.
            </p>

            <H2>6.&nbsp;Contact</H2>
            <p>
              For anything in this policy, including removal requests and questions about what
              we hold, contact us via the{" "}
              <Link href="/about" className="text-quiet underline underline-offset-4 hover:text-white">
                about page
              </Link>
              . If you are an artist asking to be removed, you do not need an account and you do
              not need to explain yourself.
            </p>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
