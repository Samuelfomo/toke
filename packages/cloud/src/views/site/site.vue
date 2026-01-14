<template>
  <div class="flex min-h-screen">
    <div class="flex flex-col w-full">
      <!-- Header -->
      <Header />

      <!-- Loader -->
      <div v-if="isLoading" class="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50">
        <svg aria-hidden="true" role="status" class="w-40 h-40 text-gray-200 animate-spin dark:text-gray-600"
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#006FFF"
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
        <p class="mt-4 font-bold text-yellow-200 text-xl animate-pulse">Chargement...</p>
      </div>

      <!-- Main Content Area -->
      <div class="flex-grow flex">
        <main class="flex-grow bg-gradient-to-br from-blue-600 to-white rounded-lg shadow-md lg:pl-32 lg:p-16 py-6 w-full space-y-10">
          <div class="bg-gray-50 bg-opacity-90 px-8 py-6">
            <h3 class="text-3xl font-semibold text-gray-800 pb-6">
              Gestion des Sites
            </h3>

            <div class="bg-white p-12 rounded-lg shadow-md">
              <div class="flex justify-between items-center mb-6">
                <h4 class="text-2xl font-semibold text-gray-700">Liste des Sites</h4>
                <div class="flex justify-between items-center space-x-4">
                  <div class="flex w-full lg:justify-end items-center">
                    <input type="text" v-model="searchTerm" placeholder="Rechercher un site"
                           class="w-full bg-gray-50 hover:bg-white lg:max-w-[16rem] p-4 border focus:right-2 rounded-lg
                                  placeholder:text-gray-600 placeholder:text-lg focus:outline-none focus:border-gray-400
                                  focus:text-lime-700 focus:font-medium placeholder:font-roboto placeholder:font-normal
                                  text-right placeholder:focus:text-lime-700">
                  </div>
                  <div class="flex space-x-4">
                    <button @click="goToAddSite"
                            class="p-4 bg-blue-600 text-white rounded hover:bg-blue-800 flex items-center shadow"
                            title="Ajouter un Nouveau Site">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                           fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                  <th class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600">
                    Nom du Site
                  </th>
                  <th class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600">
                    Type
                  </th>
                  <th class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600">
                    Ville
                  </th>
                  <th class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600">
                    Localisation
                  </th>
                  <th class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600">
                    Tolérance (m)
                  </th>
                  <th class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600">
                    Statut
                  </th>
                  <th class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600">
                    Date de création
                  </th>
                  <th class="py-2 px-4 bg-gray-100 border-b border-gray-300 text-left text-sm text-gray-600">
                    Actions
                  </th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="site in paginatedSites" :key="site.guid" class="hover:bg-gray-50 cursor-pointer">
                  <td class="py-2 px-4 border-b border-gray-300">
                    <div class="flex justify-start items-center">
                        <span :class="site.public ? 'bg-green-500' : 'bg-orange-500'"
                              class="inline-block w-2.5 h-2.5 rounded-full absolute"></span>
                      <span class="pl-5 font-medium">{{ site.name }}</span>
                    </div>
                  </td>
                  <td class="py-2 px-4 border-b border-gray-300">
                      <span class="px-2 py-1 text-xs rounded-full"
                            :class="site.site_type === 'global_site' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'">
                        {{ site.site_type === 'global_site' ? 'Global' : 'Manager' }}
                      </span>
                  </td>
                  <td class="py-2 px-4 border-b border-gray-300">
                    {{ site.address?.city || 'N/A' }}
                  </td>
                  <td class="py-2 px-4 border-b border-gray-300">
                    {{ site.address?.location || 'N/A' }}
                  </td>
                  <td class="py-2 px-4 border-b border-gray-300 text-center">
                    {{ site.geofence_radius }}
                  </td>
                  <td class="py-2 px-4 border-b border-gray-300">
                      <span :class="site.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                            class="px-2 py-1 text-xs rounded-full">
                        {{ site.active ? 'Actif' : 'Inactif' }}
                      </span>
                  </td>
                  <td class="py-2 px-4 border-b border-gray-300">
                    {{ formatDate(site.created_at) }}
                  </td>
                  <td class="py-2 px-4 border-b border-gray-300">
                    <div class="relative">
                      <button @click.stop="toggleMenu(site.guid)"
                              class="p-1 hover:bg-gray-100 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                      </button>
                      <div v-if="activeMenu === site.guid"
                           class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div class="py-1">
                          <button @click="viewSiteMap(site.guid)"
                                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-2" fill="none"
                                 viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                            </svg>
                            Voir sur la carte
                          </button>
                          <button @click="editSite(site.guid)"
                                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-2" fill="none"
                                 viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            Modifier
                          </button>
                          <button @click="deleteSite(site.guid)"
                                  class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-2" fill="none"
                                 viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>

              <!-- Message quand aucun résultat -->
              <div v-if="!isLoading && filteredSites.length === 0"
                   class="py-4 text-center text-lg font-serif text-red-500">
                Aucun site trouvé pour le moment.
              </div>

              <!-- Pagination Controls -->
              <div class="flex flex-col md:flex-row justify-between items-center gap-2 pt-12">
                <div class="text-sm text-gray-700">
                  Page {{ currentPage }} sur {{ totalPages || 0 }}
                  (Total: {{ filteredSites.length || 0 }} sites)
                </div>
                <div class="flex space-x-2">
                  <button @click="prevPage" :disabled="currentPage === 1"
                          class="px-4 py-2 border rounded bg-white hover:bg-black hover:text-white
                                 disabled:opacity-30 disabled:cursor-not-allowed tracking-wider transition">
                    Précédent
                  </button>
                  <button @click="nextPage" :disabled="currentPage === totalPages"
                          class="px-4 py-2 border rounded bg-white hover:bg-black hover:text-white
                                 disabled:opacity-30 disabled:cursor-not-allowed tracking-wider transition">
                    Suivant
                  </button>
                </div>
              </div>
            </div>

            <!-- Message dynamique -->
            <div ref="successMessage"
                 :class="['fixed right-8 top-[10%] text-white p-4 rounded-lg shadow-lg opacity-0 transform translate-y-4 transition-all duration-300 z-50',
                          messageType === 'success' ? 'bg-green-600' : 'bg-red-600']">
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
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from 'vue-router';
import gsap from "gsap";

