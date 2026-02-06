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
      :href="url"
      target="_blank"
      class="media-link"
    >
      🔗 Ouvrir le fichier
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import MemoService from '@/service/MemoService';

interface Props {
  url: string;
}

const props = defineProps<Props>();

const mediaUrl = ref<string | undefined>();
const loading = ref(false);
const error = ref<string | null>(null);

// 🔍 Détection du type de fichier
const mediaType = computed(() => {
  const ext = props.url.split('.').pop()?.toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return 'image';
  }
  if (['mp3', 'm4a', 'wav', 'ogg'].includes(ext || '')) {
    return 'audio';
  }
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) {
    return 'video';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext || '')) {
    return 'document';
  }
  return 'unknown';
});

const filename = computed(() => {
  return props.url.split('/').pop() || 'fichier';
});

// 📥 Charger le fichier avec authentification
// async function loadMedia() {
//   if (mediaType.value === 'document') return; // Pas de préchargement pour les docs
//
//   loading.value = true;
//   error.value = null;
//
//   try {
//     const response = await MemoService.loadFiles(props.url);
//
//     if (!response.ok) {
//       throw new Error(`Erreur ${response.status}`);
//     }
//
//     const blob = await response.blob();
//     mediaUrl.value = URL.createObjectURL(blob);
//   } catch (err: any) {
//     error.value = err.message;
//   } finally {
//     loading.value = false;
//   }
// }

async function loadMedia() {
  if (mediaType.value === 'document') return;

  loading.value = true;
  error.value = null;

  try {
    const blob = await MemoService.loadFiles(props.url);

    mediaUrl.value = URL.createObjectURL(blob);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// 📥 Télécharger un document
async function downloadFile() {
  try {
    const token = localStorage.getItem('authToken');

    const response = await fetch(props.url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Téléchargement échoué');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename.value;
    a.click();

    URL.revokeObjectURL(blobUrl);
  } catch (err: any) {
    error.value = err.message;
  }
}

onMounted(() => {
  if (mediaType.value !== 'document') {
    loadMedia();
  }
});

onUnmounted(() => {
  if (mediaUrl.value) {
    URL.revokeObjectURL(mediaUrl.value);
  }
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