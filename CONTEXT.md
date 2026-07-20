# TatT

AI-powered tattoo design platform: AI design generation, AR preview, and
artist matching.

## Language

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