import Header from "@/views/components/header.vue";
import HeadBuilder from "@/utils/HeadBuilder";
import SiteService from "@/service/SiteService";
import {Site, Sites, SitesResponse} from "@/utils/interfaces/site.interface";

const router = useRouter();
const isLoading = ref(false);
const sites = ref<Site[]>([]);
const currentPage = ref(1);
const entriesPerPage = ref(10);
const searchTerm = ref('');
const activeMenu = ref<any>(null);
const successMessage = ref(null);
const messageType = ref('success');
const messageText = ref('');

const goToAddSite = () => {
  router.push('/sites/add');
};

const editSite = (guid: string) => {
  // router.push(`/sites/edit/${guid}`);

  router.push({
    name: 'edit',
    query: { guid: guid.toString() },
  });
};

const viewSiteMap = (guid: string) => {
  // router.push(`/sites/map/${guid}`);

  router.push({
    name: 'map',
    query: { guid: guid.toString() },
  });
};

const toggleMenu = (siteGuid : string ) => {
  activeMenu.value = activeMenu.value === siteGuid ? null : siteGuid;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const deleteSite = async (guid: string) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce site ?')) return;

  try {
    // API call to delete site
    // await api.deleteSite(guid);
    messageType.value = 'success';
    messageText.value = 'Site supprimé avec succès';
    showMessage();
    await loadSites();
  } catch (error) {
    messageType.value = 'error';
    messageText.value = 'Erreur lors de la suppression';
    showMessage();
  }
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
      }, 2000);
    }
  });
};

const loadSites = async () => {
  isLoading.value = true;
  try {
    // Simulation avec les données fournies
    const siteData: any = await SiteService.listSites();

    setTimeout( () => {
      if (siteData.success) {
        const siteResponse: Sites = siteData.data.sites;

        sites.value = siteResponse.items
        console.log('siteResponse', siteResponse);
      }
      // // pour la simulation
      // else {
      //   sites.value =  [
      //     {
      //       guid: "5197983373552705",
      //       name: "IMEDIATIS SARL",
      //       site_type: "global_site",
      //       address: {
      //         city: "Douala",
      //         location: "Makepe",
      //         place_name: "ABOU DE BANGUI"
      //       },
      //       geofence_radius: 100,
      //       active: true,
      //       public: true,
      //       geofence_polygon: {
      //         type: "Polygon",
      //         coordinates: [[[9.751171, 4.085104], [9.751342, 4.084906], [9.751542, 4.085018], [9.751299, 4.085196], [9.751171, 4.085104]]]
      //       },
      //       created_at: "2025-11-15T16:56:49.966Z"
      //     }
      //   ];
      // }

      isLoading.value = false;
    }, 1000);
  } catch (error) {
    console.error('Erreur de chargement:', error);
    isLoading.value = false;
  }
};

onMounted(async () => {
  HeadBuilder.apply({
    title: 'Site - Toké',
    css: [],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });

  await loadSites();
});

const totalPages = computed(() => {
  return Math.ceil(filteredSites.value.length / entriesPerPage.value);
});

const paginatedSites = computed(() => {
  const startIndex = (currentPage.value - 1) * entriesPerPage.value;
  const endIndex = startIndex + entriesPerPage.value;
  return filteredSites.value.slice(startIndex, endIndex);
});

const filteredSites = computed(() => {
  const term = searchTerm.value.toLowerCase();
  if (!term) return sites.value;

  return sites.value.filter((site: any) => {
    return [
      site.name,
      site.site_type,
      site.address?.city,
      site.address?.location,
    ]
        .filter(Boolean)
        .some(field => field.toLowerCase().includes(term));
  });
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

watch([searchTerm, entriesPerPage], () => {
  currentPage.value = 1;
});
</script>

<style scoped>
th {
  background-color: #000000;
  color: white;
  padding: 12px;
  text-align: left;
}
</style>