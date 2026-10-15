import KpayWebhook from '../class/KpayWebhook.js';
let timer: ReturnType<typeof setInterval> | undefined;
let busy = false;
export function startKpayReconciliation() {
  if (timer || process.env.TOKE_KPAY_RECONCILIATION_ENABLED !== 'true') return;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await new KpayWebhook().reconcile();
    } catch {
      console.error('KPay reconciliation unavailable');
    } finally {
      busy = false;
    }
  };
  timer = setInterval(() => {
    void tick();
  }, 10000);
  timer.unref();
  void tick();
}
export function stopKpayReconciliation() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
