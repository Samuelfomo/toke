// Compatibilite des imports existants : une seule implementation en DBD.
export {
  previewRenewal,
  calculateRenewalPreview,
  renewalSubtotal,
  RenewalPreviewError,
} from '../database/base_model/db.renewal-preview.js';
export type { RenewalPreview } from '../database/base_model/db.renewal-preview.js';
