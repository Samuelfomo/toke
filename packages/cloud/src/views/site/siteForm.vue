<template>
  <div class="flex min-h-screen bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
    <div class="flex flex-col w-full">
      <Header />

      <!-- Loader overlay -->
      <div v-if="isLoading" class="fixed inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm z-50">
        <div class="w-14 h-14 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="mt-4 font-medium text-gray-500 text-sm">{{ isEditMode ? 'Chargement du site...' : 'Enregistrement...' }}</p>
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
                    class="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium
                         hover:border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all">
                  Annuler
                </button>
                <button
                    v-if="currentStep > 1"
                    @click="prevStep"
                    class="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium
                         hover:border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                  Retour
                </button>
                <button
                    v-if="currentStep < 3"
                    @click="nextStep"
                    class="h-9 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold
                         hover:bg-indigo-700 active:scale-95 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-200">
                  Suivant
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <button
                    v-if="currentStep === 3"
                    @click="submitSite"
                    ref="submitButton"
                    class="h-9 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold
                         hover:bg-indigo-700 active:scale-95 flex items-center gap-1.5 transition-all shadow-md shadow-indigo-200">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ isEditMode ? 'Mettre à jour' : 'Créer le site' }}
                </button>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════
               ÉTAPE 1 — Informations générales
          ══════════════════════════════════════════════════════ -->
          <div v-show="currentStep === 1">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <!-- Colonne gauche : infos + adresse -->
              <div class="lg:col-span-2 flex flex-col gap-6">

                <!-- Informations générales -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <h2 class="text-sm font-semibold text-gray-900">Informations générales</h2>
                  </div>
                  <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <!-- Nom -->
                    <div class="md:col-span-2">
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                        Nom du site <span class="text-red-500">*</span>
                      </label>
                      <input
                          v-model="formData.name"
                          type="text"
                          placeholder="Ex: IMEDIATIS SARL"
                          class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800
                               placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                               transition-all duration-150"/>
                    </div>

                    <!-- Type de site -->
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                        Type de site <span class="text-red-500">*</span>
                      </label>
                      <div class="relative">
                        <select
                            v-model="formData.site_type"
                            class="w-full h-10 pl-3.5 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 appearance-none
                                 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all duration-150">
                          <option value="">Sélectionner un type</option>
                          <option value="global_site">Global Site</option>
                          <option value="manager_site">Manager Site</option>
                          <option value="public_site">Public Site</option>
                          <option value="temporary_site">Temporary Site</option>
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </div>

                    <!-- Rayon géofencing -->
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                        Rayon de la zone (mètres) <span class="text-red-500">*</span>
                      </label>
                      <input
                          v-model.number="formData.geofence_radius"
                          type="number" min="1" placeholder="100"
                          class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800
                               placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                               transition-all duration-150"/>
                    </div>

                    <!-- Statut -->
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
                        <span class="text-sm font-medium text-gray-700">{{ formData.active ? 'Actif' : 'Inactif' }}</span>
                      </div>
                    </div>

                    <!-- Créé par -->
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">Créé par</label>
                      <div class="relative">
                        <input
                            v-model="formData.created_by"
                            type="text"
                            readonly
                            class="w-full h-10 px-3.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500
                                 cursor-default focus:outline-none"/>
                        <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Adresse -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <h2 class="text-sm font-semibold text-gray-900">Adresse</h2>
                  </div>
                  <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">Ville <span class="text-red-500">*</span></label>
                      <input v-model="formData.address.city" type="text" placeholder="Ex: DOUALA"
                             class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800
                                    placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"/>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">Localisation <span class="text-red-500">*</span></label>
                      <input v-model="formData.address.location" type="text" placeholder="Ex: Makepe"
                             class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800
                                    placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"/>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1.5">Lieu-dit / Adresse complète <span class="text-red-500">*</span></label>
                      <input v-model="formData.address.place_name" type="text" placeholder="Ex: ABOU DE BANGUI"
                             class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800
                                    placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"/>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Colonne droite : paramètres d'accès + avancés -->
              <div class="flex flex-col gap-6">

                <!-- Paramètres d'accès -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </div>
                    <h2 class="text-sm font-semibold text-gray-900">Paramètres d'accès</h2>
                  </div>
                  <div class="p-6">
                    <p class="text-xs font-semibold text-gray-600 mb-3">Visibilité <span class="text-red-500">*</span></p>
                    <!-- Radio Privé -->
                    <label class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all mb-3"
                           :class="!formData.public ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'">
                      <input type="radio" :value="false" v-model="formData.public" class="mt-0.5 text-indigo-600"/>
                      <div>
                        <p class="text-sm font-semibold text-gray-800">Privé</p>
                        <p class="text-xs text-gray-500 mt-0.5">Accessible uniquement aux utilisateurs autorisés</p>
                      </div>
                    </label>
                    <!-- Radio Public -->
                    <label class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                           :class="formData.public ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'">
                      <input type="radio" :value="true" v-model="formData.public" class="mt-0.5 text-indigo-600"/>
                      <div>
                        <p class="text-sm font-semibold text-gray-800">Public</p>
                        <p class="text-xs text-gray-500 mt-0.5">Accessible à tous les utilisateurs</p>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Paramètres avancés -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <h2 class="text-sm font-semibold text-gray-900">Paramètres avancés</h2>
                  </div>
                  <div class="p-6">
                    <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                      Rayon de la zone géographique <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model.number="formData.geofence_radius"
                        type="number" min="1"
                        class="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800
                             focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"/>
                    <p class="text-xs text-gray-400 mt-1.5">Rayon de la zone géographique en mètres</p>

                    <!-- CTA zone géographique -->
                    <button
                        type="button"
                        @click="nextStep"
                        class="mt-4 w-full flex items-center gap-3 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors text-left">
                      <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                        </svg>
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-indigo-700">Définir ou modifier la zone géographique</p>
                        <p class="text-xs text-indigo-500 mt-0.5">Cliquez pour dessiner ou ajuster le polygone sur la carte</p>
                      </div>
                    </button>
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
                  <div class="px-6 py-4 border-b border-gray-100">
                    <!-- Instructions contextuelles -->
                    <div v-if="!mapDrawing" class="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                      <div>
                        <p class="text-xs font-semibold text-indigo-700">Cliquez sur « Dessiner » pour tracer votre zone</p>
                        <p class="text-xs text-indigo-500 mt-0.5">Cliquez ensuite sur la carte pour poser exactement <strong>4 points</strong> — le polygone se ferme automatiquement.</p>
                      </div>
                    </div>
                    <div v-else class="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                      <div>
                        <p class="text-xs font-semibold text-emerald-700">Mode dessin actif — cliquez sur la carte pour poser vos 4 points</p>
                        <p class="text-xs text-emerald-600 mt-0.5">Après les 4 points, utilisez les <strong>poignées bleues</strong> pour ajuster. Cliquez « Valider » quand c'est bon.</p>
                      </div>
                    </div>
                  </div>

                  <!-- Carte Yandex Maps -->
                  <div class="relative">
                    <div ref="mapContainer" class="w-full h-[480px] bg-gray-100"></div>

                    <!-- Contrôles carte -->
                    <div class="absolute bottom-4 left-4 flex flex-col gap-2">
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
                          class="h-9 px-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold
                                 flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-all"
                          title="Valider le polygone dessiné">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Valider
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
                        <p class="text-xs text-gray-400">Points</p>
                        <p class="text-xs font-semibold text-gray-700">{{ displayCoordinates.length }}</p>
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
                    <div v-if="isPolygonValid"
                         class="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <p class="text-xs font-semibold">Zone valide — Le polygone contient {{ displayCoordinates.length }} points</p>
                    </div>
                    <div v-else
                         class="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2.5 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001c-.77 1.332.192 2.999 1.732 2.999z"/>
                      </svg>
                      <p class="text-xs font-semibold">Zone invalide — Minimum 3 points requis</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Panneau latéral : coordonnées + saisie manuelle -->
              <div class="flex flex-col gap-4">

                <!-- Saisie manuelle -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div class="px-5 py-4 border-b border-gray-100">
                    <h3 class="text-sm font-semibold text-gray-900">Ajouter un point</h3>
                    <p class="text-xs text-gray-400 mt-0.5">Saisie manuelle des coordonnées</p>
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

                <!-- Liste des coordonnées -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
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
                          class="opacity-0 group-hover:opacity-100 w-5 h-5 text-red-400 hover:text-red-600 transition-all">
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
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <!-- Résumé informations -->
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <h2 class="text-sm font-semibold text-gray-900">Révision</h2>
                  <button type="button" @click="currentStep = 1" class="ml-auto text-xs text-indigo-600 hover:underline">Modifier</button>
                </div>
                <div class="p-6 space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-gray-400">Nom du site</p>
                      <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formData.name || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400">Type de site</p>
                      <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ siteTypeLabel(formData.site_type!) }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400">Statut</p>
                      <span class="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md text-xs font-medium"
                            :class="formData.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'">
                        <span class="w-1.5 h-1.5 rounded-full" :class="formData.active ? 'bg-emerald-500' : 'bg-red-400'"></span>
                        {{ formData.active ? 'Actif' : 'Inactif' }}
                      </span>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400">Visibilité</p>
                      <span class="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md text-xs font-medium"
                            :class="formData.public ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600'">
                        {{ formData.public ? 'Public' : 'Privé' }}
                      </span>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400">Ville</p>
                      <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formData.address.city || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400">Localisation</p>
                      <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formData.address.location || '—' }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="text-xs text-gray-400">Lieu-dit / Adresse</p>
                      <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formData.address.place_name || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400">Rayon géofencing</p>
                      <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formData.geofence_radius }} m</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Résumé zone géographique -->
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                    </svg>
                  </div>
                  <h2 class="text-sm font-semibold text-gray-900">Zone géographique</h2>
                  <button type="button" @click="currentStep = 2" class="ml-auto text-xs text-indigo-600 hover:underline">Modifier</button>
                </div>
                <div class="p-6">
                  <!-- Miniature SVG recap -->
                  <div v-if="displayCoordinates.length >= 3"
                       class="h-40 bg-indigo-50 rounded-xl overflow-hidden mb-4 border border-indigo-100">
                    <svg
                        :viewBox="getSvgViewBox(formData.geofence_polygon.coordinates)"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="xMidYMid meet"
                        class="w-full h-full">
                      <polygon
                          :points="getSvgPoints(formData.geofence_polygon.coordinates)"
                          fill="rgba(99,102,241,0.2)"
                          stroke="rgb(99,102,241)"
                          stroke-width="0.0006"
                          stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="bg-gray-50 rounded-xl p-3">
                      <p class="text-xs text-gray-400">Points</p>
                      <p class="text-lg font-bold text-gray-800">{{ displayCoordinates.length }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                      <p class="text-xs text-gray-400">Rayon</p>
                      <p class="text-lg font-bold text-gray-800">{{ formData.geofence_radius }}m</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                      <p class="text-xs text-gray-400">Surface approx.</p>
                      <p class="text-sm font-bold text-gray-800">{{ polygonStats.area }} m²</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                      <p class="text-xs text-gray-400">Périmètre</p>
                      <p class="text-sm font-bold text-gray-800">{{ polygonStats.perimeter }} m</p>
                    </div>
                  </div>
                  <div v-if="!isPolygonValid" class="mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-xl text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001c-.77 1.332.192 2.999 1.732 2.999z"/>
                    </svg>
                    Zone non définie — retournez à l'étape 2
                  </div>
                </div>
              </div>
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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';

import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import HeadBuilder from '@/utils/HeadBuilder';
import SiteService from '@/service/SiteService';
import { CreateSite } from '@/utils/interfaces/site.interface';
import { useUserStore } from '@/stores/userStore';

// ─── Wizard steps ──────────────────────────────────────────────────────────────

const steps = [
  { id: 1, label: 'Informations' },
  { id: 2, label: 'Zone géographique' },
  { id: 3, label: 'Révision' },
];

const currentStep = ref(1);

const getStepCircleClass = (step: number) => {
  if (currentStep.value > step) return 'bg-indigo-600 text-white';
  if (currentStep.value === step) return 'bg-indigo-600 text-white ring-4 ring-indigo-100';
  return 'bg-gray-100 text-gray-400';
};

const goToStep = (step: number) => {
  // On ne peut avancer que si les étapes précédentes sont valides
  if (step < currentStep.value) currentStep.value = step;
};

// ─── State ─────────────────────────────────────────────────────────────────────

const route = useRoute();
const router = useRouter();
const isLoading = ref(false);

const siteGuid = ref<string | null>(route.query.guid ? String(route.query.guid) : null);
const isEditMode = computed(() => !!siteGuid.value && siteGuid.value !== 'new');

const toastRef = ref<HTMLElement | null>(null);
const submitButton = ref<HTMLElement | null>(null);
const messageType = ref<'success' | 'error'>('success');
const messageText = ref('');

const userStore = useUserStore();

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

// ─── Yandex Maps (polygon.editor natif — identique à map.vue) ─────────────────
const mapContainer = ref<HTMLDivElement | null>(null);
let ymap: any = null;
let ymapPolygon: any = null;
const mapDrawing = ref(false);
const MAX_POINTS = 4; // 4 vrais points dessinés = 5 coords GeoJSON avec fermeture

// ─── Computed ──────────────────────────────────────────────────────────────────

const displayCoordinates = computed(() => {
  const coords = formData.value.geofence_polygon.coordinates[0];
  if (!coords || coords.length === 0) return [];
  const last = coords[coords.length - 1];
  const first = coords[0];
  const isClosed = first[0] === last[0] && first[1] === last[1];
  return isClosed ? coords.slice(0, -1) : coords;
});

const isPolygonValid = computed(() => displayCoordinates.value.length >= 3);

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
    global_site: 'Global Site', manager_site: 'Manager Site',
    public_site: 'Public Site', temporary_site: 'Temporary Site',
  };
  return map[type] || type || '—';
};

