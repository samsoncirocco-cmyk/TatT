/**
 * Journey Component
 *
 * Customer journey storytelling page that narrates what's broken
 * in traditional tattoo acquisition and how TatTester transforms it.
 *
 * Based on market research showing:
 * - 15-20 month average consideration period
 * - 4,200+ mentions of "regret fear" on Reddit
 * - 25-30% cancellation rate due to anxiety
 * - 3.5x higher booking confidence with AR preview
 */

import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Journey() {
  const [activeStage, setActiveStage] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            The Tattoo Journey, Transformed
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            From 15 months of anxiety to 2 weeks of confidence
          </p>
          <div className="max-w-3xl mx-auto">
            <p className="text-base text-gray-700 leading-relaxed">
              The traditional tattoo process is broken. Opaque artist selection,
              no way to preview your design on your body, high regret rates, and
              inefficient consultations leave first-timers paralyzed with anxiety
              for monthsor even years.
            </p>
            <p className="text-base text-gray-700 leading-relaxed mt-4">
              TatTester changes everything through AI-powered design generation,
              AR visualization, smart artist matching, and educational tools that
              turn uncertainty into confidence.
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <StatCard
            number="15-20"
            unit="months"
            label="Traditional decision time"
            highlight="bad"
          />
          <StatCard
            number="2-4"
            unit="weeks"
            label="With TatTester"
            highlight="good"
          />
          <StatCard
            number="3.5x"
            unit=""
            label="Higher booking confidence"
            highlight="good"
          />
        </div>
      </div>

      {/* The Problem Section */}
      <div className="bg-white py-12 border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            What's Broken with Traditional Tattoos
          </h2>
          <p className="text-center text-gray-600 mb-8">
            The current process creates anxiety, not confidence
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <ProblemCard
              icon="L"
              title="Opaque Artist Selection"
              description="Scrolling through Instagram for hours, hoping to find an artist whose style matches your vision. No data, no guidancejust endless scrolling and second-guessing."
              stat="78% rely on Instagram stalking"
            />
            <ProblemCard
              icon="L"
              title="No Try-Before-You-Commit"
              description="You can't see your design on your body until it's permanent. This uncertainty is the #1 reason people delay for months or cancel appointments."
              stat="4,200+ 'regret fear' mentions on Reddit"
            />
            <ProblemCard
              icon="L"
              title="Design Doesn't Exist Yet"
              description="You have an idea in your head, but no artistic skills to bring it to life. Consultations cost $50-100 each, and you still might not get what you imagined."
              stat="2,600+ 'design doesn't exist' mentions"
            />
            <ProblemCard
              icon="L"
              title="High Anxiety, High Regret Risk"
              description="25-30% of first-timers cancel their appointments due to anxiety. The fear of permanent regret paralyzes decision-making for months."
              stat="25-30% cancellation rate"
            />
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-lg font-semibold text-red-900 mb-2">
              The Result: 15-20 Months of Paralysis
            </p>
            <p className="text-sm text-red-800">
              First-timers spend over a year stuck between wanting a tattoo and
              being too afraid to commit. The current process offers no confidence,
              no visualization, and no data-driven guidance.
            </p>
          </div>
        </div>
      </div>

      {/* The Solution Section */}
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            How TatTester Transforms Every Step
          </h2>
          <p className="text-center text-gray-600 mb-8">
            From uncertainty to confidence in 2-4 weeks
          </p>

          <div className="space-y-6">
            <TransformationStage
              number="1"
              beforeTitle="Endless Idea Confusion"
              beforeDescription="You have a vague concept but can't visualize it. Hours on Pinterest lead to more confusion, not clarity."
              afterTitle="AI Design Generation"
              afterDescription="Describe your idea in plain language. Our AI creates 4 unique, professional-quality designs in 60 seconds. No artistic skills needed."
              icon="("
              isActive={activeStage === 1}
              onClick={() => setActiveStage(activeStage === 1 ? null : 1)}
            />

            <TransformationStage
              number="2"
              beforeTitle="Can't See It On Your Body"
              beforeDescription="You stare at a flat image, trying to imagine how it will look on your skin. The uncertainty keeps you up at night."
              afterTitle="AR Preview on YOUR Skin"
              afterDescription="See your design on your actual body with camera-based AR visualization. Try multiple placements, sizes, and angles. 87% of users feel confident after this step."
              icon="=ñ"
              isActive={activeStage === 2}
              onClick={() => setActiveStage(activeStage === 2 ? null : 2)}
            />

            <TransformationStage
              number="3"
              beforeTitle="Instagram Artist Roulette"
              beforeDescription="Scroll through hundreds of profiles, wondering: Do they do this style? Are they near me? Can I afford them? No answers, just anxiety."
              afterTitle="Smart Artist Matching"
              afterDescription="Our algorithm matches you with artists based on style expertise (40%), your keywords (25%), location (15%), and budget (10%). See compatibility scores, not guesswork."
              icon="<¯"
              isActive={activeStage === 3}
              onClick={() => setActiveStage(activeStage === 3 ? null : 3)}
            />

            <TransformationStage
              number="4"
              beforeTitle="Awkward Consultation Friction"
              beforeDescription="Book a consultation, try to explain your vision verbally, hope the artist understands. Repeat 2-3 times at $50-100 each."
              afterTitle="One-Click Design Sharing"
              afterDescription="Share your AI-generated design, AR preview screenshots, and placement notes directly with your matched artist. They see exactly what you want before you book."
              icon="=¬"
              isActive={activeStage === 4}
              onClick={() => setActiveStage(activeStage === 4 ? null : 4)}
            />

            <TransformationStage
              number="5"
              beforeTitle="Months of Second-Guessing"
              beforeDescription="Save dozens of reference images, change your mind weekly, postpone booking for another month. Rinse and repeat."
              afterTitle="Education & Confidence Building"
              afterDescription="Learn about styles, healing, placement, and artist selection through contextual tips. Build confidence progressively, not anxiety."
              icon="=Ú"
              isActive={activeStage === 5}
              onClick={() => setActiveStage(activeStage === 5 ? null : 5)}
            />
          </div>
        </div>
      </div>

      {/* The Impact Section */}
      <div className="bg-blue-50 border-y border-blue-200 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            The TatTester Difference
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ImpactCard
              metric="70%+"
              label="Design ’ AR Preview Rate"
              description="Users who see their design immediately want to visualize it on their body"
            />
            <ImpactCard
              metric="30%+"
              label="AR ’ Artist Contact Rate"
              description="After seeing it on their skin, users are ready to book"
            />
            <ImpactCard
              metric="3.5x"
              label="Booking Confidence"
              description="Users who preview in AR are 3.5x more likely to book within 2 weeks"
            />
          </div>

          <div className="bg-white rounded-lg border border-blue-300 p-8 text-center">
            <p className="text-2xl font-bold text-gray-900 mb-2">
              15-20 months ’ 2-4 weeks
            </p>
            <p className="text-base text-gray-700 mb-6">
              TatTester collapses the traditional decision timeline by 90% through
              confidence-building tools, not pressure tactics.
            </p>
            <Link
              to="/generate"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-all shadow-md"
            >
              Start Your Journey Now
            </Link>
          </div>
        </div>
      </div>

      {/* Customer Journey Timeline */}
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Your Journey in 8 Steps
          </h2>

          <div className="space-y-4">
            <JourneyStep
              number="1"
              title="Awareness"
              description="Discover TatTester through search, social media, or word of mouth"
              duration="Day 1"
            />
            <JourneyStep
              number="2"
              title="Consideration"
              description="Explore the platform, understand how AI + AR reduces anxiety"
              duration="Day 1-2"
            />
            <JourneyStep
              number="3"
              title="Design Creation"
              description="Use guided prompts or custom descriptions to generate 4 unique designs"
              duration="Day 2-3"
            />
            <JourneyStep
              number="4"
              title="AR Visualization"
              description="Preview designs on your body with multiple placements and sizes"
              duration="Day 3-5"
            />
            <JourneyStep
              number="5"
              title="Artist Discovery"
              description="Get matched with 20 artists based on style, location, and budget"
              duration="Day 5-7"
            />
            <JourneyStep
              number="6"
              title="Artist Selection"
              description="Swipe through artists, compare portfolios and compatibility scores"
              duration="Day 7-10"
            />
            <JourneyStep
              number="7"
              title="Booking/Contact"
              description="Share your design and AR previews, book consultation or appointment"
              duration="Day 10-14"
            />
            <JourneyStep
              number="8"
              title="Post-Booking"
              description="Receive prep checklist, aftercare guides, and artist communication tools"
              duration="Day 14+"
            />
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-gray-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Tattoo Journey?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Join thousands of first-timers who overcame tattoo anxiety with TatTester
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/generate"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-all shadow-md"
            >
              Generate Your First Design
            </Link>
            <Link
              to="/smart-match"
              className="bg-white hover:bg-gray-100 text-gray-900 px-8 py-3 rounded-lg font-semibold text-lg transition-all shadow-md"
            >
              Find Your Perfect Artist
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component: StatCard
function StatCard({ number, unit, label, highlight }) {
  const bgColor = highlight === 'good' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const textColor = highlight === 'good' ? 'text-green-900' : 'text-red-900';
  const labelColor = highlight === 'good' ? 'text-green-700' : 'text-red-700';

  return (
    <div className={`${bgColor} border rounded-lg p-4 text-center`}>
      <div className={`text-3xl font-bold ${textColor}`}>
        {number}
        {unit && <span className="text-xl ml-1">{unit}</span>}
      </div>
      <div className={`text-xs ${labelColor} mt-1`}>{label}</div>
    </div>
  );
}

// Component: ProblemCard
function ProblemCard({ icon, title, description, stat }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded inline-block">
        {stat}
      </div>
    </div>
  );
}

// Component: TransformationStage
function TransformationStage({
  number,
  beforeTitle,
  beforeDescription,
  afterTitle,
  afterDescription,
  icon,
  isActive,
  onClick
}) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all"
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
            {number}
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                    BEFORE
                  </span>
                  <h3 className="font-semibold text-gray-900">{beforeTitle}</h3>
                </div>
                <p className="text-sm text-gray-600">{beforeDescription}</p>
              </div>

              {/* After */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                    WITH TATTESTER
                  </span>
                  <span className="text-xl">{icon}</span>
                  <h3 className="font-semibold text-gray-900">{afterTitle}</h3>
                </div>
                <p className="text-sm text-gray-700 font-medium">{afterDescription}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component: ImpactCard
function ImpactCard({ metric, label, description }) {
  return (
    <div className="bg-white border border-blue-300 rounded-lg p-6 text-center">
      <div className="text-4xl font-bold text-blue-600 mb-2">{metric}</div>
      <div className="font-semibold text-gray-900 mb-2">{label}</div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

// Component: JourneyStep
function JourneyStep({ number, title, description, duration }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex gap-4 hover:shadow-sm transition-all">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded">
            {duration}
          </span>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}
