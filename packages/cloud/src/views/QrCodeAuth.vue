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


            <div
                v-else-if="isExpired"
                @click="regenerate"
                class="w-[260px] h-[260px] flex items-center justify-center font-medium cursor-pointer bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition"
            >
              QR expiré – Cliquer pour régénérer
            </div>


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

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import axios from 'axios'
// import QrcodeVue from 'qrcode.vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'

const router = useRouter()

const qrData = ref('')
const sessionId = ref(null)
const loading = ref(true)
const errorMessage = ref(null)
const isExpired = ref(false)

let socket = null
let expirationTimer = null

const currentYear = computed(() => new Date().getFullYear())

const BASE_URL = 'https://my.toke.cm/local'

async function initQR() {
  cleanup()

  try {
    loading.value = true
    isExpired.value = false
    errorMessage.value = null


    const { data } = await axios.get(`${BASE_URL}/auth/qr/init` )

    if (!data.success) {
      throw new Error('Initialisation échouée')
    }

    const payload = data.data

    sessionId.value = payload.sessionId
    qrData.value = payload.qr_data

    connectWebSocket(payload.sessionId)

    expirationTimer = setTimeout(() => {
      handleExpired()
    }, payload.expiresIn)

  } catch (err) {
    console.error(err)
    errorMessage.value = 'Erreur lors de l’init QR'
  } finally {
    loading.value = false
  }
}

function connectWebSocket(id) {
  socket = io(`https://my.toke.cm/qr-auth`, {
    path: '/local/socket.io',
    transports: ['websocket','polling'],
    query: {
      sessionId: id
    },
  })

  socket.on('connect', () => {
    console.log('Socket connected')
  })

  socket.on('authenticated', () => {
    handleAuthenticated()
  })

  socket.on('rejected', () => {
    handleRejected()
  })

  socket.on('expired', () => {
    handleExpired()
  })

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err)
  })
}

function handleAuthenticated() {
  console.log('Authenticated')
  cleanup()

  router.push({
    name: 'otp'
  })
}

function handleRejected() {
  cleanup()
  errorMessage.value = 'QR refusé par l’utilisateur'
}

function handleExpired() {
  cleanup()
  isExpired.value = true
}

function regenerate() {
  initQR()
}

function cleanup() {
  if (socket) {
    socket.disconnect()
    socket = null
  }

  if (expirationTimer) {
    clearTimeout(expirationTimer)
    expirationTimer = null
  }
}

onMounted(initQR)
onBeforeUnmount(cleanup)
</script>
