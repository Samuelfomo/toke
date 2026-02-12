<template>
  <div class="flex min-h-screen background: radial-gradient(circle, rgba(255,222,89,1) 0%, rgba(0,74,173,1) 100%)">
    <div class="flex flex-col w-full">
      <Header />
      <!-- Loader modernisé -->
      <div v-if="isLoading" class="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm z-50">
        <svg aria-hidden="true" role="status" class="w-16 h-16 text-gray-200 animate-spin"
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M12 6l0 -3" />
          <path d="M16.25 7.75l2.15 -2.15" />
          <path d="M18 12l3 0" />
          <path d="M16.25 16.25l2.15 2.15" />
          <path d="M12 18l0 3" />
          <path d="M7.75 16.25l-2.15 2.15" />
          <path d="M6 12l-3 0" />
          <path d="M7.75 7.75l-2.15 -2.15" />
        </svg>
        <p class="mt-4 font-medium text-white text-lg animate-pulse">Chargement en cours...</p>
      </div>

      <div class="flex-grow flex">
        <main class="flex-grow lg:pl-32 py-8 px-4 lg:px-8 w-full">
          <!-- En-tête avec breadcrumb -->
          <div class="mb-8">
            <div class="flex items-center gap-2 text-[var(--font-size-body-sm)] text-[var(--text-secondary)] mb-3">
              <button @click="goBack" class="hover:text-white transition-colors">
                Sites
              </button>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-white">{{ isEditMode ? 'Modifier' : 'Nouveau' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div>
              </div>
              <button @click="goBack"
                      class="h-[var(--btn-height)] px-6
                             bg-white border border-[var(--border-medium)]
                             text-[var(--text-primary)] font-medium
                             rounded-[var(--border-radius)]
                             hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]
                             flex items-center gap-2
                             transition-all duration-[var(--transition-base)]
                             shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)]">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Retour
              </button>
            </div>
          </div>

          <form @submit.prevent="submitSite">
            <!-- Informations Générales -->
            <div class="bg-[var(--bg-card)] rounded-[var(--border-radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden mb-6">
              <div class="p-6 border-b border-[var(--border-light)]">
                <h2 class="text-[var(--font-size-h5)] font-semibold text-[var(--text-primary)] flex items-center gap-3">
                  <div class="w-10 h-10 rounded-[var(--border-radius)] bg-blue-50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  Informations Générales
                </h2>
              </div>

              <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Nom du Site -->
                  <div>
                    <label class="block text-[var(--font-size-body-sm)] font-medium text-[var(--text-primary)] mb-2" for="site-name">
                      Nom du Site <span class="text-[var(--color-error)]">*</span>
                    </label>
                    <input v-model="formData.name"
                           id="site-name"
                           type="text"
                           required
                           class="w-full h-[var(--input-height)] px-4
                                  bg-[var(--bg-secondary)] border border-[var(--border-medium)]
                                  rounded-[var(--border-radius)]
                                  text-[var(--font-size-body)] text-[var(--text-primary)]
                                  placeholder:text-[var(--text-muted)]
                                  focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
                                  transition-all duration-[var(--transition-base)]"
                           placeholder="Ex: IMEDIATIS SARL"/>
                  </div>

                  <!-- Type de Site -->
                  <div>
                    <label class="block text-[var(--font-size-body-sm)] font-medium text-[var(--text-primary)] mb-2" for="site-type">
                      Type de Site <span class="text-[var(--color-error)]">*</span>
                    </label>
                    <select v-model="formData.site_type"
                            id="site-type"
                            required
                            class="w-full h-[var(--input-height)] px-4
                                   bg-[var(--bg-secondary)] border border-[var(--border-medium)]
                                   rounded-[var(--border-radius)]
                                   text-[var(--font-size-body)] text-[var(--text-primary)]
                                   focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
                                   transition-all duration-[var(--transition-base)]">
                      <option value="">Sélectionner un type</option>
                      <option value="global_site">Global Site</option>
                      <option value="manager_site">Manager Site</option>
                    </select>
                  </div>

                  <!-- Rayon de Géofencing -->
                  <div>
                    <label class="block text-[var(--font-size-body-sm)] font-medium text-[var(--text-primary)] mb-2" for="geofence-radius">
                      Rayon de Géofencing (mètres) <span class="text-[var(--color-error)]">*</span>
                    </label>
                    <input v-model.number="formData.geofence_radius"
                           id="geofence-radius"
                           type="number"
                           required
                           min="1"
                           class="w-full h-[var(--input-height)] px-4
                                  bg-[var(--bg-secondary)] border border-[var(--border-medium)]
                                  rounded-[var(--border-radius)]
                                  text-[var(--font-size-body)] text-[var(--text-primary)]
                                  placeholder:text-[var(--text-muted)]
                                  focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
                                  transition-all duration-[var(--transition-base)]"
                           placeholder="Ex: 100"/>
                  </div>

                  <!-- Statut -->
                  <div class="flex items-center gap-8 pt-6">
                    <label class="inline-flex items-center gap-3 cursor-pointer">
                      <input type="checkbox"
                             v-model="formData.active"
                             class="w-5 h-5 rounded border-[var(--border-medium)] text-[var(--color-success)]
                                    focus:ring-2 focus:ring-[var(--color-success)] focus:ring-opacity-20 cursor-pointer"/>
                      <span class="text-[var(--font-size-body)] font-medium text-[var(--text-primary)]">Site Actif</span>
                    </label>
                    <label class="inline-flex items-center gap-3 cursor-pointer">
                      <input type="checkbox"
                             v-model="formData.public"
                             class="w-5 h-5 rounded border-[var(--border-medium)] text-[var(--color-primary)]
                                    focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20 cursor-pointer"/>
                      <span class="text-[var(--font-size-body)] font-medium text-[var(--text-primary)]">Site Public</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Adresse -->
            <div class="bg-[var(--bg-card)] rounded-[var(--border-radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden mb-6">
              <div class="p-6 border-b border-[var(--border-light)]">
                <h2 class="text-[var(--font-size-h5)] font-semibold text-[var(--text-primary)] flex items-center gap-3">
                  <div class="w-10 h-10 rounded-[var(--border-radius)] bg-purple-50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  Adresse
                </h2>
              </div>

              <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <!-- Ville -->
                  <div>
                    <label class="block text-[var(--font-size-body-sm)] font-medium text-[var(--text-primary)] mb-2" for="city">
                      Ville <span class="text-[var(--color-error)]">*</span>
                    </label>
                    <input v-model="formData.address.city"
                           id="city"
                           type="text"
                           required
                           class="w-full h-[var(--input-height)] px-4
                                  bg-[var(--bg-secondary)] border border-[var(--border-medium)]
                                  rounded-[var(--border-radius)]
                                  text-[var(--font-size-body)] text-[var(--text-primary)]
                                  placeholder:text-[var(--text-muted)]
                                  focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
                                  transition-all duration-[var(--transition-base)]"
                           placeholder="Ex: Douala"/>
                  </div>

                  <!-- Localisation -->
                  <div>
                    <label class="block text-[var(--font-size-body-sm)] font-medium text-[var(--text-primary)] mb-2" for="location">
                      Localisation <span class="text-[var(--color-error)]">*</span>
                    </label>
                    <input v-model="formData.address.location"
                           id="location"
                           type="text"
                           required
                           class="w-full h-[var(--input-height)] px-4
                                  bg-[var(--bg-secondary)] border border-[var(--border-medium)]
                                  rounded-[var(--border-radius)]
                                  text-[var(--font-size-body)] text-[var(--text-primary)]
                                  placeholder:text-[var(--text-muted)]
                                  focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
                                  transition-all duration-[var(--transition-base)]"
                           placeholder="Ex: Makepe"/>
                  </div>

                  <!-- Nom du Lieu -->
                  <div>
                    <label class="block text-[var(--font-size-body-sm)] font-medium text-[var(--text-primary)] mb-2" for="place-name">
                      Nom du Lieu
                    </label>
                    <input v-model="formData.address.place_name"
                           id="place-name"
                           type="text"
                           class="w-full h-[var(--input-height)] px-4
                                  bg-[var(--bg-secondary)] border border-[var(--border-medium)]
                                  rounded-[var(--border-radius)]
                                  text-[var(--font-size-body)] text-[var(--text-primary)]
                                  placeholder:text-[var(--text-muted)]
                                  focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
                                  transition-all duration-[var(--transition-base)]"
                           placeholder="Ex: ABOU DE BANGUI"/>
                  </div>
                </div>
              </div>
            </div>

            <!-- Coordonnées Géographiques -->
            <div class="bg-[var(--bg-card)] rounded-[var(--border-radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden mb-6">
              <div class="p-6 border-b border-[var(--border-light)]">
                <div class="flex items-center justify-between">
                  <h2 class="text-[var(--font-size-h5)] font-semibold text-[var(--text-primary)] flex items-center gap-3">
                    <div class="w-10 h-10 rounded-[var(--border-radius)] bg-green-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                      </svg>
                    </div>
                    Coordonnées Géographiques
                  </h2>

                  <button type="button"
                          @click="openMapSelector"
                          class="h-10 px-4
                                 bg-[var(--color-primary)] text-white
                                 rounded-[var(--border-radius)]
                                 font-medium text-[var(--font-size-body-sm)]
                                 hover:opacity-90 active:scale-95
                                 flex items-center gap-2
                                 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)]
                                 transition-all duration-[var(--transition-base)]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                    </svg>
                    Ouvrir la carte
                  </button>
                </div>
              </div>

              <div class="p-6">
                <!-- Info -->
                <div class="bg-blue-50 border border-blue-200 rounded-[var(--border-radius)] p-4 mb-6">
                  <div class="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div class="flex-1">
                      <p class="text-[var(--font-size-body-sm)] text-[var(--text-primary)] font-medium mb-1">
                        Définissez la zone géographique du site
                      </p>
                      <p class="text-[var(--font-size-body-sm)] text-[var(--text-secondary)]">
                        Utilisez la carte interactive pour sélectionner les points du polygone, ou ajoutez-les manuellement ci-dessous.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Saisie manuelle -->
                <div class="mb-6">
                  <label class="block text-[var(--font-size-body-sm)] font-medium text-[var(--text-primary)] mb-3">
                    Ajouter un point manuellement
                  </label>
                  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div class="md:col-span-1">
                      <input v-model.number="manualPoint.lng"
                             type="number"
                             step="0.000001"
                             class="w-full h-10 px-3
                                    bg-white border border-[var(--border-medium)]
                                    rounded-[var(--border-radius)]
                                    text-[var(--font-size-body-sm)] text-[var(--text-primary)]
                                    placeholder:text-[var(--text-muted)]
                                    focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
                                    transition-all duration-[var(--transition-base)]"
                             placeholder="Longitude"/>
                    </div>
                    <div class="md:col-span-1">
                      <input v-model.number="manualPoint.lat"
                             type="number"
                             step="0.000001"
                             class="w-full h-10 px-3
                                    bg-white border border-[var(--border-medium)]
                                    rounded-[var(--border-radius)]
                                    text-[var(--font-size-body-sm)] text-[var(--text-primary)]
                                    placeholder:text-[var(--text-muted)]
                                    focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
                                    transition-all duration-[var(--transition-base)]"
                             placeholder="Latitude"/>
                    </div>
                    <div class="md:col-span-2">
                      <button type="button"
                              @click="addManualPoint"
                              class="w-full h-10 px-4
                                     bg-[var(--color-success)] text-white
                                     rounded-[var(--border-radius)]
                                     font-medium text-[var(--font-size-body-sm)]
                                     hover:opacity-90 active:scale-95
                                     transition-all duration-[var(--transition-base)]">
                        Ajouter le point
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Liste des points -->
                <div v-if="formData.geofence_polygon.coordinates[0] && formData.geofence_polygon.coordinates[0].length > 0">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-[var(--font-size-body-sm)] font-medium text-[var(--text-primary)]">
                      Points du polygone:
                      <span class="text-[var(--color-primary)]">{{ displayCoordinates.length }}</span>
                      <span class="text-[var(--text-muted)] ml-2">(minimum 3 requis)</span>
                    </span>
                    <button type="button"
                            @click="clearCoordinates"
                            class="text-[var(--font-size-body-sm)] text-[var(--color-error)] hover:underline font-medium">
                      Tout effacer
                    </button>
                  </div>
                  <div class="max-h-80 overflow-y-auto bg-[var(--bg-secondary)] p-4 rounded-[var(--border-radius)] border border-[var(--border-light)]">
                    <div v-for="(coord, index) in displayCoordinates"
                         :key="index"
                         class="flex items-center justify-between py-3 px-4 hover:bg-white rounded-[var(--border-radius-sm)] group transition-colors mb-2 last:mb-0">
                      <div class="flex items-center gap-4">
                        <div class="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[var(--font-size-body-sm)] font-medium">
                          {{ index + 1 }}
                        </div>
                        <div class="text-[var(--font-size-body-sm)]">
                          <span class="text-[var(--text-secondary)]">Lng:</span>
                          <span class="text-[var(--text-primary)] font-medium ml-2">{{ coord[0].toFixed(6) }}</span>
                          <span class="text-[var(--text-secondary)] ml-4">Lat:</span>
                          <span class="text-[var(--text-primary)] font-medium ml-2">{{ coord[1].toFixed(6) }}</span>
                        </div>
                      </div>
                      <button type="button"
                              @click="removePoint(index)"
                              class="opacity-0 group-hover:opacity-100 p-2 text-[var(--color-error)] hover:bg-red-50 rounded-[var(--border-radius-sm)] transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center py-16 bg-[var(--bg-secondary)] rounded-[var(--border-radius)] border-2 border-dashed border-[var(--border-medium)]">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                  </svg>
                  <p class="text-[var(--font-size-body)] font-medium text-[var(--text-secondary)] mb-2">
                    Aucune coordonnée définie
                  </p>
                  <p class="text-[var(--font-size-body-sm)] text-[var(--text-muted)]">
                    Cliquez sur "Ouvrir la carte" ou ajoutez des points manuellement
                  </p>
                </div>
              </div>
            </div>

            <!-- Boutons d'Action -->
            <div class="flex justify-end gap-4">
              <button type="button"
                      @click="goBack"
                      class="h-[var(--btn-height)] px-8
                             bg-white border border-[var(--border-medium)]
                             text-[var(--text-primary)] font-medium text-[var(--font-size-btn)]
                             rounded-[var(--border-radius)]
                             hover:border-[var(--border-dark)] hover:bg-[var(--bg-secondary)]
                             transition-all duration-[var(--transition-base)]
                             shadow-[var(--shadow-sm)]">
                Annuler
              </button>
              <button type="submit"
                      ref="submitButton"
                      class="h-[var(--btn-height)] px-8
                             bg-[var(--color-primary)] text-white
                             font-medium text-[var(--font-size-btn)]
                             rounded-[var(--border-radius)]
                             hover:opacity-90 active:scale-95
                             transition-all duration-[var(--transition-base)]
                             shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)]">
                {{ isEditMode ? 'Mettre à Jour' : 'Créer le Site' }}
              </button>
            </div>
          </form>
        </main>
      </div>
      <Footer />

      <!-- Message de notification -->
      <div ref="successMessage"
           :class="[
             'fixed right-8 top-24 text-white px-6 py-4 rounded-[var(--border-radius-lg)] shadow-[var(--shadow-xl)]',
             'opacity-0 transform translate-y-4 transition-all duration-300 z-[100]',
             messageType === 'success' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'
           ]">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="messageType === 'success'"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 13l4 4L19 7"></path>
            <path v-else
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <span class="font-medium">{{ messageText }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import Header from "@/views/components/header.vue";
import HeadBuilder from "@/utils/HeadBuilder";
import SiteService from "@/service/SiteService";
import {CreateSite} from "@/utils/interfaces/site.interface";
import { useUserStore } from '@/stores/userStore';
import Footer from '@/views/components/footer.vue';

const route = useRoute();
const router = useRouter();
const isLoading = ref(false);
const siteGuid = ref<string | null>(route.query.guid ? String(route.query.guid) : null);
const isEditMode = computed(() => !!siteGuid.value && siteGuid.value !== 'new');
const successMessage = ref(null);
const messageType = ref('success');
const messageText = ref('');
const submitButton = ref(null);

const userStore = useUserStore();

const formData = ref<CreateSite>({
  name: '',
  site_type: '',
  address: {
    city: '',
    location: '',
    place_name: ''
  },
  geofence_radius: 100,
  active: true,
  public: false,
  geofence_polygon: {
    crs: {
      type: "name",
      properties: {
        name: "EPSG:4326"
      }
    },
    type: "Polygon",
    coordinates: [[]]
  },
  created_by: userStore.user?.guid || '',
});

const manualPoint = ref({
  lng: null as number | null,
  lat: null as number | null
});

const displayCoordinates = computed(() => {
  const coords = formData.value.geofence_polygon.coordinates[0];
  if (coords.length > 0 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]) {
    return coords.slice(0, -1);
  }
  return coords;
});

