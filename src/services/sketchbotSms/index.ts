// Public entry point of the SketchBot SMS channel module (TAT-49).
// Everything under internal/ is implementation detail — import only from
// here. The module is a CHANNEL ADAPTER: the design brain stays in
// '@/services/designSession' / '@/services/designConversation'; this module
// owns phone-keyed identity, SMS rendering, and the spend guardrails that
// make an unknown number unable to drain the budget (see internal/adapter.ts
// for the worst-case math).
export {
  handleInbound,
  executeReveal,
  recordOptOut,
  isOptedOut,
  revealsPerDay,
  freeReveals,
} from './internal/adapter';
export { parseInboundMedia } from './internal/media';
export type {
  InboundSms,
  InboundOutcome,
  InboundMediaItem,
  RevealDelivery,
  SmsProfile,
} from './types';