// ─── Navigation wizard ─────────────────────────────────────────────────────────

const nextStep = () => {
  if (currentStep.value === 1 && !validateStep1()) return;
  if (currentStep.value < 3) currentStep.value++;
  // Initialiser la carte quand on arrive à l'étape 2
  // nextTick pour s'assurer que le DOM (mapContainer) est monté
  if (currentStep.value === 2) {
    nextTick(() => initMap());
  }
};

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--;
};

const validateStep1 = (): boolean => {
  if (!formData.value.name) {
    showToast('error', 'Le nom du site est obligatoire');
    return false;
  }
  if (!formData.value.site_type) {
    showToast('error', 'Le type de site est obligatoire');
    return false;
  }
  if (!formData.value.address.city || !formData.value.address.location) {
    showToast('error', 'La ville et la localisation sont obligatoires');
    return false;
  }
  return true;
};

// ─── Yandex Maps ──────────────────────────────────────────────────────────────
// Tracé manuel via map.events 'click' : évite le zoom sur double-clic de
// polygon.editor.startDrawing(). Chaque clic simple ajoute un point.
// Après 4 points le tracé se ferme automatiquement → poignées disponibles.

const polygonStyle = () => ({
  fillColor: '#6366f133',
  strokeColor: '#6366f1',
  strokeWidth: 2,
  strokeOpacity: 0.9,
});

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
    if (displayCoordinates.value.length >= 3) {
      drawExistingPolygon(formData.value.geofence_polygon.coordinates[0]);
    }
    return;
  }

  ymaps.ready(() => {
    ymap = new ymaps.Map(mapContainer.value, {
      center: [4.0511, 9.7679], // Douala, Cameroun
      zoom: 13,
      controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
    });

    if (displayCoordinates.value.length >= 3) {
      drawExistingPolygon(formData.value.geofence_polygon.coordinates[0]);
    }
  });
};

