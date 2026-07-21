# TatT (rebranding to TattTester)

AI-powered tattoo design platform: AI design generation, AR preview, and
artist matching. Sells trust to first-time tattoo getters; revenue is model
access, artist bookings, and artist-side subscriptions — not design sales.

## Language

**TattTester**:
The primary consumer brand (ADR-0004). Promises the test: see it, wear it,
trust it before it's forever.
_Avoid_: TatT, Tatt Tester (two words), Image2Ink (as a brand name)

**Tatt-T**:
Spoken/DBA nickname for TattTester. Never the front door (sounds like
"tatty").

**Image2Ink**:
The design generator feature inside TattTester, and the discovery-angle
marketing door for people who don't know what tattoo they want.
_Avoid_: using it as the company or platform name

**First-timer**:
The primary customer: someone considering their first tattoo, afraid of
regret and of their own lack of artistic ability. The front door speaks to
them.
_Avoid_: user (when the emotional state matters)

**Generation**:
The pipeline that turns a user's idea into tattoo design images. One module,
one public entry point; callers never see which image provider ran.
_Avoid_: image service, SDXL pipeline

**Provider**:
A hidden backend inside the generation module that actually produces images
(Replicate SDXL, Vertex Imagen). Only the generation module knows providers
exist.
_Avoid_: model service, vendor client

**Council**:
The prompt-enhancement step that sharpens a user's idea before generation
(multi-agent Gemini simulation). Its own module with its own entry point;
generation is one of its callers.
_Avoid_: enhancer, prompt service

**Matching**:
Finding the right artist for a design via vector, graph, and real-time
signals. Not yet a deep module; see todolist.md.
_Avoid_: search, recommendations
