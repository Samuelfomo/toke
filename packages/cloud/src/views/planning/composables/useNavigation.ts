import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { NAV_GROUPS } from './Navigation'

export function useNavigation() {
    const route = useRoute()

    const activeItemId = computed(() => route.name as string)

    const activeGroup = computed(() => {
        for (const group of NAV_GROUPS) {
            const found = group.items.find((item) => item.routeName === activeItemId.value)
            if (found) return group.id
        }
        return null
    })

    const isActive = (routeName: string) => activeItemId.value === routeName

    return {
        NAV_GROUPS,
        activeItemId,
        activeGroup,
        isActive,
    }
}