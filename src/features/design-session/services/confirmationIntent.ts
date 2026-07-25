/**
 * Deterministic intent gate for the proposal state. Only clear affirmative
 * language advances to /confirm; corrections stay in the conversation.
 * Keeping this outside the model prevents an unchanged proposal from being
 * emitted again when the user has already said yes.
 */
export function isConfirmationIntent(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return false;
  if (
    /\b(no|nope|not yet|wait|actually|change|instead|wrong|missed|but)\b/.test(
      normalized
    )
  ) {
    return false;
  }

  return /^(yes|yeah|yep|yup|sure|ok|okay|perfect|absolutely|sounds good|looks good|go ahead|do it|let's do it|lets do it|show me|generate it)(\b|$)/.test(
    normalized
  );
}
