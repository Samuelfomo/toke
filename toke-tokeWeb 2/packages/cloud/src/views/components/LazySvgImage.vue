<template>
  <div class="lazy-image-container" ref="container">
    <div v-if="!loaded" class="skeleton"></div>
    <img
      v-if="isVisible"
      :src="src"
      :alt="alt"
      @load="handleLoad"
      :class="{ 'visible': loaded }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';


const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: '',
  },
});

const container = ref(null);
const isVisible = ref(false);
const loaded = ref(false);

const handleLoad = () => {
  loaded.value = true;
};

onMounted(() => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true;
            observer.unobserve(container.value!);
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    if (container.value) {
      observer.observe(container.value);
    }
  } else {
    // Fallback pour les navigateurs ne supportant pas IntersectionObserver
    isVisible.value = true;
  }
});
</script>

<style scoped>
.lazy-image-container {
  width: 100%;
  position: relative;
  /* Assurez-vous d'ajouter une hauteur ou un padding pour que le skeleton soit visible */
  height: 100px; /* Exemple de hauteur */
}

.skeleton {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  border-radius: 8px;
  animation: pulse 1.5s infinite ease-in-out;
}

img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
}

img.visible {
  opacity: 1;
}

@keyframes pulse {
  0% {
    background-color: #f0f0f0;
  }
  50% {
    background-color: #e0e0e0;
  }
  100% {
    background-color: #f0f0f0;
  }
}
</style>