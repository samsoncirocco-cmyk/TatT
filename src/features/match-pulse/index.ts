// Components
export { default as MatchPulseSidebar } from './components/Match/MatchPulseSidebar';
export { default as ArtistCard } from './components/Match/ArtistCard';
export { default as MatchPulse } from './components/Match/MatchPulse';
export { default as MatchSkeleton } from './components/Match/MatchSkeleton';

// Services
export * from './services/matchService';
export * from './services/neo4jService';
export * from './services/matchPulseIntegration';
export * from './services/hybridMatchService';
export * from './services/matchUpdateService';

// Hooks
export { useArtistMatching } from './hooks/useArtistMatching';
export { useRealtimeMatchPulse } from './hooks/useRealtimeMatchPulse';
