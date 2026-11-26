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
  if (code === 'memo_b1_not_ready')
    return 'La configuration de la base de cette entreprise bloque la consultation des mémos.';
  if (code === 'memo_writes_unavailable')
    return 'Les écritures de mémos sont indisponibles sur ce serveur.';
  if (code === 'memo_recipient_forbidden')
    return 'Ce collaborateur ne fait plus partie de vos destinataires autorisés.';
  if (code === 'memo_action_forbidden')
    return 'Votre compte ne peut pas effectuer cette action sur ce mémo.';
  if (code === 'memo_conflict')
    return 'Le mémo a changé. Actualisez-le avant de réessayer.';
  if (code === 'memo_command_invalid')
    return 'Vérifiez le titre et le texte du mémo avant de réessayer.';
  if (code === 'session_service_unauthorized' || code === 'session_service_configuration_missing')
    return 'Le serveur ne peut pas vérifier la session manager. Contactez l’assistance.';
  if (code === 'memo_actor_mismatch')
    return 'La session ne correspond pas au manager demandé. Reconnectez-vous.';
  if (code === 'invalid_integrator_context')
    return 'Le contexte intégrateur a expiré ou a été révoqué. Sélectionnez à nouveau le manager.';
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