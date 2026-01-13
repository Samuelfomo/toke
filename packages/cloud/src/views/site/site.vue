<template>
  <div class="flex min-h-screen">
    <!-- Sidebar / Dashboard Navigation -->
<!--    <Dashboard />-->
    <div class="flex flex-col w-full">
      <!-- Header -->
      <Header />
      <!-- Loader (identique aux autres composants) -->
      <div v-if="isLoading" class="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50">
        <svg aria-hidden="true" role="status"   class="w-40 h-40 text-gray-200 animate-spin dark:text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"  fill="none"
             stroke="#006FFF"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path  d="M12 6l0 -3" /><path d="M16.25 7.75l2.15 -2.15" />
          <path d="M18 12l3 0" /><path d="M16.25 16.25l2.15 2.15" /><path d="M12 18l0 3" />
          <path d="M7.75 16.25l-2.15 2.15" /><path d="M6 12l-3 0" /><path d="M7.75 7.75l-2.15 -2.15" />
        </svg>
        <p class="mt-4 font-bold text-yellow-200 text-xl animate-pulse">Loading...</p>
      </div>

      <!-- Main Content Area -->
      <div class="flex-grow flex">
        <main class="flex-grow bg-gradient-to-br from-blue-600 to-white rounded-lg shadow-md lg:pl-32 lg:p-16 py-6 w-full space-y-10">
          <div class="bg-gray-50 bg-opacity-90 px-8 py-6">
            <h3 class="text-3xl font-semibold text-gray-800 pb-6">
              Gestion des sites
            </h3>

            <div class="bg-white p-12 rounded-lg shadow-md">
              <div class="flex justify-between items-center mb-6">
                <h4 class="text-2xl font-semibold text-gray-700">Liste des Sites</h4>
                <div class="flex justify-between items-center space-x-4">
                  <div class="flex w-full lg:justify-end items-center">
                    <input type="text" v-model="searchTerm" placeholder="Rechercher" class="w-full bg-gray-50 hover:bg-white lg:max-w-[16rem]
               p-4 border focus:right-2 rounded-lg placeholder:text-gray-600 placeholder:text-lg focus:outline-none
               focus:border-gray-400 focus:text-lime-700 focus:font-font-medium focus:font-bold
               placeholder:font-roboto placeholder:font-normal text-right placeholder:focus:text-lime-700">
                  </div>
                  <div class="flex space-x-4">
                    <button
                        @click="openAddModal"
                        class="p-4 bg-blue-600 text-white rounded hover:bg-blue-800 flex items-center shadow"
                        title="Ajouter un Nouveau Site"
                    >
                      <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                </div>

              </div>

              <table id="site-table" class="min-w-full bg-white rounded table-class">
                <thead>
                <tr>
                  <th
                      class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600"
                  >
                    Nam
                  </th>
                  <th
                      class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600"
                  >
                    Type
                  </th>
                  <th
                      class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600"
                  >
                    Address
                  </th>
                  <th
                      class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600"
                  >
                    geofence_polygon
                  </th>
                  <th
                      class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600"
                  >
                    geofence_radius
                  </th>