const goBack = () => {
  router.push('/sites');
};

const openMapSelector = () => {
  sessionStorage.setItem('siteFormData', JSON.stringify(formData.value));
  const guid = siteGuid.value || 'new';
  router.push({
    path: '/sites/map',
    query: { guid, mode: 'select' }
  });
};

const addManualPoint = () => {
  if (manualPoint.value.lng === null || manualPoint.value.lat === null) {
    messageType.value = 'error';
    messageText.value = 'Veuillez entrer une longitude et une latitude valides';
    showMessage();
    return;
  }

  if (Math.abs(manualPoint.value.lat) > 90 || Math.abs(manualPoint.value.lng) > 180) {
    messageType.value = 'error';
    messageText.value = 'Coordonnées invalides (Lat: -90 à 90, Lng: -180 à 180)';
    showMessage();
    return;
  }

  const coords = formData.value.geofence_polygon.coordinates[0];
  const hasClosingPoint = coords.length > 0 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1];

  if (hasClosingPoint) {
    coords.pop();
  }

  coords.push([manualPoint.value.lng, manualPoint.value.lat]);

  if (coords.length >= 3) {
    coords.push([...coords[0]]);
  }

  manualPoint.value = { lng: null, lat: null };

  messageType.value = 'success';
  messageText.value = `Point ${coords.length - (coords.length >= 3 ? 1 : 0)} ajouté`;
  showMessage();
};

