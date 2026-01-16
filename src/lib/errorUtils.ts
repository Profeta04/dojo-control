/**
 * Maps database and API errors to user-friendly messages.
 * Logs detailed errors for debugging while showing safe messages to users.
 */
export function getUserFriendlyError(error: unknown, fallbackMessage = "Ocorreu um erro. Tente novamente."): string {
  // Log full error for debugging
  console.error('Application error:', error);
  
  if (!error || typeof error !== 'object') {
    return fallbackMessage;
  }
  
  const err = error as { code?: string; message?: string };
  
  // Map known Postgres error codes to friendly messages
  switch (err.code) {
    case '23505': // unique_violation
      return 'Este registro já existe.';
    case '23503': // foreign_key_violation
      return 'Operação não permitida. Existem registros relacionados.';
    case '23502': // not_null_violation
      return 'Campos obrigatórios não preenchidos.';
    case '42501': // insufficient_privilege
      return 'Você não tem permissão para esta ação.';
    case 'PGRST116': // Row not found
      return 'Registro não encontrado.';
    case 'PGRST301': // JWT expired
      return 'Sua sessão expirou. Faça login novamente.';
    default:
      // For security, never expose the actual error message
      return fallbackMessage;
  }
}

/**
 * Safe error handler for async operations.
 * Use this wrapper in catch blocks to ensure errors are handled safely.
 */
export function handleError(
  error: unknown, 
  context: string,
  fallbackMessage?: string
): string {
  console.error(`Error in ${context}:`, error);
  return getUserFriendlyError(error, fallbackMessage);
}
