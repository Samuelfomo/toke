/** User-facing handling for the read-only B2 memo endpoints. */
export function memoReadErrorMessage(error: unknown, fallback: string): string {
  const value = error as {
    code?: string;
    status?: number;
    payload?: { error?: { code?: string } };
    response?: { status?: number; data?: { error?: { code?: string } } };
  } | null;
  const code = value?.code ?? value?.payload?.error?.code ?? value?.response?.data?.error?.code;
  const status = value?.status ?? value?.response?.status;

  if (code === 'memo_permissions_pending')
    return 'La consultation des mémos n’est pas encore activée sur ce serveur.';
  if (code === 'memo_actor_mismatch')
    return 'La session ne correspond pas au manager demandé. Reconnectez-vous.';
  if (code === 'memo_not_found')
    return 'Ce mémo est introuvable ou votre session n’y a pas accès.';
  if (code === 'user_token_required' || status === 401)
    return 'Votre session a expiré. Reconnectez-vous pour consulter les mémos.';
  if (code === 'tenant_session_mismatch' || status === 403)
    return 'Cette session ne peut pas consulter les mémos de cette entreprise.';
  if (status === 503 || code === 'memo_read_unavailable' || code === 'memo_read_invalid_response')
    return 'Le service de consultation des mémos est temporairement indisponible.';
  return fallback;
}
