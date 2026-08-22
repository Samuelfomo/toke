<template>
  <div class="media-wrapper">
    <!-- Loading -->
    <div v-if="loading" class="loading">
      <span>Chargement...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error">
      <span>❌ {{ error }}</span>
    </div>

    <!-- Image -->
    <img
        v-else-if="mediaType === 'image'"
        :src="mediaUrl"
        :alt="filename"
        class="media-image"
    />

    <!-- Audio -->
    <audio
        v-else-if="mediaType === 'audio'"
        :src="mediaUrl"
        controls
        class="media-audio"
    />

    <!-- Video -->
    <video
        v-else-if="mediaType === 'video'"
        :src="mediaUrl"
        controls
        class="media-video"
    />

    <!-- Document (téléchargement) -->
    <button
        v-else-if="mediaType === 'document'"
        @click="downloadFile"
        class="media-download"
    >
      📄 Télécharger {{ filename }}
    </button>

    <!-- Type inconnu -->
    <a
        v-else
        :href="normalizedUrl"
        target="_blank"
        class="media-link"
    >
      🔗 Ouvrir le fichier
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import MemoService from '@/service/MemoService';

interface Props {
  url: string;
}

const props = defineProps<Props>();

const mediaUrl = ref<string | undefined>();
const loading = ref(false);
const error = ref<string | null>(null);
let ownsMediaUrl = false;

const normalizedUrl = computed(() => props.url?.trim() || '');
const isLocalBrowserUrl = computed(() =>
    normalizedUrl.value.startsWith('blob:') || normalizedUrl.value.startsWith('data:'),
);

const cleanPath = computed(() => normalizedUrl.value.split(/[?#]/)[0]);

// 🔍 Détection du type de fichier
const mediaType = computed(() => {
  const ext = cleanPath.value.split('.').pop()?.toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
  if (['mp3', 'm4a', 'wav', 'ogg', 'aac'].includes(ext || '')) return 'audio';
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return 'video';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext || '')) return 'document';
  return 'unknown';
});

const filename = computed(() => {
  if (!normalizedUrl.value) return 'fichier';

  try {
    return decodeURIComponent(new URL(normalizedUrl.value, window.location.origin).pathname.split('/').pop() || 'fichier');
  } catch {
    return cleanPath.value.split('/').pop() || 'fichier';
  }
});

function releaseOwnedMediaUrl() {
  if (ownsMediaUrl && mediaUrl.value) {
    URL.revokeObjectURL(mediaUrl.value);
  }
  mediaUrl.value = undefined;
  ownsMediaUrl = false;
}

// 📥 Charger le fichier avec authentification via le BFF.
async function loadMedia() {
  releaseOwnedMediaUrl();
  error.value = null;

  if (!normalizedUrl.value) {
    return;
  }

  // Les blob:/data: sont déjà accessibles dans le navigateur : ne jamais les envoyer au BFF.
  if (isLocalBrowserUrl.value) {
    mediaUrl.value = normalizedUrl.value;
    return;
  }

  if (mediaType.value === 'document') return;

  loading.value = true;
  try {
    const blob = await MemoService.loadFiles(normalizedUrl.value);
    mediaUrl.value = URL.createObjectURL(blob);
    ownsMediaUrl = true;
  } catch (err: any) {
    error.value = err?.message || 'Impossible de charger le fichier';
  } finally {
    loading.value = false;
  }
}

// 📥 Télécharger un document via le même proxy BFF.
async function downloadFile() {
  if (!normalizedUrl.value) return;

  error.value = null;
  try {
    const blob = isLocalBrowserUrl.value
        ? await (await fetch(normalizedUrl.value)).blob()
        : await MemoService.loadFiles(normalizedUrl.value);

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename.value;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch (err: any) {
    error.value = err?.message || 'Téléchargement échoué';
  }
}

onMounted(loadMedia);

watch(normalizedUrl, () => {
  void loadMedia();
});

onUnmounted(() => {
  releaseOwnedMediaUrl();
});
</script>

<style scoped>
.media-wrapper {
  margin: 8px 0;
}

.media-image {
  max-width: 100%;
  border-radius: 8px;
}

.media-audio,
.media-video {
  width: 100%;
  max-width: 500px;
}

.media-download {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.loading, .error {
  padding: 8px;
  color: #666;
}
</style>