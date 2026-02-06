import { responseValue, ViewType } from './response.model.js';

export class ValidationUtils {
  /**
   * ✅ Valide la valeur du paramètre "view" envoyé dans la query.
   * Retourne une valeur valide ("min" ou "full") ou la valeur par défaut.
   */
  static validateView(viewParam: any, defaultValue: ViewType = responseValue.FULL): ViewType {
    // Normaliser la valeur reçue
    const view = Array.isArray(viewParam) ? viewParam[0] : String(viewParam || '').trim();

    // Vérifier si la valeur est valide
    if (Object.values(responseValue).includes(view as ViewType)) {
      return view as ViewType;
    }

    // Sinon, retourner la valeur par défaut
    return defaultValue;
  }
}
