// cloud/src/composables/useNotifications.ts
import { reactive, readonly, computed } from 'vue';

interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
    duration?: number;
    persistent?: boolean;
    timestamp: Date;
}

interface NotificationState {
    notifications: Notification[];
}

// État global partagé entre toutes les instances
const state = reactive<NotificationState>({
    notifications: []
});

let notificationId = 0;

export function useNotifications() {
    const generateId = (): string => {
        return `notification-${++notificationId}-${Date.now()}`;
    };

    const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>): string => {
        const id = generateId();
        const newNotification: Notification = {
            ...notification,
            id,
            timestamp: new Date(),
            duration: notification.duration ?? 5000,
            persistent: notification.persistent ?? false
        };

        state.notifications.push(newNotification);

        // Auto-remove après la durée spécifiée (sauf si persistent)
        if (!newNotification.persistent && newNotification.duration && newNotification.duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, newNotification.duration);
        }

        return id;
    };

    const removeNotification = (id: string): void => {
        const index = state.notifications.findIndex(n => n.id === id);
        if (index > -1) {
            state.notifications.splice(index, 1);
        }
    };

    const clearAll = (): void => {
        state.notifications.splice(0);
    };

    const removeByType = (type: Notification['type']): void => {
        state.notifications = state.notifications.filter(n => n.type !== type);
    };

    const getNotificationsByType = (type: Notification['type']) => {
        return computed(() => state.notifications.filter(n => n.type === type));
    };

    // Méthodes spécifiques par type
    const showSuccess = (message: string, title?: string, options?: Partial<Notification>): string => {
        return addNotification({
            type: 'success',
            message,
            title,
            duration: options?.duration ?? 4000,
            ...options
        });
    };

    const showError = (message: string, title?: string, options?: Partial<Notification>): string => {
        return addNotification({
            type: 'error',
            message,
            title,
            duration: options?.duration ?? 8000, // Erreurs restent plus longtemps
            persistent: options?.persistent ?? false,
            ...options
        });
    };

    const showWarning = (message: string, title?: string, options?: Partial<Notification>): string => {
        return addNotification({
            type: 'warning',
            message,
            title,
            duration: options?.duration ?? 6000,
            ...options
        });
    };

    const showInfo = (message: string, title?: string, options?: Partial<Notification>): string => {
        return addNotification({
            type: 'info',
            message,
            title,
            duration: options?.duration ?? 5000,
            ...options
        });
    };

    // Méthodes de commodité pour des cas d'usage fréquents
    const showLoadingError = (operation: string = 'opération'): string => {
        return showError(
            `Erreur lors du chargement ${operation}. Veuillez réessayer.`,
            'Erreur de chargement'
        );
    };

    const showSaveSuccess = (itemName: string = 'élément'): string => {
        return showSuccess(
            `${itemName} sauvegardé avec succès`,
            'Sauvegarde réussie'
        );
    };

    const showDeleteSuccess = (itemName: string = 'élément'): string => {
        return showSuccess(
            `${itemName} supprimé avec succès`,
            'Suppression réussie'
        );
    };

    const showNetworkError = (): string => {
        return showError(
            'Problème de connexion réseau. Vérifiez votre connexion internet.',
            'Erreur réseau',
            { persistent: true }
        );
    };

    const showValidationError = (details?: string): string => {
        const message = details
            ? `Données invalides : ${details}`
            : 'Veuillez vérifier les données saisies';

        return showError(message, 'Erreur de validation');
    };

    // Getters computed
    const hasNotifications = computed(() => state.notifications.length > 0);
    const notificationCount = computed(() => state.notifications.length);
    const hasErrors = computed(() => state.notifications.some(n => n.type === 'error'));
    const hasWarnings = computed(() => state.notifications.some(n => n.type === 'warning'));

    return {
        // État
        notifications: readonly(state.notifications),

        // Getters
        hasNotifications,
        notificationCount,
        hasErrors,
        hasWarnings,

        // Actions de base
        addNotification,
        removeNotification,
        clearAll,
        removeByType,
        getNotificationsByType,

        // Méthodes typées
        showSuccess,
        showError,
        showWarning,
        showInfo,

        // Méthodes de commodité
        showLoadingError,
        showSaveSuccess,
        showDeleteSuccess,
        showNetworkError,
        showValidationError
    };
}