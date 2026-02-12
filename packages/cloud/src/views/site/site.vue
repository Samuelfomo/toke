<template>
  <div class="flex min-h-screen background: radial-gradient(circle, rgba(255,222,89,1) 0%, rgba(0,74,173,1) 100%)">
    <div class="flex flex-col w-full">
      <!-- Header -->
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

      <!-- Main Content Area -->
      <div class="flex-grow flex">
        <main class="flex-grow lg:pl-32 py-8 px-4 lg:px-8 w-full">
          <!-- Carte principale -->
          <div class="bg-[var(--bg-card)] rounded-[var(--border-radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden">
            <!-- Barre d'actions -->
            <div class="p-6 border-b border-[var(--border-light)]">
              <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <h2 class="text-[var(--font-size-h5)] font-semibold text-[var(--text-primary)]">
                  Sites
                  <span class="ml-3 text-[var(--font-size-body-sm)] font-normal text-[var(--text-secondary)]">
                    ({{ filteredSites.length }} sites)
                  </span>
                </h2>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <!-- Barre de recherche -->
                  <div class="relative flex-grow lg:flex-grow-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input type="text"
                           v-model="searchTerm"
                           placeholder="Rechercher un site..."
                           class="w-full lg:w-64 h-[var(--input-height)] pl-12 pr-4
                                  bg-[var(--bg-secondary)] border border-[var(--border-medium)]
                                  rounded-[var(--border-radius)]
                                  text-[var(--font-size-body)] text-[var(--text-primary)]
                                  placeholder:text-[var(--text-muted)]
                                  focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
                                  transition-[var(--transition-base)]">
                  </div>

                  <!-- Bouton d'ajout -->
                  <button @click="goToAddSite"
                          class="h-[var(--btn-height)] px-6
                                 bg-[var(--color-primary)] text-white
                                 rounded-[var(--border-radius)]
                                 font-medium text-[var(--font-size-btn)]
                                 hover:opacity-90 active:scale-95
                                 flex items-center justify-center gap-2
                                 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)]
                                 transition-all duration-[var(--transition-base)]"
                          title="Ajouter un Nouveau Site">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span class="hidden sm:inline">Nouveau site</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Tableau -->
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-[var(--border-light)]">
<!--                <thead>-->
<!--                <tr class="bg-[var(&#45;&#45;bg-secondary)]">-->
<!--                  <th class="py-4 px-6 text-left text-[var(&#45;&#45;font-size-body-sm)] font-semibold text-[var(&#45;&#45;text-primary)] uppercase tracking-wider">-->
<!--                    Site-->
<!--                  </th>-->
<!--                  <th class="py-4 px-6 text-left text-[var(&#45;&#45;font-size-body-sm)] font-semibold text-[var(&#45;&#45;text-primary)] uppercase tracking-wider">-->
<!--                    Type-->
<!--                  </th>-->
<!--                  <th class="py-4 px-6 text-left text-[var(&#45;&#45;font-size-body-sm)] font-semibold text-[var(&#45;&#45;text-primary)] uppercase tracking-wider">-->
<!--                    Ville-->
<!--                  </th>-->
<!--                  <th class="py-4 px-6 text-left text-[var(&#45;&#45;font-size-body-sm)] font-semibold text-[var(&#45;&#45;text-primary)] uppercase tracking-wider">-->
<!--                    Localisation-->
<!--                  </th>-->
<!--                  <th class="py-4 px-6 text-center text-[var(&#45;&#45;font-size-body-sm)] font-semibold text-[var(&#45;&#45;text-primary)] uppercase tracking-wider">-->
<!--                    Tolérance-->
<!--                  </th>-->
<!--                  <th class="py-4 px-6 text-left text-[var(&#45;&#45;font-size-body-sm)] font-semibold text-[var(&#45;&#45;text-primary)] uppercase tracking-wider">-->
<!--                    Statut-->
<!--                  </th>-->
<!--                  <th class="py-4 px-6 text-left text-[var(&#45;&#45;font-size-body-sm)] font-semibold text-[var(&#45;&#45;text-primary)] uppercase tracking-wider">-->
<!--                    Date-->
<!--                  </th>-->
<!--                  <th class="py-4 px-6 text-center text-[var(&#45;&#45;font-size-body-sm)] font-semibold text-[var(&#45;&#45;text-primary)] uppercase tracking-wider">-->
<!--                    Actions-->
<!--                  </th>-->
<!--                </tr>-->
<!--                </thead>-->
                <tbody class="divide-y divide-[var(--border-light)]">
                <tr v-for="site in paginatedSites"
                    :key="site.guid"
                    class="hover:bg-[var(--bg-secondary)] transition-colors duration-[var(--transition-fast)] cursor-pointer">
                  <td class="py-4 px-6">
                    <div class="flex items-center gap-3">
                      <div class="flex-shrink-0">
                        <div :class="site.public ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'"
                             class="w-3 h-3 rounded-full"></div>
                      </div>
                      <div>
                        <div class="font-medium text-[var(--font-size-body)] text-[var(--text-primary)]">
                          {{ site.name }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-6">
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-[var(--font-size-body-sm)] font-medium"
                            :class="site.site_type === 'global_site'
                              ? 'bg-blue-50 text-[var(--color-primary)]'
                              : 'bg-purple-50 text-purple-700'">
                        {{ site.site_type === 'global_site' ? 'Global' : 'Manager' }}
                      </span>
                  </td>
                  <td class="py-4 px-6 text-[var(--font-size-body)] text-[var(--text-secondary)]">
                    {{ site.address?.city || 'N/A' }}
                    ({{ site.address?.location || 'N/A' }})
                  </td>
<!--                  <td class="py-4 px-6 text-[var(&#45;&#45;font-size-body)] text-[var(&#45;&#45;text-secondary)]">-->
<!--                    {{ site.address?.location || 'N/A' }}-->
<!--                  </td>-->
                  <td class="py-4 px-6 text-center">
                      <span class="inline-flex items-center justify-center px-3 py-1 bg-[var(--bg-secondary)] rounded-[var(--border-radius-sm)]
                                   text-[var(--font-size-body-sm)] font-medium text-[var(--text-primary)]">
                        {{ site.geofence_radius }}m
                      </span>
                  </td>
                  <td class="py-4 px-6">
                      <span :class="site.active
                              ? 'bg-green-50 text-[var(--color-success)]'
                              : 'bg-red-50 text-[var(--color-error)]'"
                            class="inline-flex items-center px-3 py-1 rounded-full text-[var(--font-size-body-sm)] font-medium">
                        <span :class="site.active ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'"
                              class="w-2 h-2 rounded-full mr-2"></span>
                        {{ site.active ? 'Actif' : 'Inactif' }}
                      </span>
                  </td>
                  <td class="py-4 px-6 text-[var(--font-size-body-sm)] text-[var(--text-secondary)]">
                    {{ formatDate(site.created_at!) }}
                  </td>
                  <td class="py-4 px-6 text-center">
                    <div class="relative inline-block">
                      <button @click.stop="toggleMenu(site.guid!)"
                              class="p-2 hover:bg-[var(--bg-secondary)] rounded-[var(--border-radius)]
                                       transition-colors duration-[var(--transition-fast)]">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[var(--text-secondary)]"
                             viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                      </button>
                      <div v-if="activeMenu === site.guid"
                           class="absolute right-0 mt-2 w-56 rounded-[var(--border-radius-lg)]
                                    shadow-[var(--shadow-xl)] bg-white border border-[var(--border-light)] z-50
                                    overflow-hidden">
                        <div class="py-2">
                          <button @click="viewSiteMap(site.guid!)"
                                  class="flex items-center w-full px-4 py-3 text-[var(--font-size-body-sm)]
                                           text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]
                                           transition-colors duration-[var(--transition-fast)]">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-[var(--color-info)]"
                                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                            </svg>
                            Voir sur la carte
                          </button>
                          <button @click="editSite(site.guid!)"
                                  class="flex items-center w-full px-4 py-3 text-[var(--font-size-body-sm)]
                                           text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]
                                           transition-colors duration-[var(--transition-fast)]">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-[var(--color-primary)]"
                                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            Modifier
                          </button>
                          <div class="border-t border-[var(--border-light)] my-2"></div>
                          <button @click="deleteSite(site.guid!)"
                                  class="flex items-center w-full px-4 py-3 text-[var(--font-size-body-sm)]
                                           text-[var(--color-error)] hover:bg-red-50
                                           transition-colors duration-[var(--transition-fast)]">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none"
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
            </div>

            <!-- Message si aucun résultat -->
            <div v-if="!isLoading && filteredSites.length === 0"
                 class="py-16 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-[var(--font-size-body-lg)] font-medium text-[var(--text-secondary)]">
                Aucun site trouvé
              </p>
              <p class="text-[var(--font-size-body-sm)] text-[var(--text-muted)] mt-2">
                Essayez de modifier vos critères de recherche
              </p>
            </div>

            <!-- Pagination -->
            <div v-if="filteredSites.length > 0"
                 class="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]">
              <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div class="text-[var(--font-size-body-sm)] text-[var(--text-secondary)]">
                  Page <span class="font-medium text-[var(--text-primary)]">{{ currentPage }}</span>
                  sur <span class="font-medium text-[var(--text-primary)]">{{ totalPages }}</span>
                  <span class="hidden sm:inline">
                    · Total: <span class="font-medium text-[var(--text-primary)]">{{ filteredSites.length }}</span> sites
                  </span>
                </div>
                <div class="flex gap-2">
                  <button @click="prevPage"
                          :disabled="currentPage === 1"
                          class="px-4 h-10 border border-[var(--border-medium)] rounded-[var(--border-radius)]
                                 bg-white text-[var(--text-primary)] font-medium text-[var(--font-size-body-sm)]
                                 hover:bg-[var(--bg-secondary)] hover:border-[var(--color-primary)]
                                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[var(--border-medium)]
                                 transition-all duration-[var(--transition-base)]">
                    Précédent
                  </button>
                  <button @click="nextPage"
                          :disabled="currentPage === totalPages"
                          class="px-4 h-10 border border-[var(--border-medium)] rounded-[var(--border-radius)]
                                 bg-white text-[var(--text-primary)] font-medium text-[var(--font-size-body-sm)]
                                 hover:bg-[var(--bg-secondary)] hover:border-[var(--color-primary)]
                                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[var(--border-medium)]
                                 transition-all duration-[var(--transition-base)]">
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Footer -->
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
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from 'vue-router';
import gsap from "gsap";

import Header from "@/views/components/header.vue";
import Footer from "@/views/components/footer.vue";
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
  router.push({
    name: 'edit',
    query: { guid: guid.toString() },
  });
};

const viewSiteMap = (guid: string) => {
  router.push({
    name: 'map',
    query: { guid: guid.toString() },
  });
};

const toggleMenu = (siteGuid: string) => {
  activeMenu.value = activeMenu.value === siteGuid ? null : siteGuid;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
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
      }, 3000);
    }
  });
};

const loadSites = async () => {
  isLoading.value = true;
  try {
    const siteData: any = await SiteService.listSites();

    setTimeout(() => {
      if (siteData.success) {
        const siteResponse: Sites = siteData.data.sites;
        sites.value = siteResponse.items;
        console.log('siteResponse', siteResponse);
      }
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

// Fermer le menu au clic extérieur
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (activeMenu.value && !(e.target as HTMLElement).closest('.relative')) {
      activeMenu.value = null;
    }
  });
});
</script>

<style scoped>
/* Styles additionnels si nécessaire */
</style>