/**
 * Affiche un polygone existant (mode édition).
 * coords = GeoJSON [[lng, lat], ...] avec point de fermeture.
 */
const drawExistingPolygon = (coords: number[][]) => {
  if (!ymap || !coords || coords.length < 3) return;

  removePolygonFromMap();

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
 * Après MAX_POINTS clics, le polygone se ferme automatiquement.
 * Le double-clic est intercepté pour éviter le zoom natif.
 */
const startDrawing = () => {
  if (!ymap) return;

  // Reset
  removePolygonFromMap();
  clearPointMarkers();
  drawPoints = [];
  mapDrawing.value = true;

  // Bloquer le zoom sur double-clic pendant le tracé
  mapDblClickHandler = ymap.events.add('dblclick', (e: any) => {
    e.preventDefault();
  });

  // Chaque clic simple = un point
  mapClickHandler = ymap.events.add('click', (e: any) => {
    const coords: number[] = e.get('coords'); // [lat, lng]
    onMapClick(coords);
  });

  showToast('success', `Cliquez sur la carte pour poser vos ${MAX_POINTS} points`);
};

/**
 * Appelé à chaque clic sur la carte pendant le tracé.
 */
const onMapClick = (coords: number[]) => {
  if (drawPoints.length >= MAX_POINTS) return;

  drawPoints.push(coords);

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

  // Fermeture automatique après MAX_POINTS points
  if (drawPoints.length === MAX_POINTS) {
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
 * Termine le tracé après MAX_POINTS points :
 * - Retire les markers visuels
 * - Arrête les listeners
 * - Passe en mode édition avec poignées
 */
const finishDrawing = () => {
  // Retirer les listeners
  if (mapClickHandler) { ymap.events.remove('click', mapClickHandler); mapClickHandler = null; }
  if (mapDblClickHandler) { ymap.events.remove('dblclick', mapDblClickHandler); mapDblClickHandler = null; }

  mapDrawing.value = false;
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
  showToast('success', `Zone tracée — ${MAX_POINTS} points. Ajustez les poignées si besoin.`);
};

/**
 * Bouton "Valider" visible pendant le tracé (si >= 3 points déjà posés).
 * Permet de terminer avant MAX_POINTS.
 */
const stopDrawing = () => {
  if (drawPoints.length < 3) {
    showToast('error', `Posez au moins 3 points (${drawPoints.length}/${MAX_POINTS} actuellement)`);
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
};

/**
 * Sync depuis le polygone Yandex (après déplacement poignée) → formData.
 */
const syncCoordsFromMap = () => {
  if (!ymapPolygon) return;
  const raw = ymapPolygon.geometry.getCoordinates()[0];
  if (!raw || raw.length < 1) return;
  const geoCoords = raw.map((c: number[]) => [c[1], c[0]]);
  if (geoCoords.length >= 3) geoCoords.push([...geoCoords[0]]);
  formData.value.geofence_polygon.coordinates = [geoCoords];
};

const centerMapOnPolygon = () => {
  if (!ymap || !ymapPolygon) return;
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
  mapDrawing.value = false;
  formData.value.geofence_polygon.coordinates = [[]];
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
  if (displayCoordinates.value.length >= MAX_POINTS) {
    showToast('error', `Maximum ${MAX_POINTS} points autorisés`);
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

  showToast('success', `Point ${displayCoordinates.value.length} ajouté`);
};

const removePoint = (index: number) => {
  const coords = formData.value.geofence_polygon.coordinates[0];
  const isClosed = coords.length > 0 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1];
  if (isClosed) coords.pop();
  coords.splice(index, 1);
  if (coords.length >= 3) coords.push([...coords[0]]);
  drawExistingPolygon(formData.value.geofence_polygon.coordinates[0]);
};

const clearCoordinates = () => {
  formData.value.geofence_polygon.coordinates = [[]];
  if (ymapPolygon && ymap) {
    ymap.geoObjects.remove(ymapPolygon);
    ymapPolygon = null;
  }
  mapDrawing.value = false;
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

const goBack = () => router.push('/sites');

// ─── Submit ────────────────────────────────────────────────────────────────────

const submitSite = async () => {
  if (!isPolygonValid.value) {
    showToast('error', 'Veuillez définir au moins 3 points pour le polygone');
    return;
  }

  isLoading.value = true;
  try {
    const response = isEditMode.value
        ? await SiteService.updateSite(siteGuid.value!, formData.value)
        : await SiteService.createSite(formData.value);

    if (!response.success) {
      showToast('error', response?.data?.error?.message || 'Échec de l\'enregistrement');
    } else {
      showToast('success', isEditMode.value ? 'Site mis à jour avec succès' : 'Site créé avec succès');
      setTimeout(() => router.push('/sites'), 2000);
    }
  } catch (e: any) {
    showToast('error', e?.response?.data?.message || 'Une erreur est survenue');
  } finally {
    isLoading.value = false;
  }
};

// ─── Chargement données (mode édition) ────────────────────────────────────────

const loadSiteData = async () => {
  if (!siteGuid.value || siteGuid.value === 'new') return;
  isLoading.value = true;
  try {
    const res = await SiteService.getSite(siteGuid.value);
    Object.assign(formData.value, res.data.site);
    formData.value.created_by = res.data.site.created_by?.guid ?? res.data.site.created_by;
  } catch {
    showToast('error', 'Erreur lors du chargement');
  } finally {
    isLoading.value = false;
  }
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  HeadBuilder.apply({ title: 'Sites - Toké', css: [], meta: { viewport: 'width=device-width, initial-scale=1.0' } });

  const savedData = sessionStorage.getItem('siteFormData');
  if (savedData) {
    Object.assign(formData.value, JSON.parse(savedData));
    sessionStorage.removeItem('siteFormData');
  } else if (isEditMode.value) {
    await loadSiteData();
  }
});
</script>