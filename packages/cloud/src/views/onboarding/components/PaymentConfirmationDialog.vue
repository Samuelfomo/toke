<template>
  <Teleport to="body">
    <div class="dialog-backdrop" role="presentation" @click.self="$emit('cancel')">
      <section
          ref="dialogRef"
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-confirmation-title"
          aria-describedby="payment-confirmation-description"
          @keydown.esc.prevent="$emit('cancel')"
      >
        <div class="dialog__icon" aria-hidden="true">✓</div>
        <div class="dialog__head">
          <span>Vérification avant paiement</span>
          <h2 id="payment-confirmation-title">Confirmez votre demande de paiement</h2>
          <p id="payment-confirmation-description">
            Vérifiez une dernière fois le montant et le numéro qui recevra la demande Mobile Money.
          </p>
        </div>

        <dl class="dialog__summary">
          <div>
            <dt>Montant à régler</dt>
            <dd>{{ amountLabel }}</dd>
          </div>
          <div>
            <dt>Numéro du payeur</dt>
            <dd>{{ maskedPhone }}</dd>
          </div>
        </dl>

        <div class="dialog__notice">
          <strong>Avant de continuer</strong>
          <p>
            Une demande de paiement pourra être envoyée sur ce téléphone. La validation finale s’effectue directement
            depuis le service Mobile Money du payeur.
          </p>
        </div>

        <div class="dialog__actions">
          <button ref="cancelRef" class="btn btn-secondary" type="button" :disabled="submitting"
                  @click="$emit('cancel')">
            Modifier
          </button>
          <button class="btn btn-primary" type="button" :disabled="submitting" @click="$emit('confirm')">
            {{ submitting ? 'Envoi en cours…' : 'Confirmer et envoyer' }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from 'vue'

const props = defineProps<{
  amount: string | number | null | undefined
  currency?: string | null
  phone: string
  submitting: boolean
}>()

defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm'): void
}>()

const dialogRef = ref<HTMLElement | null>(null)
const cancelRef = ref<HTMLButtonElement | null>(null)

const amountLabel = computed(() => formatMoney(props.amount, props.currency))
const maskedPhone = computed(() => {
  const digits = props.phone.replace(/\D/g, '')
  if (digits.length < 6) return props.phone || '—'
  return `+${digits.slice(0, 3)} ••• •• ${digits.slice(-4)}`
})

function formatMoney(value: string | number | null | undefined, currency?: string | null) {
  if (value == null || value === '') return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return `${value}${currency ? ` ${currency}` : ''}`
  try {
    if (currency && /^[A-Z]{3}$/.test(currency)) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(numeric)
    }
  } catch {
  }
  return `${new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2}).format(numeric)}${currency ? ` ${currency}` : ''}`
}

onMounted(async () => {
  await nextTick()
  cancelRef.value?.focus()
})
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(10, 27, 51, .54);
  backdrop-filter: blur(5px);
}

.dialog {
  width: min(100%, 520px);
  max-height: min(720px, calc(100vh - 48px));
  overflow: auto;
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, .65);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 28px 80px rgba(13, 42, 79, .28);
}

.dialog__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #eaf3ff;
  color: #004aad;
  font-size: 20px;
  font-weight: 900;
}

.dialog__head {
  margin-top: 18px;
}

.dialog__head > span {
  color: #004aad;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.dialog__head h2 {
  margin: 7px 0 8px;
  color: #17202a;
  font-size: 23px;
  line-height: 1.25;
}

.dialog__head p {
  margin: 0;
  color: #687789;
  font-size: 13px;
  line-height: 1.6;
}

.dialog__summary {
  margin: 22px 0 0;
  display: grid;
  gap: 10px;
}

.dialog__summary > div {
  padding: 15px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid #e3e9f0;
  border-radius: 13px;
  background: #f8fafc;
}

.dialog__summary dt {
  color: #778495;
  font-size: 12px;
}

.dialog__summary dd {
  margin: 0;
  color: #203044;
  font-size: 14px;
  font-weight: 800;
  text-align: right;
}

.dialog__notice {
  margin-top: 18px;
  padding: 15px 16px;
  border: 1px solid #f0d49c;
  border-radius: 13px;
  background: #fffaf0;
}

.dialog__notice strong {
  color: #7f4d08;
  font-size: 13px;
}

.dialog__notice p {
  margin: 5px 0 0;
  color: #875d22;
  font-size: 12px;
  line-height: 1.55;
}

.dialog__actions {
  margin-top: 24px;
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 10px;
}

.btn {
  min-height: 48px;
  padding: 0 16px;
  border-radius: 11px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.btn-primary {
  background: #004aad;
  color: #fff;
}

.btn-secondary {
  background: #fff;
  color: #004aad;
  border-color: #b9cbe1;
}

@media (max-width: 560px) {
  .dialog-backdrop {
    padding: 14px;
    align-items: end;
  }

  .dialog {
    padding: 22px 18px;
    border-radius: 20px 20px 14px 14px;
  }

  .dialog__summary > div {
    align-items: flex-start;
  }

  .dialog__actions {
    grid-template-columns: 1fr;
  }

  .btn-primary {
    order: -1;
  }
}
</style>