<!--               active? public?   /-->
                  <th
                      class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600"
                  >
                    created_at
                  </th>
                  <th
                      class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600"
                  >
                    Actions
                  </th>
                </tr>
                </thead>
                <tbody>
                <tr
                    v-for="site in paginatedSites"
                    :key="site.guid"
                    class="hover:bg-gray-50 cursor-pointer"
                >
                  <td
                      class="py-2 px-4 border-b border-gray-300"
                  >
                    <div class="flex justify-start items-center">
                        <span
                            v-if="site.portable"
                            class="inline-block w-2.5 h-2.5 rounded-full bg-lime-500 absolute"
                        >
                          </span>
                      <span class="pl-5"> {{ site.reference }}</span>

                    </div>

                  </td>
                  <td
                      class="py-2 px-4 border-b border-gray-300"
                  >
                    {{site.french}}
                  </td>
                  <td
                      class="py-2 px-4 border-b border-gray-300"
                  >
                    {{site.english}}
                  </td>
                  <td class="py-2 px-4 border-b border-gray-300">
                    <div class="relative">
                      <button
                          @click.stop="toggleMenu(site.guid)"
                          class="p-1 hover:bg-gray-100 rounded float-right"
                      >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                          <path
                              d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
                          />
                        </svg>
                      </button>
                      <div
                          v-if="activeMenu === site.guid"
                          class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                      >
                        <div class="py-1">
                          <button
                              class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            Modifier
                          </button>
                          <button
                              class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            Copier
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>
              <!-- Message quand aucun résultat -->
              <div v-if="!isLoading && filteredSites.length === 0" class="py-4 text-center text-lg font-serif text-red-500">
                Aucun site n’a été trouvé pour le moment.
              </div>

              <!--                 Pagination Controls -->
              <div class="flex flex-col md:flex-row justify-between items-center gap-2 pt-12">
                <div class="text-sm text-gray-700">
                  Page {{ currentPage }} sur {{ totalPages || 0 }}
                  (Total: {{  filteredSites.length || 0 }} partenaires)
                </div>
                <div class="flex space-x-2">
                  <button
                      @click="prevPage"
                      :disabled="currentPage === 1"
                      class="px-4 py-2 border rounded bg-white hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed tracking-wider transition"
                  >
                    Précédent
                  </button>
                  <button
                      @click="nextPage"
                      :disabled="currentPage === totalPages"
                      class="px-4 py-2 border rounded bg-white hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed tracking-wider transition"
                  >
                    Suivant
                  </button>
                </div>
              </div>

              <!-- Skeleton Loader -->
              <div v-if="isLoading" class="animate-pulse">
                <div class="flex justify-between mb-4">
                  <div class="h-6 bg-gray-300 w-1/4 rounded"></div>
                  <div class="flex space-x-2">
                    <div class="h-10 w-10 bg-gray-300 rounded"></div>
                    <div class="h-10 w-10 bg-gray-300 rounded"></div>
                  </div>
                </div>
                <table class="min-w-full">
                  <thead>
                  <tr>
                    <th
                        v-for="n in 7"
                        :key="n"
                        class="py-2 px-4 bg-gray-200 border-b"
                    >
                      <div class="h-4 bg-gray-300 w-3/4 rounded"></div>
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="n in 5" :key="n">
                    <td v-for="m in 7" :key="m" class="py-2 px-4 border-b">
                      <div class="h-4 bg-gray-200 w-full rounded"></div>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Modal pour Ajouter/Modifier -->
            <div
                v-if="showFormModal"
                class="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-30"
            >
              <div class="bg-white pb-6 rounded-lg shadow-md max-w-4xl w-full">
                <h3 class="text-3xl font-semibold text-black py-6 px-6 border-b">
                  {{ guid ? 'Modifier le Lexique' : 'Ajouter un Nouveau Lexique' }}
                </h3>

                <div class="p-6">
                  <label class="text-gray-700 block font-medium text-base" for="modal-reference">
                    Référence
                  </label>
                  <input
                      v-model="reference"
                      id="modal-reference"
                      type="text"
                      class="input-class p-4 w-full border border-gray-300 rounded bg-gray-50"
                      disabled
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 space-x-4 pb-6 px-6">
                  <div>
                    <label class="text-gray-700 block font-medium text-base" for="modal-english">Anglais</label>
                    <textarea
                        v-model="english"
                        id="modal-english"
                        class="input-class text-gray-800 font-semibold placeholder:font-normal mt-2 p-4 w-full border border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-green-300 focus:border-green-500"
                        placeholder="Entrez le terme en Anglais"
                    />
                  </div>
                  <div>
                    <label class="text-gray-700 block font-medium text-base" for="modal-french">Français</label>
                    <textarea
                        v-model="french"
                        id="modal-french"
                        class="input-class text-gray-800 font-semibold placeholder:font-normal mt-2 p-4 w-full border border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-green-300 focus:border-green-500"
                        placeholder="Entrez le terme en Français"
                    />
                  </div>
                </div>

                <!--                  <div class="pb-6 px-6">-->
                <!--                    <label class="inline-flex items-center">-->
                <!--                      <input type="checkbox" v-model="portable" class="form-checkbox accent-green-600" />-->
                <!--                      <span class="ml-2 font-medium text-base">Exporter pour Mobile</span>-->
                <!--                    </label>-->
                <!--                  </div>-->
                <div class="pb-6 px-6">
                  <label class="inline-flex items-center">
                    <input
                        type="checkbox"
                        v-model="portable"
                        class="form-checkbox h-5 w-5 accent-green-600 checked:text-white"
                    />
                    <span class="ml-2 font-medium text-base">Exporter pour Mobile</span>
                  </label>
                </div>


                <div class="flex justify-end space-x-4 px-6 pt-6">
                  <button
                      @click="guid ? closeFormModal() : closeFormModalSave()"
                      class="px-4 py-3 bg-gray-300 shadow font-medium tracking-wider text-black rounded hover:shadow-lg hover:bg-gray-600 hover:text-gray-100"
                  >
                    Annuler
                  </button>
                  <button
                      ref="submitButton"
                      @click="siteSubmit()"
                      class="px-4 py-3 bg-lime-700 text-white font-medium rounded hover:bg-lime-800 tracking-wider transition capitalize shadow-sm hover:shadow-lg"
                  >
                    {{ guid ? 'Mettre à Jour' : 'Enregistrer' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Message dynamique -->
            <div
                ref="successMessage"
                :class="[
    'fixed right-8 top-[10%] text-white p-4 rounded-lg shadow-lg opacity-0 transform translate-y-4 transition-all duration-300 z-50',
    messageType === 'success' ? 'bg-green-600' : 'bg-red-600'
  ]"
            >
              <div class="flex items-center">
                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>{{ messageText }}</span>
              </div>
            </div>

          </div>

        </main>
      </div>
      <Footer />
    </div>
  </div>
</template>
<script setup lang="ts">
import {ref, onMounted, nextTick, computed, watch} from "vue";
import gsap from "gsap";

import dashboardCss from "@/assets/css/toke-dMain-04.css?url"
import Header from '@/views/components/header.vue'
import HeadBuilder from '@/utils/HeadBuilder';
const isLoading = ref(false);

const sites = ref([])
const guid = ref(null)
const portable = ref(false)
const french = ref('')
const english = ref('')
const reference = ref('')

const currentPage = ref(1);
const entriesPerPage = ref(5);
const searchTerm = ref('');
const searchType = ref('name');

const showFormModal = ref(false)
const activeMenu = ref(null);
const successMessage = ref(null);
const messageType = ref('success');
const messageText = ref('');
const submitButton = ref(null);

/**
 * open modal site
 */
function openAddModal() {
  guid.value = null
  english.value = ''
  french.value = ''
  reference.value = ''
  portable.value = false
  showFormModal.value = true
}
function toggleMenu(siteGuid) {
  activeMenu.value = activeMenu.value === siteGuid ? null : siteGuid
}

const closeFormModal = () => {
  showFormModal.value = false
  nextTick(() => {
    english.value = ''
    french.value = ''
    reference.value = ''
    portable.value = false
    guid.value = null
  })
}
const closeFormModalSave = () => {
  showFormModal.value = false
  location.reload()
}
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
      }, 2000);
    }
  });
};
const siteSubmit = async () => {
  if (!english.value || !french.value) {
    messageType.value = 'error';
    messageText.value = `Les champs anglais et français sont obligatoires`;
    showMessage();
    return;
  }
  isLoading.value = true;
  // await new Promise(resolve => setTimeout(resolve, 1000));
  const limitedEnglish =
      english.value.length > 120 ? english.value.slice(0, 120) : english.value;
  try {
    const siteData = new site(reference.value, limitedEnglish, french.value, portable.value, guid.value);
    const siteSaved = await siteData.saved();
    if (!siteSaved) {
      messageType.value = 'error';
      messageText.value = `Échec de l'enregistrement du lexique`;
      showMessage();
      return;
    }

    // Animation du bouton
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
    // Message de succès
    messageType.value = 'success';
    messageText.value = `'lexique' ${guid.value?' mise à jour avec succès' : ' enregistré avec succès' } `;
    showMessage();
  } catch (error) {
    messageType.value = 'error';
    messageText.value = error.response?.data?.message || error.message || 'Une erreur est survenue';
    showMessage();
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  isLoading.value = true;
  HeadBuilder.apply({
    title: 'Site - Toké',
    css: [dashboardCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
  setTimeout( () =>{
    isLoading.value = false;
  }, 2000);
  try {
  } catch (error){
  }finally{
  }
});

const totalPages = computed(() => {
  return Math.ceil(filteredSites.value.length / entriesPerPage.value);
});

// Calcul des éléments à afficher sur la page courante
const paginatedSites = computed(() => {
  const startIndex = (currentPage.value - 1) * entriesPerPage.value;
  const endIndex = startIndex + entriesPerPage.value;
  return filteredSites.value.slice(startIndex, endIndex);
});

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function resetPagination() {
  currentPage.value = 1;
}

// Observer les changements du terme de recherche et du type de recherche
watch([searchTerm, searchType, entriesPerPage], () => {
  resetPagination();
});

// Filtrage des données en fonction du terme de recherche
const filteredSites = computed(() => {
  const term = searchTerm.value.toLowerCase();
  if (!term) return sites.value;

  return sites.value.filter(site => {
    return [
      site.reference,
      site.french,
      site.english,
    ]
        .filter(Boolean) // enlève les valeurs nulles/undefined
        .some(field => field.toLowerCase().includes(term));
  });
});


</script>

<style scoped>
.fixed {
  transition: opacity 0.5s ease;
}
th {
  background-color: #000000;
  color: white;
  padding: 12px;
  text-align: left;
}

.animate-pulse .bg-gray-200,
.animate-pulse .bg-gray-300 {
  background-color: #e5e7eb;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>


