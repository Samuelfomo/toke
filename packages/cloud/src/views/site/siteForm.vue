<template>
  <div class="flex min-h-screen bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
    <div class="flex flex-col w-full">
      <Header />

      <!-- Loader overlay -->
      <div v-if="isBusy" class="fixed inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm z-50">
        <div class="w-14 h-14 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="mt-4 font-medium text-gray-500 text-sm">{{ busyLabel }}</p>
      </div>

      <div class="flex-grow flex">
        <main class="flex-grow py-8 px-4 lg:px-8 w-full max-w-[1600px] m-auto">

          <!-- ── En-tête + breadcrumb ─────────────────────────── -->
          <div class="mb-6">
            <div class="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <button @click="goBack" class="hover:text-indigo-600 transition-colors font-medium">Sites</button>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-900 font-semibold">{{ isEditMode ? 'Modifier le site' : 'Nouveau site' }}</span>
            </div>

            <!-- Stepper + actions globales -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
              <!-- Steps -->
              <div class="flex items-center gap-0">
                <template v-for="(step, idx) in steps" :key="step.id">
                  <!-- Step item -->
                  <div class="flex items-center gap-2 cursor-pointer" @click="goToStep(idx + 1)">
                    <div
                        class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 flex-shrink-0"
                        :class="getStepCircleClass(idx + 1)">
                      <svg v-if="currentStep > idx + 1" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span v-else>{{ idx + 1 }}</span>
                    </div>
                    <span
                        class="text-sm font-medium hidden sm:block"
                        :class="currentStep === idx + 1 ? 'text-indigo-600' : currentStep > idx + 1 ? 'text-gray-500' : 'text-gray-400'">
                      {{ step.label }}
                    </span>
                  </div>
                  <!-- Connector -->
                  <div v-if="idx < steps.length - 1" class="w-12 lg:w-20 h-0.5 mx-3 flex-shrink-0"
                       :class="currentStep > idx + 1 ? 'bg-indigo-400' : 'bg-gray-200'">
                  </div>
                </template>
              </div>

              <!-- Boutons navigation -->
              <div class="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                    @click="goBack"
                    :disabled="isBusy"
                    class="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium
                         hover:border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  Annuler
                </button>
                <button
                    v-if="currentStep > 1"
                    @click="prevStep"
                    :disabled="isBusy"
                    class="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium
                         hover:border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                  Retour
                </button>
                <button
                    v-if="currentStep < 3"
                    @click="nextStep"
                    :disabled="isBusy"
                    class="h-9 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold
                         hover:bg-indigo-700 active:scale-95 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100">
                  Suivant
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <button
                    v-if="currentStep === 3"
                    @click="submitSite"
                    ref="submitButton"
                    :disabled="isSubmitting || submitSucceeded || !siteIsReady"
                    class="h-9 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold
                         hover:bg-indigo-700 active:scale-95 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ submitButtonLabel }}
                </button>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════
               ÉTAPE 1 — Informations du site
          ══════════════════════════════════════════════════════ -->
          <div v-show="currentStep === 1">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <!-- Colonne principale -->
              <div class="lg:col-span-2 flex flex-col gap-6">
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h2 class="text-sm font-semibold text-gray-900">Informations du site</h2>
                      <p class="text-[11px] text-gray-400 mt-0.5">Renseignez seulement les informations métier essentielles. La localisation se configure à l’étape suivante.</p>
                    </div>
                  </div>

                  <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="md:col-span-2">
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                        Nom du site <span class="text-red-500">*</span>
                      </label>
                      <input
                          v-model="formData.name"
                          type="text"
                          placeholder="Ex : Pharmacie du Plateau"
                          class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800
                               placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                               transition-all duration-150"/>
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                        Type de site <span class="text-red-500">*</span>
                      </label>
                      <div class="relative">
                        <select
                            v-model="formData.site_type"
                            :disabled="isEditMode"
                            class="w-full h-10 pl-3.5 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 appearance-none
                                 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all duration-150 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed">
                          <option value="">Sélectionner un type</option>
                          <option value="manager_site">Site manager</option>
                          <option value="global_site">Site global</option>
                          <option value="public_site">Site public</option>
                          <option value="temporary_site">Site temporaire</option>
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                      <p v-if="isEditMode" class="text-[11px] text-gray-400 mt-1.5">Le type du site est conservé lors d’une modification.</p>
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">Statut</label>
                      <div class="flex items-center gap-3 h-10">
                        <button
                            type="button"
                            @click="formData.active = !formData.active"
                            class="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                            :class="formData.active ? 'bg-indigo-600' : 'bg-gray-300'">
                          <span
                              class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                              :class="formData.active ? 'translate-x-5' : 'translate-x-0'">
                          </span>
                        </button>
                        <div>
                          <p class="text-sm font-medium text-gray-700">{{ formData.active ? 'Actif' : 'Inactif' }}</p>
                          <p class="text-[11px] text-gray-400">{{ formData.active ? 'Le site peut être utilisé.' : 'Le site reste enregistré mais indisponible.' }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Adresse : résumé d'abord, correction manuelle à la demande -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <h2 class="text-sm font-semibold text-gray-900">Adresse du site</h2>
                      <p class="text-[11px] text-gray-400 mt-0.5">Toké peut la détecter automatiquement depuis la recherche, le GPS ou la carte.</p>
                    </div>
                    <span
                        class="ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
                        :class="addressIsComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                      {{ addressIsComplete ? 'Adresse renseignée' : 'À compléter' }}
                    </span>
                  </div>

                  <div class="p-6">
                    <div v-if="addressIsComplete && !showManualAddress" class="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                      <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                          <p class="text-sm font-semibold text-gray-800">{{ formData.address.place_name }}</p>
                          <p class="text-xs text-gray-600 mt-1">{{ formData.address.location }} · {{ formData.address.city }}</p>
                          <p v-if="siteLocation.addressResolved" class="text-[11px] text-emerald-700 mt-2">Adresse obtenue automatiquement depuis la carte.</p>
                        </div>
                        <button type="button" @click="showManualAddress = true" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex-shrink-0">
                          Corriger
                        </button>
                      </div>
                    </div>

                    <div v-else-if="!showManualAddress" class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                      <p class="text-sm font-semibold text-gray-700">Vous n’avez pas besoin de connaître l’adresse exacte maintenant.</p>
                      <p class="text-xs text-gray-500 mt-1.5">À l’étape « Localisation », recherchez le site, utilisez votre position ou cliquez sur la carte. Toké complétera l’adresse automatiquement.</p>
                      <button type="button" @click="showManualAddress = true" class="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                        Saisir l’adresse manuellement
                      </button>
                    </div>

                    <div v-if="showManualAddress" class="space-y-4">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <p class="text-xs font-semibold text-gray-700">Saisie / correction manuelle</p>
                          <p class="text-[11px] text-gray-400 mt-0.5">Ces champs restent compatibles avec le format d’adresse actuel de Toké.</p>
                        </div>
                        <button type="button" @click="showManualAddress = false" class="text-xs text-gray-500 hover:text-gray-700">Fermer</button>
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label class="block text-xs font-semibold text-gray-600 mb-1.5">Ville</label>
                          <input v-model="formData.address.city" type="text" placeholder="Ex : Douala"
                                 class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"/>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-gray-600 mb-1.5">Quartier / localisation</label>
                          <input v-model="formData.address.location" type="text" placeholder="Ex : Makepe"
                                 class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"/>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-gray-600 mb-1.5">Lieu-dit / adresse</label>
                          <input v-model="formData.address.place_name" type="text" placeholder="Ex : Face Santa Lucia"
                                 class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Colonne droite -->
              <div class="flex flex-col gap-6">
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </div>
                    <h2 class="text-sm font-semibold text-gray-900">Visibilité</h2>
                  </div>
                  <div class="p-6">
                    <label class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all mb-3"
                           :class="!formData.public ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'">
                      <input type="radio" :value="false" v-model="formData.public" class="mt-0.5 text-indigo-600"/>
                      <div>
                        <p class="text-sm font-semibold text-gray-800">Privé</p>
                        <p class="text-xs text-gray-500 mt-0.5">Pour les utilisateurs autorisés de votre organisation.</p>
                      </div>
                    </label>
                    <label class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                           :class="formData.public ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'">
                      <input type="radio" :value="true" v-model="formData.public" class="mt-0.5 text-indigo-600"/>
                      <div>
                        <p class="text-sm font-semibold text-gray-800">Public</p>
                        <p class="text-xs text-gray-500 mt-0.5">Accessible selon les règles publiques configurées dans Toké.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- CTA localisation -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="p-6">
                    <div class="flex items-start gap-3">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                           :class="locationIsConfigured ? 'bg-emerald-50' : 'bg-indigo-50'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" :class="locationIsConfigured ? 'text-emerald-600' : 'text-indigo-600'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm font-semibold text-gray-900">Localisation et zone de pointage</p>
                        <p class="text-xs text-gray-500 mt-1">
                          {{ locationIsConfigured ? 'La zone est déjà configurée. Vous pouvez la vérifier ou la modifier.' : 'Placez le site sur la carte puis choisissez le rayon de pointage.' }}
                        </p>
                      </div>
                    </div>

                    <div v-if="locationIsConfigured" class="mt-4 rounded-xl bg-emerald-50 px-3.5 py-3">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-semibold text-emerald-700">Zone configurée</span>
                        <span class="text-xs font-bold text-emerald-800">{{ geofenceMode === 'circle' ? `${formData.geofence_radius} m` : 'Personnalisée' }}</span>
                      </div>
                    </div>

                    <button
                        type="button"
                        @click="nextStep"
                        class="mt-4 w-full h-10 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-[0.99] transition-all shadow-sm">
                      {{ locationIsConfigured ? 'Vérifier la localisation' : 'Configurer la localisation' }}
                    </button>
                    <p class="text-[11px] text-gray-400 mt-2 text-center">Le rayon et la forme de la zone se règlent sur la carte.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════
               ÉTAPE 2 — Zone géographique (carte Yandex Maps)
          ══════════════════════════════════════════════════════ -->
          <div v-show="currentStep === 2">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <!-- Carte (2/3) -->
              <div class="lg:col-span-2">
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 space-y-3">

                    <div
                        v-if="selectedLocationLabel || siteLocation.addressResolved"
                        class="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/70">
                      <div class="flex items-start gap-3">
                        <div class="w-9 h-9 rounded-xl bg-white border border-emerald-100 flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <p class="text-xs font-semibold text-emerald-800">Emplacement identifié</p>
                            <span v-if="isResolvingAddress" class="text-[11px] text-emerald-600">Recherche de l’adresse…</span>
                          </div>
                          <p v-if="selectedLocationLabel" class="text-sm font-semibold text-gray-800 mt-1 truncate">{{ selectedLocationLabel }}</p>
                          <p v-if="selectedLocationDetails" class="text-xs text-gray-500 mt-0.5">{{ selectedLocationDetails }}</p>
                          <p v-if="siteLocation.coordinates" class="text-[11px] text-gray-500 mt-1.5">
                            {{ siteLocation.coordinates.lat.toFixed(6) }}, {{ siteLocation.coordinates.lng.toFixed(6) }}
                          </p>
                          <p v-if="siteLocation.addressResolved" class="text-[11px] text-emerald-700 mt-1.5">
                            Adresse reportée automatiquement dans les informations du site. Le marqueur violet reste déplaçable pour corriger précisément l’emplacement.
                          </p>
                        </div>
                      </div>
                    </div>

                    <!-- Position actuelle -->
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border border-sky-100 bg-sky-50/70">
                      <div class="flex items-start gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-white border border-sky-100 flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21s6-5.686 6-11a6 6 0 10-12 0c0 5.314 6 11 6 11z"/>
                            <circle cx="12" cy="10" r="2" stroke-width="2"/>
                          </svg>
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs font-semibold text-sky-800">Votre position actuelle</p>
                          <p v-if="!currentPosition.coordinates && !geolocationError" class="text-xs text-sky-600 mt-0.5">
                            Si vous êtes déjà sur le site, Toké peut vous repérer et recentrer la carte.
                          </p>
                          <div v-else-if="currentPosition.coordinates" class="mt-1 flex flex-wrap items-center gap-2">
                            <span class="text-xs font-medium text-sky-800">Position détectée</span>
                            <span
                                class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                :class="currentAccuracyLevel === 'good'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : currentAccuracyLevel === 'medium'
                                    ? 'bg-amber-100 text-amber-700'
                                    : currentAccuracyLevel === 'low'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-600'">
                              {{ currentAccuracyLabel }}
                            </span>
                            <span v-if="currentAccuracyLevel === 'low'" class="text-[11px] text-red-600">Vérifiez visuellement le point sur la carte.</span>
                          </div>
                          <p v-else class="text-xs text-red-600 mt-0.5">{{ geolocationError?.message }}</p>
                        </div>
                      </div>

                      <button
                          type="button"
                          @click="locateCurrentPosition"
                          :disabled="isLocating"
                          class="h-9 px-4 rounded-xl bg-sky-600 text-white text-xs font-semibold flex items-center justify-center gap-2
                                 shadow-sm hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex-shrink-0">
                        <svg v-if="!isLocating" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21s6-5.686 6-11a6 6 0 10-12 0c0 5.314 6 11 6 11z"/>
                          <circle cx="12" cy="10" r="2" stroke-width="2"/>
                        </svg>
                        <svg v-else class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle class="opacity-30" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3"/>
                          <path class="opacity-90" fill="currentColor" d="M21 12a9 9 0 00-9-9v3a6 6 0 016 6h3z"/>
                        </svg>
                        {{ isLocating ? 'Localisation...' : (currentPosition.coordinates ? 'Actualiser ma position' : 'Utiliser ma position') }}
                      </button>
                    </div>

                    <p v-if="currentPosition.coordinates" class="text-[11px] text-gray-400 px-1">
                      Le repère bleu correspond à votre position réelle. Le marqueur violet correspond à l’emplacement retenu pour le site et peut être déplacé sans modifier votre position GPS.
                    </p>

                    <div class="flex items-start gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21s6-5.686 6-11a6 6 0 10-12 0c0 5.314 6 11 6 11z"/>
                        <circle cx="12" cy="10" r="2" stroke-width="2"/>
                      </svg>
                      <div>
                        <p class="text-xs font-semibold text-violet-700">Placement rapide du site</p>
                        <p class="text-xs text-violet-600 mt-0.5">Cliquez une fois sur la carte pour placer le site. Faites ensuite glisser le marqueur violet pour l’ajuster précisément.</p>
                      </div>
                    </div>

                    <!-- Instructions contextuelles -->
                    <div v-if="geofenceMode === 'circle'" class="flex items-start gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="8" stroke-width="2"/>
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                      </svg>
                      <div>
                        <p class="text-xs font-semibold text-violet-700">Zone circulaire automatique</p>
                        <p class="text-xs text-violet-600 mt-0.5">Choisissez simplement l'emplacement du site. Toké génère automatiquement la zone de <strong>{{ formData.geofence_radius }} m</strong> autour du marqueur violet.</p>
                      </div>
                    </div>
                    <div v-else-if="!mapDrawing" class="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                      <div>
                        <p class="text-xs font-semibold text-indigo-700">Zone personnalisée</p>
                        <p class="text-xs text-indigo-500 mt-0.5">Cliquez sur « Dessiner » pour tracer manuellement le polygone. Ce mode reste disponible pour les bâtiments ou terrains irréguliers.</p>
                      </div>
                    </div>
                    <div v-else class="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                      <div>
                        <p class="text-xs font-semibold text-emerald-700">Mode dessin actif — {{ drawPointsCount }} / {{ MAX_POLYGON_POINTS }} points</p>
                        <p class="text-xs text-emerald-600 mt-0.5">Ajoutez autant de sommets que nécessaire (jusqu’à 20). Vous pouvez annuler le dernier point, puis cliquer sur <strong>Valider</strong> dès que la zone contient au moins 3 points.</p>
                      </div>
                    </div>
                  </div>

                  <!-- Carte Yandex Maps -->
                  <div class="relative">
                    <div ref="mapContainer" class="w-full h-[480px] bg-gray-100"></div>

                    <!-- Contrôles carte -->
                    <div v-if="geofenceMode === 'polygon'" class="absolute bottom-4 left-4 flex flex-col gap-2">
                      <!-- Dessiner -->
                      <button
                          v-if="!mapDrawing"
                          type="button"
                          @click="startDrawing"
                          class="h-9 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold
                                 flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"
                          title="Lancer le dessin du polygone">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                        Dessiner
                      </button>
                      <!-- Valider (visible après dessin) -->
                      <button
                          v-else
                          type="button"
                          @click="stopDrawing"
                          :disabled="!canFinishDrawing"
                          :class="[
                            'h-9 px-4 rounded-xl text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-all',
                            canFinishDrawing ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'
                          ]"
                          :title="canFinishDrawing ? 'Valider le polygone dessiné' : `Ajoutez au moins ${MIN_POLYGON_POINTS} points`">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Valider
                      </button>
                      <!-- Annuler le dernier point pendant le tracé -->
                      <button
                          v-if="mapDrawing && drawPointsCount > 0"
                          type="button"
                          @click="undoLastDrawingPoint"
                          class="h-9 px-3 rounded-xl bg-white text-amber-700 text-xs font-semibold
                                 flex items-center gap-2 shadow-md hover:bg-amber-50 transition-colors"
                          title="Annuler le dernier point">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l-4-4 4-4m-4 4h9a5 5 0 010 10h-2"/>
                        </svg>
                        Annuler dernier
                      </button>
                      <!-- Effacer -->
                      <button
                          type="button"
                          @click="clearMapPolygon"
                          class="w-9 h-9 rounded-xl bg-white text-red-500 flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
                          title="Effacer le polygone">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Stats polygone -->
                  <div class="px-6 py-3 border-t border-gray-100 grid grid-cols-4 gap-4">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                        </svg>
                      </div>
                      <div>
                        <p class="text-xs text-gray-400">Surface approx.</p>
                        <p class="text-xs font-semibold text-gray-700">{{ polygonStats.area }} m²</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3"/>
                        </svg>
                      </div>
                      <div>
                        <p class="text-xs text-gray-400">Périmètre</p>
                        <p class="text-xs font-semibold text-gray-700">{{ polygonStats.perimeter }} m</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        </svg>
                      </div>
                      <div>
                        <p class="text-xs text-gray-400">{{ geofenceMode === 'circle' ? 'Type' : 'Points' }}</p>
                        <p class="text-xs font-semibold text-gray-700">{{ geofenceMode === 'circle' ? 'Circulaire' : displayCoordinates.length }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                      </div>
                      <div>
                        <p class="text-xs text-gray-400">Rayon défini</p>
                        <p class="text-xs font-semibold text-gray-700">{{ formData.geofence_radius }} m</p>
                      </div>
                    </div>
                  </div>

                  <!-- Statut zone -->
                  <div class="px-6 py-3 border-t border-gray-100">
                    <div v-if="geofenceIsValid"
                         class="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <p class="text-xs font-semibold">
                        {{ geofenceMode === 'circle'
                          ? `Zone automatique valide — ${formData.geofence_radius} m autour du site`
                          : `Zone personnalisée valide — ${displayCoordinates.length} points` }}
                      </p>
                    </div>
                    <div v-else
                         class="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2.5 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001c-.77 1.332.192 2.999 1.732 2.999z"/>
                      </svg>
                      <p class="text-xs font-semibold">{{ !geofenceRadiusIsValid ? 'Rayon invalide — entre 1 et 10 000 m' : (geofenceMode === 'circle' ? 'Choisissez l’emplacement du site' : 'Zone invalide — minimum 3 sommets requis') }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Panneau latéral : choix du type de zone + options avancées -->
              <div class="flex flex-col gap-4">

                <!-- Type de zone -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-5 py-4 border-b border-gray-100">
                    <h3 class="text-sm font-semibold text-gray-900">Type de zone</h3>
                    <p class="text-xs text-gray-400 mt-0.5">Le mode circulaire convient à la majorité des sites.</p>
                  </div>
                  <div class="p-5 space-y-3">
                    <button
                        type="button"
                        @click="setGeofenceMode('circle')"
                        class="w-full p-3 rounded-xl border text-left transition-all"
                        :class="geofenceMode === 'circle' ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:border-gray-300'">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <p class="text-xs font-semibold text-gray-800">Zone circulaire</p>
                          <p class="text-[11px] text-gray-500 mt-0.5">Recommandé — générée automatiquement autour du site</p>
                        </div>
                        <span v-if="geofenceMode === 'circle'" class="text-[10px] font-semibold text-violet-700 bg-violet-100 px-2 py-1 rounded-full">Actif</span>
                      </div>
                    </button>

                    <button
                        type="button"
                        @click="setGeofenceMode('polygon')"
                        class="w-full p-3 rounded-xl border text-left transition-all"
                        :class="geofenceMode === 'polygon' ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <p class="text-xs font-semibold text-gray-800">Zone personnalisée</p>
                          <p class="text-[11px] text-gray-500 mt-0.5">Avancé — dessin manuel pour les formes irrégulières</p>
                        </div>
                        <span v-if="geofenceMode === 'polygon'" class="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full">Actif</span>
                      </div>
                    </button>

                    <div v-if="geofenceMode === 'circle'" class="pt-2 border-t border-gray-100">
                      <label class="block text-xs font-semibold text-gray-600 mb-2">Rayon de pointage</label>
                      <div class="grid grid-cols-3 gap-2">
                        <button
                            v-for="radius in radiusPresets"
                            :key="radius"
                            type="button"
                            @click="formData.geofence_radius = radius"
                            class="h-8 rounded-lg border text-xs font-semibold transition-all"
                            :class="formData.geofence_radius === radius ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'">
                          {{ radius }} m
                        </button>
                      </div>
                      <div class="mt-3">
                        <label class="block text-[11px] text-gray-500 mb-1">Rayon personnalisé</label>
                        <div class="relative">
                          <input
                              v-model.number="formData.geofence_radius"
                              type="number" min="1" max="10000"
                              class="w-full h-9 px-3 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"/>
                          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">m</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Saisie manuelle : mode avancé uniquement -->
                <div v-if="geofenceMode === 'polygon'" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-5 py-4 border-b border-gray-100">
                    <h3 class="text-sm font-semibold text-gray-900">Ajouter un point</h3>
                    <p class="text-xs text-gray-400 mt-0.5">Saisie manuelle — de {{ MIN_POLYGON_POINTS }} à {{ MAX_POLYGON_POINTS }} sommets</p>
                  </div>
                  <div class="p-5 space-y-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1.5">Longitude</label>
                      <input
                          v-model.number="manualPoint.lng"
                          type="number" step="0.000001" placeholder="Ex: 9.751563"
                          class="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800
                               placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1.5">Latitude</label>
                      <input
                          v-model.number="manualPoint.lat"
                          type="number" step="0.000001" placeholder="Ex: 4.085801"
                          class="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800
                               placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
                    </div>
                    <button
                        type="button"
                        @click="addManualPoint"
                        class="w-full h-9 bg-indigo-600 text-white rounded-xl text-xs font-semibold
                             hover:bg-indigo-700 active:scale-95 transition-all">
                      + Ajouter le point
                    </button>
                  </div>
                </div>

                <!-- Liste des coordonnées : mode avancé uniquement -->
                <div v-if="geofenceMode === 'polygon'" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
                  <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 class="text-sm font-semibold text-gray-900">Coordonnées du polygone</h3>
                      <p class="text-xs text-gray-400 mt-0.5">{{ displayCoordinates.length }} points définis</p>
                    </div>
                    <button
                        v-if="displayCoordinates.length > 0"
                        type="button"
                        @click="clearCoordinates"
                        class="text-xs text-red-500 hover:text-red-600 font-medium transition-colors">
                      Tout effacer
                    </button>
                  </div>

                  <div v-if="displayCoordinates.length > 0" class="max-h-72 overflow-y-auto p-3 space-y-1.5">
                    <div
                        v-for="(coord, idx) in displayCoordinates"
                        :key="idx"
                        class="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 group transition-colors">
                      <div class="flex items-center gap-2.5">
                        <div class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {{ idx + 1 }}
                        </div>
                        <div class="text-xs">
                          <p class="text-gray-500">
                            <span class="font-medium text-gray-700">{{ coord[0].toFixed(5) }}</span>
                            <span class="mx-1 text-gray-300">|</span>
                            <span class="font-medium text-gray-700">{{ coord[1].toFixed(5) }}</span>
                          </p>
                        </div>
                      </div>
                      <button
                          type="button"
                          @click="removePoint(idx)"
                          class="w-7 h-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all"
                          title="Supprimer ce point">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div v-else class="py-10 text-center px-4">
                    <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                      </svg>
                    </div>
                    <p class="text-xs font-medium text-gray-500">Aucun point défini</p>
                    <p class="text-xs text-gray-400 mt-1">Cliquez sur la carte ou ajoutez des points manuellement</p>
                  </div>
                </div>

                <!-- Recentrer la zone -->
                <button
                    v-if="displayCoordinates.length >= 3"
                    type="button"
                    @click="centerMapOnPolygon"
                    class="w-full h-9 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium
                         hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center gap-2 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                  </svg>
                  Recentrer la zone
                </button>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════
               ÉTAPE 3 — Révision
          ══════════════════════════════════════════════════════ -->
          <div v-show="currentStep === 3">
            <div class="space-y-6">
              <!-- Etat global -->
              <div
                  class="rounded-2xl border shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  :class="siteIsReady ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'">
                <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                  <svg v-if="siteIsReady" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001c-.77 1.332.192 2.999 1.732 2.999z"/>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold" :class="siteIsReady ? 'text-emerald-900' : 'text-amber-900'">
                    {{ siteIsReady ? (isEditMode ? 'Les modifications sont prêtes à être enregistrées' : 'Le site est prêt à être enregistré') : 'Quelques informations restent à vérifier' }}
                  </p>
                  <p class="text-xs mt-1" :class="siteIsReady ? 'text-emerald-700' : 'text-amber-700'">
                    {{ siteIsReady ? (isEditMode ? 'Vérifiez le résumé ci-dessous puis confirmez la mise à jour.' : 'Vérifiez le résumé ci-dessous puis confirmez la création du site.') : 'Vérifiez l’adresse et la zone géographique avant de continuer.' }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Site -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                      </svg>
                    </div>
                    <h2 class="text-sm font-semibold text-gray-900">Informations du site</h2>
                    <button type="button" @click="goToStep(1)" class="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-700">Modifier</button>
                  </div>
                  <div class="p-6 space-y-5">
                    <div>
                      <p class="text-xs text-gray-400">Nom</p>
                      <p class="text-base font-semibold text-gray-900 mt-0.5">{{ formData.name || '—' }}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <p class="text-xs text-gray-400">Type</p>
                        <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ siteTypeLabel(formData.site_type!) }}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-400">Visibilité</p>
                        <span class="inline-flex mt-1 px-2 py-0.5 rounded-md text-xs font-medium" :class="formData.public ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600'">
                          {{ formData.public ? 'Public' : 'Privé' }}
                        </span>
                      </div>
                      <div>
                        <p class="text-xs text-gray-400">Statut</p>
                        <span class="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md text-xs font-medium" :class="formData.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'">
                          <span class="w-1.5 h-1.5 rounded-full" :class="formData.active ? 'bg-emerald-500' : 'bg-red-400'"></span>
                          {{ formData.active ? 'Actif' : 'Inactif' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Localisation -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <h2 class="text-sm font-semibold text-gray-900">Localisation et zone</h2>
                    <button type="button" @click="goToStep(2)" class="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-700">Modifier</button>
                  </div>
                  <div class="p-6 space-y-4">
                    <div class="rounded-xl bg-gray-50 p-4">
                      <p class="text-xs text-gray-400">Adresse retenue</p>
                      <p class="text-sm font-semibold text-gray-900 mt-1">{{ formData.address.place_name || 'Adresse non renseignée' }}</p>
                      <p class="text-xs text-gray-500 mt-1">{{ [formData.address.location, formData.address.city].filter(Boolean).join(' · ') || '—' }}</p>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div class="rounded-xl border border-gray-100 p-3.5">
                        <p class="text-xs text-gray-400">Zone de pointage</p>
                        <p class="text-sm font-semibold text-gray-800 mt-1">{{ geofenceMode === 'circle' ? 'Circulaire' : 'Personnalisée' }}</p>
                      </div>
                      <div class="rounded-xl border border-gray-100 p-3.5">
                        <p class="text-xs text-gray-400">{{ geofenceMode === 'circle' ? 'Rayon' : 'Sommets' }}</p>
                        <p class="text-sm font-semibold text-gray-800 mt-1">{{ geofenceMode === 'circle' ? `${formData.geofence_radius} m` : `${displayCoordinates.length} points` }}</p>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 text-xs font-medium px-3 py-2.5 rounded-xl" :class="geofenceIsValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'">
                      <span class="w-2 h-2 rounded-full" :class="geofenceIsValid ? 'bg-emerald-500' : 'bg-red-500'"></span>
                      {{ geofenceIsValid ? 'Zone géographique valide' : (!geofenceRadiusIsValid ? 'Rayon géographique invalide' : 'Zone géographique à définir') }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Détails techniques : volontairement secondaires -->
              <details class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                <summary class="px-6 py-4 cursor-pointer list-none flex items-center gap-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                  Détails techniques de la zone
                  <span class="ml-auto text-[11px] font-normal text-gray-400">Diagnostic / support</span>
                </summary>
                <div class="px-6 pb-6 pt-2 border-t border-gray-100">
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="bg-gray-50 rounded-xl p-3">
                      <p class="text-xs text-gray-400">Surface approx.</p>
                      <p class="text-sm font-bold text-gray-800 mt-1">{{ polygonStats.area }} m²</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                      <p class="text-xs text-gray-400">Périmètre</p>
                      <p class="text-sm font-bold text-gray-800 mt-1">{{ polygonStats.perimeter }} m</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                      <p class="text-xs text-gray-400">Source position</p>
                      <p class="text-sm font-bold text-gray-800 mt-1">{{ locationSourceLabel }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                      <p class="text-xs text-gray-400">Coordonnées</p>
                      <p v-if="siteLocation.coordinates" class="text-xs font-semibold text-gray-700 mt-1 break-all">{{ siteLocation.coordinates.lat.toFixed(6) }}, {{ siteLocation.coordinates.lng.toFixed(6) }}</p>
                      <p v-else class="text-sm font-bold text-gray-800 mt-1">—</p>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>

        </main>
      </div>
      <Footer />

      <!-- Toast -->
      <div
          ref="toastRef"
          class="fixed right-6 top-6 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium z-[100]
               opacity-0 translate-y-2 transition-all duration-300 pointer-events-none"
          :class="messageType === 'success' ? 'bg-emerald-500' : 'bg-red-500'">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="messageType === 'success'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        {{ messageText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import gsap from 'gsap';

import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import HeadBuilder from '@/utils/HeadBuilder';
import SiteService from '@/service/SiteService';
import { CreateSite, UpdateSite } from '@/utils/interfaces/site.interface';
import { useUserStore } from '@/stores/userStore';
import { useSiteLocation } from '@/composables/site/useSiteLocation';
import { circleToPolygon } from '@/utils/geo/circleToPolygon';
import { getPolygonApproximateCenter, normalizePolygonForApi } from '@/utils/geo/polygon';
import {
  isUsableSiteAddress,
  mapYandexGeoObjectToSiteAddress,
} from '@/utils/geo/yandexAddressMapper';

// ─── Wizard steps ──────────────────────────────────────────────────────────────

const steps = [
  { id: 1, label: 'Informations' },
  { id: 2, label: 'Localisation' },
  { id: 3, label: 'Révision' },
];

const currentStep = ref(1);

const getStepCircleClass = (step: number) => {
  if (currentStep.value > step) return 'bg-indigo-600 text-white';
  if (currentStep.value === step) return 'bg-indigo-600 text-white ring-4 ring-indigo-100';
  return 'bg-gray-100 text-gray-400';
};

const goToStep = (step: number) => {
  if (isBusy.value || step < 1 || step > 3 || step === currentStep.value) return;

  if (step > 1 && !validateStep1()) {
    currentStep.value = 1;
    return;
  }

  if (step > 2 && !validateStep2()) {
    currentStep.value = 2;
    nextTick(() => initMap());
    return;
  }

  currentStep.value = step;
  if (step === 2) nextTick(() => initMap());
};

// ─── State ─────────────────────────────────────────────────────────────────────

const route = useRoute();
const router = useRouter();
const isLoadingSite = ref(false);
const isSubmitting = ref(false);
const submitSucceeded = ref(false);
const initialPersistedSnapshot = ref('');

const isBusy = computed(() => isLoadingSite.value || isSubmitting.value);
const busyLabel = computed(() => {
  if (isLoadingSite.value) return 'Chargement du site...';
  if (submitSucceeded.value) return isEditMode.value ? 'Site mis à jour...' : 'Site créé...';
  return isEditMode.value ? 'Mise à jour du site...' : 'Enregistrement du site...';
});
const submitButtonLabel = computed(() => {
  if (submitSucceeded.value) return 'Enregistré';
  if (isSubmitting.value) return isEditMode.value ? 'Mise à jour...' : 'Création...';
  return isEditMode.value ? 'Mettre à jour' : 'Créer le site';
});

const siteGuid = ref<string | null>(route.query.guid ? String(route.query.guid) : null);
const isEditMode = computed(() => !!siteGuid.value && siteGuid.value !== 'new');

const toastRef = ref<HTMLElement | null>(null);
const submitButton = ref<HTMLElement | null>(null);
const messageType = ref<'success' | 'error'>('success');
const messageText = ref('');

const userStore = useUserStore();

const {
  selection: siteLocation,
  currentPosition,
  geolocationError,
  isLocating,
  currentAccuracyLevel,
  currentAccuracyLabel,
  setCoordinates,
  replaceAddress,
  requestCurrentPosition,
} = useSiteLocation();

const formData = ref<CreateSite>({
  name: '',
  site_type: '',
  address: { city: '', location: '', place_name: '' },
  geofence_radius: 100,
  active: true,
  public: false,
  geofence_polygon: {
    crs: { type: 'name', properties: { name: 'EPSG:4326' } },
    type: 'Polygon',
    coordinates: [[]],
  },
  created_by: userStore.user?.guid || '',
});

const manualPoint = ref<{ lng: number | null; lat: number | null }>({ lng: null, lat: null });
const showManualAddress = ref(false);

// ─── Yandex Maps (polygon.editor natif — identique à map.vue) ─────────────────
const mapContainer = ref<HTMLDivElement | null>(null);
let ymap: any = null;
let ymapPolygon: any = null;
let currentLocationMarker: any = null;
let currentLocationAccuracyCircle: any = null;
let selectedSiteMarker: any = null;
let automaticGeofenceCircle: any = null;
let searchControl: any = null;

type GeofenceMode = 'circle' | 'polygon';
const geofenceMode = ref<GeofenceMode>(isEditMode.value ? 'polygon' : 'circle');
const radiusPresets = [25, 50, 100, 150, 200];

const selectedLocationLabel = ref('');
const selectedLocationDetails = ref('');
const isResolvingAddress = ref(false);
const mapDrawing = ref(false);
const drawPointsCount = ref(0);
const MIN_POLYGON_POINTS = 3;
const MAX_POLYGON_POINTS = 20;
let lastCustomPolygon: CreateSite['geofence_polygon'] | null = null;
let addressResolutionSequence = 0;

// ─── Computed ──────────────────────────────────────────────────────────────────

const displayCoordinates = computed(() => {
  const coords = formData.value.geofence_polygon.coordinates[0];
  if (!coords || coords.length === 0) return [];
  const last = coords[coords.length - 1];
  const first = coords[0];
  const isClosed = first[0] === last[0] && first[1] === last[1];
  return isClosed ? coords.slice(0, -1) : coords;
});

const isPolygonValid = computed(() => normalizePolygonForApi(formData.value.geofence_polygon as any) !== null);
const geofenceRadiusIsValid = computed(() => {
  const radius = Number(formData.value.geofence_radius);
  return Number.isInteger(radius) && radius >= 1 && radius <= 10000;
});
const geofenceIsValid = computed(() => isPolygonValid.value && geofenceRadiusIsValid.value);
const canFinishDrawing = computed(() => drawPointsCount.value >= MIN_POLYGON_POINTS);
const addressIsComplete = computed(() => isUsableSiteAddress(formData.value.address));
const locationIsConfigured = computed(() => geofenceIsValid.value && addressIsComplete.value);
const siteIsReady = computed(() => Boolean(formData.value.name && formData.value.site_type && locationIsConfigured.value));

const persistedFormState = computed(() => ({
  name: String(formData.value.name || '').trim(),
  site_type: formData.value.site_type || '',
  address: {
    city: String(formData.value.address?.city || '').trim(),
    location: String(formData.value.address?.location || '').trim(),
    place_name: String(formData.value.address?.place_name || '').trim(),
  },
  geofence_radius: Number(formData.value.geofence_radius),
  geofence_polygon: formData.value.geofence_polygon,
  active: Boolean(formData.value.active),
  public: Boolean(formData.value.public),
}));

const currentPersistedSnapshot = computed(() => JSON.stringify(persistedFormState.value));
const hasUnsavedChanges = computed(() => Boolean(
  initialPersistedSnapshot.value &&
  currentPersistedSnapshot.value !== initialPersistedSnapshot.value &&
  !submitSucceeded.value,
));

const capturePersistedSnapshot = () => {
  initialPersistedSnapshot.value = currentPersistedSnapshot.value;
};
const locationSourceLabel = computed(() => {
  const labels: Record<string, string> = {
    gps: 'Position GPS',
    search: 'Recherche Yandex',
    map: 'Clic sur la carte',
    manual: 'Position manuelle',
    none: 'Non déterminée',
  };
  return labels[siteLocation.value.source] || 'Non déterminée';
});

// ─── Stats polygone ────────────────────────────────────────────────────────────

const polygonStats = computed(() => {
  const pts = displayCoordinates.value;
  if (pts.length < 3) return { area: 0, perimeter: 0 };

  const R = 6371000; // rayon terrestre en mètres
  const toRad = (d: number) => d * Math.PI / 180;

  // Périmètre
  let perimeter = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dLat = toRad(b[1] - a[1]);
    const dLng = toRad(b[0] - a[0]);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
    perimeter += 2 * R * Math.asin(Math.sqrt(x));
  }

  // Aire (formule de Shoelace sphérique approximée)
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += toRad(pts[j][0] - pts[i][0]) * (2 + Math.sin(toRad(pts[i][1])) + Math.sin(toRad(pts[j][1])));
  }
  area = Math.abs(area) * R * R / 2;

  return {
    area: Math.round(area),
    perimeter: Math.round(perimeter),
  };
});

// ─── SVG helpers (identiques à site.vue) ──────────────────────────────────────

const getPolygonPoints = (coords: number[][][]): number[][] => {
  const ring = coords[0];
  if (!ring || ring.length < 2) return [];
  const last = ring[ring.length - 1];
  const isClosed = ring[0][0] === last[0] && ring[0][1] === last[1];
  return isClosed ? ring.slice(0, -1) : ring;
};

const getSvgViewBox = (coordinates: number[][][]): string => {
  const pts = getPolygonPoints(coordinates);
  if (pts.length === 0) return '0 0 1 1';
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 0.001, h = maxY - minY || 0.001;
  const pad = Math.max(w, h) * 0.15;
  return `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
};

const getSvgPoints = (coordinates: number[][][]): string =>
    getPolygonPoints(coordinates).map(p => `${p[0]},${p[1]}`).join(' ');

// ─── Labels ────────────────────────────────────────────────────────────────────

const siteTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    global_site: 'Site global', manager_site: 'Site manager',
    public_site: 'Site public', temporary_site: 'Site temporaire',
  };
  return map[type] || type || '—';
};

// ─── Navigation wizard ─────────────────────────────────────────────────────────

const nextStep = () => {
  if (isBusy.value) return;
  goToStep(Math.min(currentStep.value + 1, 3));
};

const prevStep = () => {
  if (isBusy.value) return;
  goToStep(Math.max(currentStep.value - 1, 1));
};

const validateStep1 = (): boolean => {
  if (!String(formData.value.name || '').trim()) {
    showToast('error', 'Le nom du site est obligatoire');
    return false;
  }
  if (!String(formData.value.site_type || '').trim()) {
    showToast('error', 'Le type de site est obligatoire');
    return false;
  }
  // L'adresse peut désormais être renseignée automatiquement à l'étape 2
  // via la recherche Yandex ou « Utiliser ma position ».
  return true;
};

const validateStep2 = (): boolean => {
  const radius = Number(formData.value.geofence_radius);
  if (!Number.isInteger(radius) || radius < 1 || radius > 10000) {
    showToast('error', 'Le rayon doit être un nombre entier compris entre 1 et 10 000 mètres');
    return false;
  }

  if (!isPolygonValid.value) {
    showToast(
      'error',
      geofenceMode.value === 'circle'
        ? 'Sélectionnez l’emplacement du site sur la carte pour générer la zone de pointage'
        : `Définissez au moins ${MIN_POLYGON_POINTS} sommets pour la zone personnalisée`,
    );
    return false;
  }

  if (!addressIsComplete.value) {
    showToast('error', 'L’adresse n’a pas pu être complétée. Corrigez-la manuellement avant de continuer');
    return false;
  }

  return true;
};

// ─── Yandex Maps ──────────────────────────────────────────────────────────────
// Tracé manuel via map.events 'click' : évite le zoom sur double-clic de
// polygon.editor.startDrawing(). Chaque clic simple ajoute un point.
// Le tracé est validé explicitement à partir de 3 points ; jusqu’à 20 sommets sont autorisés.

const polygonStyle = () => ({
  fillColor: '#6366f133',
  strokeColor: '#6366f1',
  strokeWidth: 2,
  strokeOpacity: 0.9,
});

const automaticCircleStyle = () => ({
  fillColor: '#8b5cf622',
  strokeColor: '#7c3aed',
  strokeWidth: 2,
  strokeOpacity: 0.9,
});

const removeAutomaticGeofenceCircle = () => {
  if (!ymap || !automaticGeofenceCircle) return;
  ymap.geoObjects.remove(automaticGeofenceCircle);
  automaticGeofenceCircle = null;
};

const drawAutomaticGeofenceCircle = (coordinates: { lat: number; lng: number }) => {
  if (!ymap) return;

  removeAutomaticGeofenceCircle();
  removePolygonFromMap();

  automaticGeofenceCircle = new ymaps.Circle(
    [[coordinates.lat, coordinates.lng], Number(formData.value.geofence_radius)],
    {
      hintContent: `Zone de pointage : ${formData.value.geofence_radius} m`,
    },
    automaticCircleStyle(),
  );

  ymap.geoObjects.add(automaticGeofenceCircle);
};

const generateAutomaticGeofence = () => {
  if (geofenceMode.value !== 'circle' || !siteLocation.value.coordinates) return false;

  const radius = Number(formData.value.geofence_radius);
  if (!Number.isInteger(radius) || radius < 1 || radius > 10000) return false;

  try {
    formData.value.geofence_polygon = circleToPolygon(
      siteLocation.value.coordinates,
      radius,
      32,
    ) as CreateSite['geofence_polygon'];

    drawAutomaticGeofenceCircle(siteLocation.value.coordinates);
    return true;
  } catch (error) {
    console.warn('Impossible de générer automatiquement la zone géographique', error);
    return false;
  }
};

const cloneGeofencePolygon = (polygon: CreateSite['geofence_polygon']) =>
  JSON.parse(JSON.stringify(polygon)) as CreateSite['geofence_polygon'];

const setGeofenceMode = (mode: GeofenceMode) => {
  if (isBusy.value || geofenceMode.value === mode) return;

  if (mapDrawing.value) {
    if (mapClickHandler) { ymap?.events.remove('click', mapClickHandler); mapClickHandler = null; }
    if (mapDblClickHandler) { ymap?.events.remove('dblclick', mapDblClickHandler); mapDblClickHandler = null; }
    clearPointMarkers();
    mapDrawing.value = false;
  }

  if (geofenceMode.value === 'polygon' && isPolygonValid.value) {
    const normalized = normalizePolygonForApi(formData.value.geofence_polygon as any);
    if (normalized) lastCustomPolygon = cloneGeofencePolygon(normalized as CreateSite['geofence_polygon']);
  }

  geofenceMode.value = mode;

  if (mode === 'circle') {
    let center = siteLocation.value.coordinates;

    if (!center && isPolygonValid.value) {
      center = getPolygonApproximateCenter(formData.value.geofence_polygon as any);
      if (center) {
        setCoordinates(center, 'manual', null);
        selectedLocationLabel.value ||= 'Centre de la zone existante';
        showSelectedSiteOnMap(center, selectedLocationLabel.value);
      }
    }

    if (center) {
      generateAutomaticGeofence();
      showToast('success', `Zone circulaire activée — rayon ${formData.value.geofence_radius} m`);
    } else {
      removePolygonFromMap();
      formData.value.geofence_polygon.coordinates = [[]];
      showToast('success', 'Zone circulaire activée. Choisissez maintenant l’emplacement du site.');
    }
    return;
  }

  removeAutomaticGeofenceCircle();

  if (lastCustomPolygon) {
    formData.value.geofence_polygon = cloneGeofencePolygon(lastCustomPolygon);
    drawExistingPolygon(formData.value.geofence_polygon.coordinates[0]);
    showToast('success', 'Zone personnalisée restaurée');
    return;
  }

  removePolygonFromMap();
  formData.value.geofence_polygon.coordinates = [[]];
  showToast('success', 'Zone personnalisée activée. Dessinez au moins 3 sommets.');
};

const clearCurrentLocationFromMap = () => {
  if (!ymap) return;
  if (currentLocationMarker) {
    ymap.geoObjects.remove(currentLocationMarker);
    currentLocationMarker = null;
  }
  if (currentLocationAccuracyCircle) {
    ymap.geoObjects.remove(currentLocationAccuracyCircle);
    currentLocationAccuracyCircle = null;
  }
};

const clearSelectedSiteFromMap = () => {
  if (!ymap || !selectedSiteMarker) return;
  ymap.geoObjects.remove(selectedSiteMarker);
  selectedSiteMarker = null;
};

const showCurrentLocationOnMap = () => {
  if (!ymap || !currentPosition.value.coordinates) return;

  clearCurrentLocationFromMap();

  const { lat, lng } = currentPosition.value.coordinates;
  const accuracy = currentPosition.value.accuracy;
  const yandexCoords = [lat, lng];

  if (accuracy !== null && Number.isFinite(accuracy) && accuracy > 0) {
    currentLocationAccuracyCircle = new ymaps.Circle(
      [yandexCoords, accuracy],
      {
        hintContent: `Précision estimée : ± ${Math.round(accuracy)} m`,
      },
      {
        fillColor: '#0ea5e922',
        strokeColor: '#0284c7',
        strokeOpacity: 0.65,
        strokeWidth: 1.5,
      },
    );
    ymap.geoObjects.add(currentLocationAccuracyCircle);
  }

  currentLocationMarker = new ymaps.Placemark(
    yandexCoords,
    {
      hintContent: 'Votre position actuelle',
      balloonContent: accuracy !== null
        ? `Votre position actuelle — précision ± ${Math.round(accuracy)} m`
        : 'Votre position actuelle',
    },
    {
      preset: 'islands#blueIcon',
    },
  );
  ymap.geoObjects.add(currentLocationMarker);

  const zoom = accuracy !== null && accuracy <= 30 ? 18 : accuracy !== null && accuracy <= 100 ? 17 : 16;
  ymap.setCenter(yandexCoords, zoom, { duration: 300 });
};

const showSelectedSiteOnMap = (
  coordinates: { lat: number; lng: number },
  label: string,
) => {
  if (!ymap) return;

  clearSelectedSiteFromMap();

  const yandexCoords = [coordinates.lat, coordinates.lng];
  selectedSiteMarker = new ymaps.Placemark(
    yandexCoords,
    {
      hintContent: `${label || 'Emplacement du site'} — déplacez pour ajuster`,
      balloonContent: label || 'Emplacement du site',
    },
    {
      preset: 'islands#violetIcon',
      draggable: true,
    },
  );

  selectedSiteMarker.events.add('dragend', handleSelectedSiteMarkerDragEnd);
  ymap.geoObjects.add(selectedSiteMarker);
};

const clearAddressForNewSelection = () => {
  const emptyAddress = { city: '', location: '', place_name: '' };
  Object.assign(formData.value.address, emptyAddress);
  replaceAddress(emptyAddress, false);
};

const updateSelectedSiteFromCoordinates = async (
  coordinates: { lat: number; lng: number },
  source: 'gps' | 'search' | 'map' | 'manual',
  label: string,
  options: {
    fallbackGeoObject?: any;
    clearAddress?: boolean;
    centerMap?: boolean;
    redrawMarker?: boolean;
  } = {},
) => {
  const {
    fallbackGeoObject,
    clearAddress = true,
    centerMap = true,
    redrawMarker = true,
  } = options;

  if (clearAddress) clearAddressForNewSelection();

  setCoordinates(coordinates, source, source === 'gps' ? currentPosition.value.accuracy : null);
  selectedLocationLabel.value = label;
  selectedLocationDetails.value = '';

  if (redrawMarker) showSelectedSiteOnMap(coordinates, label);
  if (geofenceMode.value === 'circle') generateAutomaticGeofence();
  if (centerMap) ymap?.setCenter([coordinates.lat, coordinates.lng], 17, { duration: 300 });

  return await resolveAddressForCoordinates(coordinates, fallbackGeoObject, label);
};

async function handleSelectedSiteMarkerDragEnd() {
  if (!selectedSiteMarker) return;

  const rawCoordinates = selectedSiteMarker.geometry?.getCoordinates?.();
  if (!Array.isArray(rawCoordinates) || rawCoordinates.length < 2) return;

  const coordinates = {
    lat: Number(rawCoordinates[0]),
    lng: Number(rawCoordinates[1]),
  };

  const address = await updateSelectedSiteFromCoordinates(
    coordinates,
    'map',
    'Emplacement ajusté sur la carte',
    { centerMap: false, redrawMarker: false },
  );

  if (address && isUsableSiteAddress(address)) {
    showToast('success', 'Emplacement ajusté et adresse actualisée');
  } else {
    showToast('success', 'Emplacement ajusté. Vérifiez ou complétez l’adresse.');
  }
}

const applyResolvedAddress = (address: {
  city: string;
  location: string;
  place_name: string;
}) => {
  const merged = {
    city: address.city || formData.value.address.city || '',
    location: address.location || formData.value.address.location || address.city || '',
    place_name:
      address.place_name ||
      formData.value.address.place_name ||
      selectedLocationLabel.value ||
      address.location ||
      address.city ||
      '',
  };

  Object.assign(formData.value.address, merged);
  replaceAddress(merged, isUsableSiteAddress(merged));

  if (!selectedLocationDetails.value) {
    selectedLocationDetails.value = merged.place_name;
  }

  return merged;
};

const resolveAddressForCoordinates = async (
  coordinates: { lat: number; lng: number },
  fallbackGeoObject?: any,
  fallbackName = '',
) => {
  if (typeof ymaps === 'undefined') return null;

  const requestSequence = ++addressResolutionSequence;
  isResolvingAddress.value = true;
  try {
    const response = await ymaps.geocode([coordinates.lat, coordinates.lng], {
      results: 1,
    });

    const reverseGeoObject = response?.geoObjects?.get?.(0);
    const reverseAddress = reverseGeoObject
      ? mapYandexGeoObjectToSiteAddress(reverseGeoObject, fallbackName)
      : { city: '', location: '', place_name: '' };

    const fallbackAddress = fallbackGeoObject
      ? mapYandexGeoObjectToSiteAddress(fallbackGeoObject, fallbackName)
      : { city: '', location: '', place_name: '' };

    if (requestSequence !== addressResolutionSequence) return null;

    return applyResolvedAddress({
      city: reverseAddress.city || fallbackAddress.city,
      location: reverseAddress.location || fallbackAddress.location,
      place_name: reverseAddress.place_name || fallbackAddress.place_name || fallbackName,
    });
  } catch (error) {
    console.warn('Reverse geocoding Yandex impossible', error);

    if (requestSequence !== addressResolutionSequence) return null;

    if (fallbackGeoObject) {
      const fallbackAddress = mapYandexGeoObjectToSiteAddress(fallbackGeoObject, fallbackName);
      return applyResolvedAddress(fallbackAddress);
    }

    return null;
  } finally {
    if (requestSequence === addressResolutionSequence) isResolvingAddress.value = false;
  }
};

const handleSearchResultSelect = (event: any) => {
  if (!searchControl) return;

  const index = event.get('index');
  searchControl.getResult(index).then(async (geoObject: any) => {
    const rawCoordinates = geoObject?.geometry?.getCoordinates?.();
    if (!Array.isArray(rawCoordinates) || rawCoordinates.length < 2) {
      showToast('error', 'Impossible de récupérer les coordonnées de ce résultat');
      return;
    }

    const coordinates = {
      lat: Number(rawCoordinates[0]),
      lng: Number(rawCoordinates[1]),
    };

    const name = String(
      geoObject?.properties?.get?.('name') ||
      geoObject?.properties?.get?.('text') ||
      'Emplacement sélectionné',
    );
    const description = String(geoObject?.properties?.get?.('description') || '');

    const address = await updateSelectedSiteFromCoordinates(
      coordinates,
      'search',
      name,
      { fallbackGeoObject: geoObject },
    );
    selectedLocationDetails.value = description || selectedLocationDetails.value;

    try {
      searchControl.hideResult?.();
    } catch {
      // Aucun impact métier si le contrôle ne permet pas de masquer le résultat.
    }

    if (address && isUsableSiteAddress(address)) {
      showToast('success', 'Lieu trouvé et adresse récupérée');
    } else {
      showToast('success', 'Lieu trouvé. Vérifiez ou complétez l’adresse si nécessaire.');
    }
  }, () => {
    showToast('error', 'Impossible de lire le résultat de recherche');
  });
};

const configureSearchControl = () => {
  if (!ymap || searchControl || typeof ymaps === 'undefined') return;

  searchControl = new ymaps.control.SearchControl({
    options: {
      provider: 'yandex#search',
      resultsPerPage: 5,
      placeholderContent: 'Rechercher un établissement ou une adresse',
    },
  });

  ymap.controls.add(searchControl, { float: 'left' });
  searchControl.events.add('resultselect', handleSearchResultSelect);
};

const locateCurrentPosition = async () => {
  if (!ymap) {
    initMap();
    await nextTick();
  }

  const coordinates = await requestCurrentPosition();

  if (!coordinates) {
    showToast('error', geolocationError.value?.message || 'Impossible de récupérer votre position actuelle');
    return;
  }

  // Le repère bleu conserve la position physique de l'appareil.
  // Le marqueur violet représente l'emplacement retenu pour le site et reste déplaçable.
  showCurrentLocationOnMap();
  const address = await updateSelectedSiteFromCoordinates(
    coordinates,
    'gps',
    'Position actuelle',
    { centerMap: false },
  );

  if (currentAccuracyLevel.value === 'low') {
    showToast('error', `${currentAccuracyLabel.value} — précision faible, vérifiez votre position sur la carte`);
  } else if (address && isUsableSiteAddress(address)) {
    showToast('success', `Position et adresse détectées (${currentAccuracyLabel.value})`);
  } else {
    showToast('success', `Position détectée (${currentAccuracyLabel.value})`);
  }
};

let siteSelectionClickConfigured = false;

const handleMapSiteSelectionClick = async (event: any) => {
  // Pendant le mode dessin, ce clic appartient exclusivement au polygone.
  if (mapDrawing.value) return;

  const rawCoordinates = event?.get?.('coords');
  if (!Array.isArray(rawCoordinates) || rawCoordinates.length < 2) return;

  const coordinates = {
    lat: Number(rawCoordinates[0]),
    lng: Number(rawCoordinates[1]),
  };

  const address = await updateSelectedSiteFromCoordinates(
    coordinates,
    'map',
    'Emplacement choisi sur la carte',
  );

  if (address && isUsableSiteAddress(address)) {
    showToast('success', 'Emplacement du site sélectionné');
  } else {
    showToast('success', 'Emplacement sélectionné. Vérifiez ou complétez l’adresse.');
  }
};

const configureMapSiteSelection = () => {
  if (!ymap || siteSelectionClickConfigured) return;
  ymap.events.add('click', handleMapSiteSelectionClick);
  siteSelectionClickConfigured = true;
};

// Points accumulés pendant le tracé [lat, lng] (format Yandex)
let drawPoints: number[][] = [];
// Placemarks visuels pour chaque point posé
let pointMarkers: any[] = [];
// Handler click carte (pour pouvoir le retirer)
let mapClickHandler: any = null;
// Handler dblclick carte (pour bloquer le zoom natif)
let mapDblClickHandler: any = null;

const initMap = () => {
  if (typeof ymaps === 'undefined') {
    console.warn('Yandex Maps API non chargée');
    return;
  }
  if (ymap) {
    configureSearchControl();
    configureMapSiteSelection();
    if (geofenceMode.value === 'circle' && siteLocation.value.coordinates) {
      drawAutomaticGeofenceCircle(siteLocation.value.coordinates);
    } else if (displayCoordinates.value.length >= 3) {
      drawExistingPolygon(formData.value.geofence_polygon.coordinates[0]);
    }
    if (currentPosition.value.coordinates) showCurrentLocationOnMap();
    if (siteLocation.value.coordinates) {
      showSelectedSiteOnMap(siteLocation.value.coordinates, selectedLocationLabel.value || 'Emplacement du site');
    }
    return;
  }

  ymaps.ready(() => {
    ymap = new ymaps.Map(mapContainer.value, {
      center: [4.0511, 9.7679], // Douala, Cameroun
      zoom: 13,
      controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
    });

    configureSearchControl();
    configureMapSiteSelection();

    if (geofenceMode.value === 'circle' && siteLocation.value.coordinates) {
      drawAutomaticGeofenceCircle(siteLocation.value.coordinates);
    } else if (displayCoordinates.value.length >= 3) {
      drawExistingPolygon(formData.value.geofence_polygon.coordinates[0]);
    }
    if (currentPosition.value.coordinates) showCurrentLocationOnMap();
    if (siteLocation.value.coordinates) {
      showSelectedSiteOnMap(siteLocation.value.coordinates, selectedLocationLabel.value || 'Emplacement du site');
    }
  });
};

/**
 * Affiche un polygone existant (mode édition).
 * coords = GeoJSON [[lng, lat], ...] avec point de fermeture.
 */
const drawExistingPolygon = (coords: number[][]) => {
  if (!ymap) return;

  // Toujours retirer l'ancienne géométrie avant de redessiner : cela évite
  // qu'un ancien polygone reste visible lorsqu'on descend sous 3 sommets.
  removePolygonFromMap();

  if (!coords || coords.length < MIN_POLYGON_POINTS) return;

  // GeoJSON [lng, lat] → Yandex [lat, lng]
  const ymapCoords = coords.map((c: number[]) => [c[1], c[0]]);
  ymapPolygon = new ymaps.Polygon([ymapCoords], {}, polygonStyle());
  ymap.geoObjects.add(ymapPolygon);

  // Activer les poignées pour pouvoir déplacer les points
  ymapPolygon.editor.startEditing();

  // Sync quand l'utilisateur déplace une poignée
  ymapPolygon.editor.events.add('geometrychange', syncCoordsFromMap);

  ymap.setBounds(ymapPolygon.geometry.getBounds(), { zoomMargin: 50 });
};

/**
 * Lance le tracé manuel : chaque clic simple pose un point.
 * L'utilisateur peut poser librement de 3 à 20 sommets puis valider.
 * Le double-clic est intercepté pour éviter le zoom natif.
 */
const startDrawing = () => {
  if (!ymap) return;

  geofenceMode.value = 'polygon';
  removeAutomaticGeofenceCircle();
  lastCustomPolygon = null;

  // Reset
  removePolygonFromMap();
  clearPointMarkers();
  drawPoints = [];
  drawPointsCount.value = 0;
  mapDrawing.value = true;

  // Bloquer le zoom sur double-clic pendant le tracé
  mapDblClickHandler = (e: any) => {
    e.preventDefault();
  };
  ymap.events.add('dblclick', mapDblClickHandler);

  // Chaque clic simple = un point
  mapClickHandler = (e: any) => {
    const coords: number[] = e.get('coords'); // [lat, lng]
    onMapClick(coords);
  };
  ymap.events.add('click', mapClickHandler);

  showToast('success', `Posez au moins ${MIN_POLYGON_POINTS} points, puis cliquez sur « Valider »`);
};

/**
 * Appelé à chaque clic sur la carte pendant le tracé.
 */
const onMapClick = (coords: number[]) => {
  if (drawPoints.length >= MAX_POLYGON_POINTS) {
    showToast('error', `Maximum ${MAX_POLYGON_POINTS} points autorisés`);
    return;
  }

  drawPoints.push(coords);
  drawPointsCount.value = drawPoints.length;

  // Marqueur visuel du point
  const marker = new ymaps.Placemark(coords, {
    iconContent: `${drawPoints.length}`,
  }, {
    preset: 'islands#blueCircleIcon',
  });
  ymap.geoObjects.add(marker);
  pointMarkers.push(marker);

  // Mettre à jour le polygone en cours de tracé
  updateDrawingPolygon();

  // Sync dans formData en temps réel
  syncDrawPointsToFormData();

  // Sécurité : finaliser automatiquement uniquement à la limite maximale.
  if (drawPoints.length === MAX_POLYGON_POINTS) {
    showToast('success', `Limite de ${MAX_POLYGON_POINTS} points atteinte — la zone est validée automatiquement`);
    finishDrawing();
  }
};

/**
 * Redessine le polygone de tracé en cours (lignes intermédiaires).
 */
const updateDrawingPolygon = () => {
  removePolygonFromMap();
  if (drawPoints.length < 2) return;

  ymapPolygon = new ymaps.Polygon([drawPoints], {}, polygonStyle());
  ymap.geoObjects.add(ymapPolygon);
};

/**
 * Termine le tracé à partir de MIN_POLYGON_POINTS points :
 * - Retire les markers visuels
 * - Arrête les listeners
 * - Passe en mode édition avec poignées
 */
const finishDrawing = () => {
  if (drawPoints.length < MIN_POLYGON_POINTS) {
    showToast('error', `Posez au moins ${MIN_POLYGON_POINTS} points avant de valider`);
    return;
  }

  // Retirer les listeners
  if (mapClickHandler) { ymap.events.remove('click', mapClickHandler); mapClickHandler = null; }
  if (mapDblClickHandler) { ymap.events.remove('dblclick', mapDblClickHandler); mapDblClickHandler = null; }

  mapDrawing.value = false;
  drawPointsCount.value = drawPoints.length;
  clearPointMarkers();

  // Recréer le polygone final propre
  removePolygonFromMap();
  ymapPolygon = new ymaps.Polygon([drawPoints], {}, polygonStyle());
  ymap.geoObjects.add(ymapPolygon);

  // Activer les poignées déplaçables
  ymapPolygon.editor.startEditing();
  ymapPolygon.editor.events.add('geometrychange', syncCoordsFromMap);

  // Sync final dans formData
  syncDrawPointsToFormData();

  ymap.setBounds(ymapPolygon.geometry.getBounds(), { zoomMargin: 50 });
  showToast('success', `Zone tracée — ${drawPoints.length} points. Ajustez les poignées si besoin.`);
};

/**
 * Bouton "Valider" visible pendant le tracé.
 * Il devient fonctionnel dès que MIN_POLYGON_POINTS sommets sont posés.
 */
const undoLastDrawingPoint = () => {
  if (!mapDrawing.value || drawPoints.length === 0) return;

  drawPoints.pop();
  drawPointsCount.value = drawPoints.length;

  const lastMarker = pointMarkers.pop();
  if (lastMarker && ymap) ymap.geoObjects.remove(lastMarker);

  updateDrawingPolygon();

  if (drawPoints.length === 0) {
    formData.value.geofence_polygon.coordinates = [[]];
  } else {
    syncDrawPointsToFormData();
  }

  showToast('success', drawPoints.length > 0
      ? `Dernier point annulé — ${drawPoints.length} point${drawPoints.length > 1 ? 's' : ''} restant${drawPoints.length > 1 ? 's' : ''}`
      : 'Dernier point annulé — aucun point restant');
};

const stopDrawing = () => {
  if (drawPoints.length < MIN_POLYGON_POINTS) {
    showToast('error', `Posez au moins ${MIN_POLYGON_POINTS} points (${drawPoints.length} actuellement)`);
    return;
  }
  finishDrawing();
};

/**
 * Sync les drawPoints (Yandex [lat,lng]) → formData (GeoJSON [lng,lat] + fermeture).
 */
const syncDrawPointsToFormData = () => {
  if (drawPoints.length < 1) return;
  const geoCoords = drawPoints.map((c: number[]) => [c[1], c[0]]);
  if (geoCoords.length >= 3) geoCoords.push([...geoCoords[0]]);
  formData.value.geofence_polygon.coordinates = [geoCoords];
  if (geoCoords.length >= MIN_POLYGON_POINTS + 1) {
    lastCustomPolygon = cloneGeofencePolygon(formData.value.geofence_polygon);
  }
};

/**
 * Sync depuis le polygone Yandex (après déplacement poignée) → formData.
 */
const syncCoordsFromMap = () => {
  if (!ymapPolygon) return;
  const raw = ymapPolygon.geometry.getCoordinates()[0];
  if (!raw || raw.length < 1) return;

  const geoCoords = raw.map((c: number[]) => [c[1], c[0]]);

  // Certains états de l'éditeur Yandex peuvent déjà retourner un ring fermé.
  // On normalise avant d'ajouter une seule fermeture GeoJSON.
  if (geoCoords.length > 1) {
    const first = geoCoords[0];
    const last = geoCoords[geoCoords.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) geoCoords.pop();
  }

  if (geoCoords.length >= MIN_POLYGON_POINTS) geoCoords.push([...geoCoords[0]]);
  formData.value.geofence_polygon.coordinates = [geoCoords];
  if (geoCoords.length >= MIN_POLYGON_POINTS + 1) {
    lastCustomPolygon = cloneGeofencePolygon(formData.value.geofence_polygon);
  }
};

const centerMapOnPolygon = () => {
  if (!ymap) return;

  if (geofenceMode.value === 'circle' && automaticGeofenceCircle) {
    const bounds = automaticGeofenceCircle.geometry?.getBounds?.();
    if (bounds) ymap.setBounds(bounds, { checkZoomRange: true, zoomMargin: 60 });
    return;
  }

  if (!ymapPolygon) return;
  const bounds = ymapPolygon.geometry.getBounds();
  if (bounds) ymap.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50 });
};

const removePolygonFromMap = () => {
  if (ymapPolygon && ymap) {
    ymap.geoObjects.remove(ymapPolygon);
    ymapPolygon = null;
  }
};

const clearPointMarkers = () => {
  pointMarkers.forEach(m => ymap?.geoObjects.remove(m));
  pointMarkers = [];
};

const clearMapPolygon = () => {
  // Arrêter les listeners de tracé si actifs
  if (mapClickHandler) { ymap?.events.remove('click', mapClickHandler); mapClickHandler = null; }
  if (mapDblClickHandler) { ymap?.events.remove('dblclick', mapDblClickHandler); mapDblClickHandler = null; }
  clearPointMarkers();
  removePolygonFromMap();
  drawPoints = [];
  drawPointsCount.value = 0;
  mapDrawing.value = false;
  formData.value.geofence_polygon.coordinates = [[]];
  lastCustomPolygon = null;
  showToast('success', 'Zone effacée');
};

// ─── Gestion des points (saisie manuelle) ──────────────────────────────────────

const addManualPoint = () => {
  if (manualPoint.value.lng === null || manualPoint.value.lat === null) {
    showToast('error', 'Longitude et latitude obligatoires');
    return;
  }
  if (Math.abs(manualPoint.value.lat) > 90 || Math.abs(manualPoint.value.lng) > 180) {
    showToast('error', 'Coordonnées invalides (Lat: -90→90, Lng: -180→180)');
    return;
  }
  if (displayCoordinates.value.length >= MAX_POLYGON_POINTS) {
    showToast('error', `Maximum ${MAX_POLYGON_POINTS} points autorisés`);
    return;
  }

  const coords = formData.value.geofence_polygon.coordinates[0];
  const isClosed = coords.length > 0 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1];
  if (isClosed) coords.pop();
  coords.push([manualPoint.value.lng, manualPoint.value.lat]);
  if (coords.length >= 3) coords.push([...coords[0]]);

  manualPoint.value = { lng: null, lat: null };

  // Redessiner sur la carte
  drawExistingPolygon(formData.value.geofence_polygon.coordinates[0]);
  const normalized = normalizePolygonForApi(formData.value.geofence_polygon as any);
  lastCustomPolygon = normalized ? cloneGeofencePolygon(normalized as CreateSite['geofence_polygon']) : null;

  showToast('success', `Point ${displayCoordinates.value.length} ajouté`);
};

const removePoint = (index: number) => {
  const coords = formData.value.geofence_polygon.coordinates[0];
  const isClosed = coords.length > 0 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1];
  if (isClosed) coords.pop();
  coords.splice(index, 1);
  if (coords.length >= 3) coords.push([...coords[0]]);
  drawExistingPolygon(formData.value.geofence_polygon.coordinates[0]);
  const normalized = normalizePolygonForApi(formData.value.geofence_polygon as any);
  lastCustomPolygon = normalized ? cloneGeofencePolygon(normalized as CreateSite['geofence_polygon']) : null;
};

const clearCoordinates = () => {
  formData.value.geofence_polygon.coordinates = [[]];
  if (ymapPolygon && ymap) {
    ymap.geoObjects.remove(ymapPolygon);
    ymapPolygon = null;
  }
  mapDrawing.value = false;
  drawPoints = [];
  drawPointsCount.value = 0;
  lastCustomPolygon = null;
  showToast('success', 'Points effacés');
};

// ─── Toast ─────────────────────────────────────────────────────────────────────

const showToast = (type: 'success' | 'error' = 'success', text: string = '') => {
  messageType.value = type;
  messageText.value = text;
  gsap.to(toastRef.value, {
    opacity: 1, y: 0, duration: 0.3, ease: 'power3.out',
    onComplete: () => setTimeout(() => gsap.to(toastRef.value, { opacity: 0, y: -8, duration: 0.3 }), 3000),
  });
};

// ─── Navigation ────────────────────────────────────────────────────────────────

const goBack = () => {
  if (isBusy.value) return;
  router.push('/sites');
};

const getApiErrorMessage = (error: any, fallback: string) => {
  return error?.data?.error?.message
    || error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || fallback;
};

const preparePersistedData = () => {
  const normalizedPolygon = normalizePolygonForApi(formData.value.geofence_polygon as any);
  if (!normalizedPolygon) return null;

  const radius = Number(formData.value.geofence_radius);
  if (!Number.isInteger(radius) || radius < 1 || radius > 10000) return null;

  return {
    name: String(formData.value.name || '').trim(),
    site_type: String(formData.value.site_type || '').trim(),
    address: {
      city: String(formData.value.address?.city || '').trim(),
      location: String(formData.value.address?.location || '').trim(),
      place_name: String(formData.value.address?.place_name || '').trim(),
    },
    geofence_radius: radius,
    geofence_polygon: normalizedPolygon as CreateSite['geofence_polygon'],
    active: Boolean(formData.value.active),
    public: Boolean(formData.value.public),
  };
};

const buildCreatePayload = (): CreateSite | null => {
  const persisted = preparePersistedData();
  if (!persisted) return null;

  return {
    ...persisted,
    created_by: userStore.user?.guid || formData.value.created_by || '',
  } as CreateSite;
};

const buildUpdatePayload = (): UpdateSite | null => {
  const persisted = preparePersistedData();
  if (!persisted) return null;

  // Le PUT actuel ne modifie pas site_type ni created_by. Ne pas envoyer des champs
  // que l'API ne persiste pas évite une fausse impression de mise à jour.
  return {
    name: persisted.name,
    address: persisted.address,
    geofence_radius: persisted.geofence_radius,
    geofence_polygon: persisted.geofence_polygon,
    active: persisted.active,
    public: persisted.public,
  } as UpdateSite;
};

// ─── Submit ────────────────────────────────────────────────────────────────────

const submitSite = async () => {
  if (isSubmitting.value || submitSucceeded.value) return;

  if (!validateStep1()) {
    currentStep.value = 1;
    return;
  }
  if (!validateStep2()) {
    currentStep.value = 2;
    nextTick(() => initMap());
    return;
  }

  const payload = isEditMode.value ? buildUpdatePayload() : buildCreatePayload();
  if (!payload) {
    showToast('error', 'Les données du site sont incohérentes. Vérifiez la zone et le rayon avant d’enregistrer.');
    return;
  }

  isSubmitting.value = true;
  try {
    const response = isEditMode.value
      ? await SiteService.updateSite(siteGuid.value!, payload as UpdateSite)
      : await SiteService.createSite(payload as CreateSite);

    if (!response?.success) {
      showToast('error', getApiErrorMessage(response, 'Échec de l’enregistrement'));
      return;
    }

    submitSucceeded.value = true;
    capturePersistedSnapshot();
    showToast('success', isEditMode.value ? 'Site mis à jour avec succès' : 'Site créé avec succès');

    window.setTimeout(() => {
      router.push('/sites');
    }, 700);
  } catch (error: any) {
    showToast('error', getApiErrorMessage(error, 'Une erreur est survenue pendant l’enregistrement'));
  } finally {
    if (!submitSucceeded.value) isSubmitting.value = false;
  }
};

// ─── Chargement données (mode édition) ────────────────────────────────────────

const loadSiteData = async () => {
  if (!siteGuid.value || siteGuid.value === 'new') return;
  isLoadingSite.value = true;
  try {
    const response = await SiteService.getSite(siteGuid.value);
    const site = response?.data?.site;
    if (!response?.success || !site) {
      throw new Error(getApiErrorMessage(response, 'Impossible de charger ce site'));
    }

    Object.assign(formData.value, site);
    formData.value.address = {
      city: String(site.address?.city || ''),
      location: String(site.address?.location || ''),
      place_name: String(site.address?.place_name || ''),
    };
    formData.value.geofence_radius = Number(site.geofence_radius || 100);
    formData.value.created_by = site.created_by?.guid ?? site.created_by ?? formData.value.created_by;

    // Compatibilité : un ancien site reste en mode polygonal tant que l'utilisateur
    // ne choisit pas explicitement la zone circulaire automatique.
    geofenceMode.value = 'polygon';
    const normalizedExistingPolygon = normalizePolygonForApi(formData.value.geofence_polygon as any);
    if (normalizedExistingPolygon) {
      formData.value.geofence_polygon = normalizedExistingPolygon as CreateSite['geofence_polygon'];
      lastCustomPolygon = cloneGeofencePolygon(formData.value.geofence_polygon);
    }

    replaceAddress(formData.value.address, isUsableSiteAddress(formData.value.address));

    const existingCenter = getPolygonApproximateCenter(formData.value.geofence_polygon as any);
    if (existingCenter) {
      setCoordinates(existingCenter, 'manual', null);
      selectedLocationLabel.value = formData.value.name || 'Site existant';
      selectedLocationDetails.value = 'Centre approximatif de la zone enregistrée';
    }

    capturePersistedSnapshot();
  } catch (error: any) {
    showToast('error', getApiErrorMessage(error, 'Erreur lors du chargement'));
  } finally {
    isLoadingSite.value = false;
  }
};

// En mode standard, toute modification du rayon régénère immédiatement le
// GeoJSON attendu par l'API et met à jour le cercle affiché sur la carte.
watch(
  () => formData.value.geofence_radius,
  (radius) => {
    if (geofenceMode.value !== 'circle') return;
    if (!siteLocation.value.coordinates) return;
    if (!Number.isFinite(Number(radius)) || Number(radius) <= 0) return;
    generateAutomaticGeofence();
  },
);

// ─── Lifecycle ────────────────────────────────────────────────────────────────

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = '';
};

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value) return true;
  return window.confirm('Des modifications ne sont pas encore enregistrées. Voulez-vous vraiment quitter cette page ?');
});

onMounted(async () => {
  HeadBuilder.apply({ title: 'Sites - Toké', css: [], meta: { viewport: 'width=device-width, initial-scale=1.0' } });
  window.addEventListener('beforeunload', handleBeforeUnload);

  const savedData = sessionStorage.getItem('siteFormData');
  if (savedData) {
    try {
      Object.assign(formData.value, JSON.parse(savedData));
    } catch (error) {
      console.warn('Données temporaires de site illisibles', error);
    } finally {
      sessionStorage.removeItem('siteFormData');
    }
    capturePersistedSnapshot();
  } else if (isEditMode.value) {
    await loadSiteData();
  } else {
    capturePersistedSnapshot();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  addressResolutionSequence += 1;

  if (ymap) {
    if (mapClickHandler) ymap.events.remove('click', mapClickHandler);
    if (mapDblClickHandler) ymap.events.remove('dblclick', mapDblClickHandler);
    if (siteSelectionClickConfigured) ymap.events.remove('click', handleMapSiteSelectionClick);
    try { searchControl?.events?.remove?.('resultselect', handleSearchResultSelect); } catch {}
    try { ymap.destroy?.(); } catch {}
    ymap = null;
  }
});
</script>