import { computed, ref } from 'vue';
import type {
  SiteAddressValue,
  SiteCoordinates,
  SiteGeolocationError,
  SiteGeolocationStatus,
  SiteLocationAccuracyLevel,
  SiteLocationSelection,
  SiteLocationSource,
} from '@/utils/geo/siteLocation.types';

const emptyAddress = (): SiteAddressValue => ({
  city: '',
  location: '',
  place_name: '',
});

const getAccuracyLevel = (accuracy: number | null): SiteLocationAccuracyLevel => {
  if (accuracy === null || !Number.isFinite(accuracy)) return 'unknown';
  if (accuracy <= 20) return 'good';
  if (accuracy <= 60) return 'medium';
  return 'low';
};

const getAccuracyLabel = (accuracy: number | null): string => {
  if (accuracy === null || !Number.isFinite(accuracy)) return 'Précision inconnue';
  return `± ${Math.round(accuracy)} m`;
};

const getBrowserGeolocationError = (error: GeolocationPositionError): SiteGeolocationError => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: 'permission_denied',
        browserCode: error.code,
        message: 'Autorisation de localisation refusée. Activez la localisation pour Toké dans votre navigateur.',
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: 'position_unavailable',
        browserCode: error.code,
        message: 'Votre position est momentanément indisponible. Vérifiez le GPS ou la connexion de l’appareil.',
      };
    case error.TIMEOUT:
      return {
        code: 'timeout',
        browserCode: error.code,
        message: 'La localisation prend trop de temps. Réessayez dans un endroit avec un meilleur signal GPS.',
      };
    default:
      return {
        code: 'unknown',
        browserCode: error.code,
        message: 'Impossible de récupérer votre position actuelle.',
      };
  }
};

/**
 * Etat de localisation du site.
 *
 * Deux notions sont volontairement séparées :
 * - currentPosition : position physique de l'appareil (GPS navigateur) ;
 * - selection : position retenue pour le site (GPS, recherche, carte, manuel).
 *
 * Le composable reste indépendant de Yandex Maps.
 */
export const useSiteLocation = () => {
  const selection = ref<SiteLocationSelection>({
    coordinates: null,
    source: 'none',
    accuracy: null,
    address: emptyAddress(),
    addressResolved: false,
  });

  const currentPosition = ref<{
    coordinates: SiteCoordinates | null;
    accuracy: number | null;
  }>({
    coordinates: null,
    accuracy: null,
  });

  const geolocationStatus = ref<SiteGeolocationStatus>('idle');
  const geolocationError = ref<SiteGeolocationError | null>(null);

  const hasCoordinates = computed(() => selection.value.coordinates !== null);
  const isLocating = computed(() => geolocationStatus.value === 'locating');

  const hasAddress = computed(() => {
    const address = selection.value.address;
    return Boolean(address.city || address.location || address.place_name);
  });

  const accuracyLevel = computed<SiteLocationAccuracyLevel>(() =>
    getAccuracyLevel(selection.value.accuracy),
  );

  const accuracyLabel = computed(() => getAccuracyLabel(selection.value.accuracy));

  const currentAccuracyLevel = computed<SiteLocationAccuracyLevel>(() =>
    getAccuracyLevel(currentPosition.value.accuracy),
  );

  const currentAccuracyLabel = computed(() =>
    getAccuracyLabel(currentPosition.value.accuracy),
  );

  const setCoordinates = (
    coordinates: SiteCoordinates,
    source: SiteLocationSource,
    accuracy: number | null = null,
  ) => {
    selection.value.coordinates = { ...coordinates };
    selection.value.source = source;
    selection.value.accuracy = accuracy;
  };

  const setAddress = (address: Partial<SiteAddressValue>, resolved = true) => {
    selection.value.address = {
      ...selection.value.address,
      ...address,
    };
    selection.value.addressResolved = resolved;
  };

  const replaceAddress = (address: SiteAddressValue, resolved = true) => {
    selection.value.address = { ...address };
    selection.value.addressResolved = resolved;
  };

  const clearCoordinates = () => {
    selection.value.coordinates = null;
    selection.value.source = 'none';
    selection.value.accuracy = null;
  };

  const requestCurrentPosition = async (): Promise<SiteCoordinates | null> => {
    geolocationError.value = null;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      geolocationStatus.value = 'error';
      geolocationError.value = {
        code: 'unsupported',
        message: 'La géolocalisation n’est pas disponible sur ce navigateur ou cet appareil.',
      };
      return null;
    }

    geolocationStatus.value = 'locating';

    return await new Promise<SiteCoordinates | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          const accuracy = position.coords.accuracy ?? null;

          currentPosition.value = {
            coordinates: { ...coordinates },
            accuracy,
          };

          // Par défaut, utiliser ma position signifie aussi sélectionner ce point
          // comme emplacement courant du site. Une recherche ultérieure pourra
          // remplacer selection sans perdre currentPosition.
          setCoordinates(coordinates, 'gps', accuracy);

          geolocationStatus.value = 'success';
          geolocationError.value = null;
          resolve(coordinates);
        },
        (error) => {
          geolocationStatus.value = 'error';
          geolocationError.value = getBrowserGeolocationError(error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 10_000,
        },
      );
    });
  };

  const reset = () => {
    selection.value = {
      coordinates: null,
      source: 'none',
      accuracy: null,
      address: emptyAddress(),
      addressResolved: false,
    };
    currentPosition.value = {
      coordinates: null,
      accuracy: null,
    };
    geolocationStatus.value = 'idle';
    geolocationError.value = null;
  };

  return {
    selection,
    currentPosition,
    geolocationStatus,
    geolocationError,
    hasCoordinates,
    hasAddress,
    isLocating,
    accuracyLevel,
    accuracyLabel,
    currentAccuracyLevel,
    currentAccuracyLabel,
    setCoordinates,
    setAddress,
    replaceAddress,
    clearCoordinates,
    requestCurrentPosition,
    reset,
  };
};
