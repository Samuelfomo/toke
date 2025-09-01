<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-[#faf8f6] px-4">

    <!-- Logo -->
    <div class="mb-12">
      <img
        :src="logoSrc"
        :alt="logoAlt"
        class="h-32 w-32 p-lg"
      />
    </div>

    <!-- Titre principal -->
    <h1 class="text-4xl font-bold text-center leading-tight mb-2">
      Impossible?<br />Possible.
    </h1>
    <p class="text-lg text-gray-600 mb-10 text-center">
      The AI for problem solvers
    </p>

    <!-- Carte centrale -->
    <div class="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
      <div class="flex justify-center mb-4">
        <svg class="h-8 w-8 text-orange-500" fill="none" stroke="currentColor" stroke-width="2"
             viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round"
                d="M16 12H8m8 0a4 4 0 10-8 0 4 4 0 108 0z"/>
        </svg>
      </div>

      <p class="text-gray-700">
        To continue, click the link sent to
      </p>
      <p class="font-semibold text-gray-900 mt-1">{{ userEmail }}</p>

      <div class="mt-6 space-y-2 text-sm">
        <p>
          Signing in from another browser?
          <a href="#" class="text-blue-600 hover:underline">Enter verification code</a>
        </p>
        <p>
          Not seeing the email in your inbox?
          <a href="#" class="text-blue-600 hover:underline">Try sending again</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  logoSrc: {
    type: String,
    default: '/src/assets/images/toke.svg'
  },
  logoAlt: {
    type: String,
    default: 'Logo'
  },
  userEmail: {
    type: String,
    default: 'gfgfd@vvc.mgv'
  }
})
</script>
