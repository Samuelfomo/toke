<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { useRouter } from 'vue-router'

import QrAuthService from '@/service/QrAuthService'

const router = useRouter()

const qrData = ref('')
const sessionId = ref<string | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const isExpired = ref(false)

let disconnectSocket: (() => void) | null = null
let expirationTimer: number | null = null

const currentYear = computed(() => new Date().getFullYear())

async function initQR(): Promise<void> {
  cleanup()

  try {
    loading.value = true
    isExpired.value = false
    errorMessage.value = null
    qrData.value = ''
    sessionId.value = null

    const payload = await QrAuthService.initSession()

    sessionId.value = payload.sessionId
    qrData.value = payload.qr_data

    connectWebSocket(payload.sessionId)

    expirationTimer = window.setTimeout(() => {
      handleExpired()
    }, payload.expiresIn)
  } catch (error) {
    console.error('Erreur initialisation QR:', error)
    errorMessage.value = 'Erreur lors de l’initialisation du QR Code.'
  } finally {
    loading.value = false
  }
}

function connectWebSocket(id: string): void {
  disconnectSocket = QrAuthService.connect(id, {
    authenticated: handleAuthenticated,
    rejected: handleRejected,
    expired: handleExpired,
    connectError: (error) => {
      console.error('Socket error:', error)
    },
  })
}

function handleAuthenticated(): void {
  cleanup()
  void router.push({ name: 'otp' })
}

function handleRejected(): void {
  cleanup()
  errorMessage.value = 'QR refusé par l’utilisateur'
}

function handleExpired(): void {
  cleanup()
  isExpired.value = true
}

function regenerate(): void {
  void initQR()
}

function cleanup(): void {
  disconnectSocket?.()
  disconnectSocket = null

  if (expirationTimer !== null) {
    window.clearTimeout(expirationTimer)
    expirationTimer = null
  }
}

onMounted(() => {
  void initQR()
})

onBeforeUnmount(cleanup)
</script>

<template>
  <div class="min-h-screen flex bg-gray-50">
    <div
      class="hidden md:flex w-3/5 bg-gradient-to-br from-gray-100 to-gray-200 p-12 flex-col justify-between"
    >
      <div>
        <img src="/images/toke-main-logo.svg" alt="Toke" class="h-12" />
      </div>

      <div class="flex justify-center items-center">
        <img
          src="/images/img.png"
          alt="Toke Illustration"
          class="max-h-[400px] rounded-2xl shadow-xl bg-white p-6"
        />
      </div>

      <div class="text-sm text-gray-500">
        © {{ currentYear }} Toké Manager. Tous droits réservés.
      </div>
    </div>

    <div class="w-full md:w-2/5 flex flex-col items-center justify-center p-8">
      <div class="w-full max-w-md">
        <h1 class="text-3xl font-semibold tracking-wide">
          Bienvenue sur le portail de Toké Manager
        </h1>

        <p class="mt-4 text-gray-500 text-lg font-light">
          Connectez-vous à votre compte et commencez l'aventure.
        </p>

        <div class="my-8 border-t border-gray-200"></div>

        <div class="bg-white shadow-lg rounded-2xl p-8 text-center">
          <p class="text-gray-700 font-medium mb-4">
            Scanner avec l'application mobile
          </p>

          <div class="flex justify-center">
            <QrcodeVue
              v-if="!loading && !isExpired && qrData"
              :value="qrData"
              :size="260"
              level="H"
            />

            <button
              v-else-if="isExpired"
              type="button"
              class="w-[260px] h-[260px] flex items-center justify-center font-medium cursor-pointer bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition"
              @click="regenerate"
            >
              QR expiré – Cliquer pour régénérer
            </button>

            <div
              v-else
              class="w-[260px] h-[260px] flex items-center justify-center bg-gray-100 rounded-xl text-gray-400"
            >
              Chargement...
            </div>
          </div>

          <p class="mt-6 text-sm text-gray-400">
            Ouvrez l'application Toké Manager et scannez le code pour vous connecter.
          </p>

          <p v-if="errorMessage" class="mt-4 text-red-500 text-sm">
            {{ errorMessage }}
          </p>
        </div>

        <!-- Alternative volontairement discrète pour préserver le design historique. -->
        <div class="mt-5 text-center">
          <p class="text-sm text-gray-500">
            Vous ne pouvez pas scanner le QR Code ?
          </p>
          <RouterLink
            to="/auth"
            class="mt-1 inline-flex items-center justify-center text-sm font-medium text-blue-600 no-underline transition hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
          >
            Se connecter autrement
          </RouterLink>
        </div>

        <p class="mt-4 text-gray-500 text-sm font-light">
          Ce portail est réservé aux comptes professionnels.
        </p>

        <div class="flex flex-row pt-4 justify-start items-center">
          <img src="/images/apps_store.png" alt="App Store" class="h-12 cursor-pointer" />
          <img src="/images/play_store.png" alt="Play Store" class="h-16 cursor-pointer" />
        </div>
      </div>
    </div>
  </div>
</template>