const removePoint = (index: number) => {
  const coords = formData.value.geofence_polygon.coordinates[0];
  const hasClosingPoint = coords.length > 0 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1];

  if (hasClosingPoint) {
    coords.pop();
  }

  coords.splice(index, 1);

  if (coords.length >= 3) {
    coords.push([...coords[0]]);
  }
};

const clearCoordinates = () => {
  formData.value.geofence_polygon.coordinates = [[]];
  messageType.value = 'success';
  messageText.value = 'Tous les points ont été effacés';
  showMessage();
};

const showMessage = () => {
  gsap.to(successMessage.value, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: 'power3.out',
    onComplete: () => {
      setTimeout(() => {
        gsap.to(successMessage.value, {
          opacity: 0,
          y: -10,
          duration: 0.5
        });
      }, 3000);
    }
  });
};

const loadSiteData = async () => {
  if (!siteGuid.value || siteGuid.value === 'new') return;

  isLoading.value = true;
  try {
    const response = await SiteService.getSite(siteGuid.value);
    Object.assign(formData.value, response.data.site);
    formData.value.created_by = response.data.site.created_by.guid;
    isLoading.value = false;
  } catch (error) {
    messageType.value = 'error';
    messageText.value = 'Erreur lors du chargement des données';
    showMessage();
    isLoading.value = false;
  }
};

