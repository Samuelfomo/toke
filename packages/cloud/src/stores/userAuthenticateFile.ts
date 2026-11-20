// /**
//  * 🔐 Composable pour charger des fichiers avec authentification
//  *
//  * Utilisation:
//  * const { getAuthenticatedUrl, clearCache } = useAuthenticatedFiles();
//  * const audioUrl = await getAuthenticatedUrl(originalUrl);
//  */
//
// import { ref, onUnmounted } from 'vue';
// import { useUserStore } from '@/composables/userStore';
//
// export function useAuthenticatedFiles() {
//   const userStore = useUserStore();
//
//   // Cache des Object URLs pour éviter les rechargements
//   const fileUrlCache = ref<Map<string, string>>(new Map());
//
//   /**
//    * 🔑 Récupère le token d'authentification
//    */
//   const getAuthToken = (): string | null => {
//     const token =
//       localStorage.getItem('token') ||
//       localStorage.getItem('authToken') ||
//       localStorage.getItem('access_token') ||
//       sessionStorage.getItem('token') ||
//       userStore.user?.token;
//
//     if (token) {
//       console.log('🔑 Token trouvé:', token.substring(0, 20) + '...');
//     } else {
//       console.warn('⚠️ Aucun token d\'authentification trouvé');
//     }
//
//     return token;
//   };
//
//   /**
//    * 📥 Charge un fichier avec authentification via fetch
//    */
//   const loadAuthenticatedFile = async (url: string): Promise<string> => {
//     console.log('🔐 Chargement fichier authentifié:', url);
//
//     const token = getAuthToken();
//
//     // Si pas de token, retourner l'URL directe (peut échouer)
//     if (!token) {
//       console.warn('⚠️ Pas de token, utilisation URL directe (peut échouer)');
//       return url;
//     }
//
//     try {
//       console.log('📡 Fetch avec authentification...');
//
//       const response = await fetch(url, {
//         method: 'GET',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Accept': '*/*',
//         },
//         credentials: 'include',
//       });
//
//       console.log('📡 Réponse:', response.status, response.statusText);
//
//       if (!response.ok) {
//         if (response.status === 401) {
//           throw new Error('Token invalide ou expiré. Veuillez vous reconnecter.');
//         }
//         throw new Error(`Erreur ${response.status}: ${response.statusText}`);
//       }
//
//       // Convertir en Blob
//       const blob = await response.blob();
//       console.log('📦 Blob créé:', {
//         type: blob.type,
//         size: `${(blob.size / 1024).toFixed(2)} KB`
//       });
//
//       // Créer un Object URL
//       const objectUrl = URL.createObjectURL(blob);
//       console.log('✅ Object URL créé:', objectUrl);
//
//       return objectUrl;
//
//     } catch (error: any) {
//       console.error('❌ Erreur chargement fichier:', error.message);
//       throw error;
//     }
//   };
//
//   /**
//    * 🎯 Récupère ou crée un Object URL pour un fichier (avec cache)
//    */
//   const getAuthenticatedUrl = async (originalUrl: string): Promise<string> => {
//     // Vérifier le cache
//     if (fileUrlCache.value.has(originalUrl)) {
//       const cachedUrl = fileUrlCache.value.get(originalUrl)!;
//       console.log('💾 URL depuis cache:', cachedUrl);
//       return cachedUrl;
//     }
//
//     try {
//       // Charger le fichier
//       const objectUrl = await loadAuthenticatedFile(originalUrl);
//
//       // Mettre en cache seulement si c'est un blob URL
//       if (objectUrl.startsWith('blob:')) {
//         fileUrlCache.value.set(originalUrl, objectUrl);
//       }
//
//       return objectUrl;
//     } catch (error) {
//       // En cas d'erreur, retourner l'URL originale (peut échouer)
//       console.warn('⚠️ Fallback sur URL originale');
//       return originalUrl;
//     }
//   };
//
//   /**
//    * 🧹 Nettoie tous les Object URLs du cache
//    */
//   const clearCache = () => {
//     console.log('🧹 Nettoyage du cache:', fileUrlCache.value.size, 'URLs');
//
//     fileUrlCache.value.forEach((url) => {
//       if (url.startsWith('blob:')) {
//         URL.revokeObjectURL(url);
//       }
//     });
//
//     fileUrlCache.value.clear();
//   };
//
//   /**
//    * 🗑️ Révoque un Object URL spécifique
//    */
//   const revokeUrl = (originalUrl: string) => {
//     const objectUrl = fileUrlCache.value.get(originalUrl);
//     if (objectUrl && objectUrl.startsWith('blob:')) {
//       URL.revokeObjectURL(objectUrl);
//       fileUrlCache.value.delete(originalUrl);
//       console.log('🗑️ URL révoquée:', originalUrl);
//     }
//   };
//
//   // Nettoyer automatiquement quand le composant est détruit
//   onUnmounted(() => {
//     clearCache();
//   });
//
//   return {
//     getAuthenticatedUrl,
//     clearCache,
//     revokeUrl,
//     getAuthToken,
//   };
// }