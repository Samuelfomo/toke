import type { Sequelize } from 'sequelize';

import { reconcileMonthlyAccess } from '../services/monthly-license-policy.js';
import { expireCommercialTransitions } from '../services/commercial-transition.js';
import { runScheduledActivations } from '../services/scheduled-license-activation.js';

/** Explicit opt-in after master migrations. Returns an async shutdown function. */
export function startScheduledActivationJob(db: Sequelize) {
  let stopping = false,
    running: Promise<void> | null = null;
  const tick = () => {
    if (stopping || running) return;
    running = runScheduledActivations(db)
      .then(async (outcomes) => {
        if (outcomes.length) console.log('Scheduled license activations:', outcomes);
        const monthly = await reconcileMonthlyAccess(db);
        if (monthly) console.log('Monthly access status changed:', monthly);
        const expired = await expireCommercialTransitions(db);
        if (expired) console.log('Commercial transitions ended:', expired);
      })
      .catch((error) => console.error('Scheduled license activation job failed:', error))
      .finally(() => {
        running = null;
      });
  };
  const timer = setInterval(tick, 60_000);
  timer.unref();
  tick();
  return async () => {
    stopping = true;
    clearInterval(timer);
    if (running) await running;
  };
}