const submitSite = async () => {
  if (!formData.value.name || !formData.value.site_type || !formData.value.address.city || !formData.value.address.location) {
    messageType.value = 'error';
    messageText.value = 'Veuillez remplir tous les champs obligatoires';
    showMessage();
    return;
  }

  const coords = formData.value.geofence_polygon.coordinates[0];
  const actualPointsCount = coords.length > 0 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]
    ? coords.length - 1
    : coords.length;

  if (actualPointsCount < 3) {
    messageType.value = 'error';
    messageText.value = 'Veuillez définir au moins 3 points pour le polygone';
    showMessage();
    return;
  }

  isLoading.value = true;
  try {
    const response = isEditMode.value
      ? await SiteService.updateSite(siteGuid.value!, formData.value)
      : await SiteService.createSite(formData.value);

    gsap.to(submitButton.value, {
      scale: 0.95,
      duration: 0.1,
      onComplete: () => {
        gsap.to(submitButton.value, {
          scale: 1,
          duration: 0.3,
          ease: 'elastic.out(1, 0.3)'
        });
      }
    });

    const isSuccess =
      (isEditMode.value && response.success) ||
      (!isEditMode.value && response.success);

    if (!isSuccess) {
      messageType.value = 'error';
      messageText.value =
        response?.data?.error?.message ||
        (isEditMode.value ? 'Échec de la mise à jour du site' : 'Échec de la création du site');

      showMessage();
    } else {
      messageType.value = 'success';
      messageText.value = isEditMode.value
        ? 'Site mis à jour avec succès'
        : 'Site créé avec succès';

      showMessage();

      setTimeout(() => {
        router.push('/sites');
      }, 2000);
    }

  } catch (error: any) {
    messageType.value = 'error';
    messageText.value = error.response?.data?.message || 'Une erreur est survenue';
    showMessage();
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  HeadBuilder.apply({
    title: 'Site - Toké',
    css: [],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });

  const savedData = sessionStorage.getItem('siteFormData');
  if (savedData) {
    const parsed = JSON.parse(savedData);
    Object.assign(formData.value, parsed);
    sessionStorage.removeItem('siteFormData');
  } else if (isEditMode.value) {
    await loadSiteData();
  }
});
</script>

<style scoped>
/* Styles personnalisés si nécessaire */
</style>