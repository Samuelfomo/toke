<template>
  <div class="employee-memos-page">
    <!-- Header -->
    <div class="page-header">
      <button @click="goBack" class="back-btn">⬅ Retour</button>
      <h1>Mémos de l'employé</h1>
    </div>

    <!-- Composant réutilisable MemoList -->
    <Memo
        :memos="employeeMemos"
        :is-loading="memoStore.isLoading"
        :error="errorMessage"
        empty-title="Aucun mémo trouvé"
        empty-description="Cet employé n'a pas encore de mémo"
        :show-employee-filter="false"
        :on-retry="loadEmployeeMemos"
        @memo-click="handleMemoClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMemoStore } from '@/stores/memoStore'
import { useUserStore } from '@/stores/userStore'
import Memo from '../memo/memo.vue'

const route = useRoute()
const router = useRouter()

const memoStore = useMemoStore()
const userStore = useUserStore()

const employeeGuid = route.params.id as string
const errorMessage = ref('')

// ============ COMPUTED ============
const employeeMemos = computed(() => {
  const memosEmp = memoStore.getMemosByEmployee(employeeGuid)
  console.log('Filtered memos for', employeeGuid, memosEmp)
  return memosEmp
})

// ============ METHODS ============
const loadEmployeeMemos = async () => {
  try {
    errorMessage.value = ''
    console.log('manager guid =', userStore.user?.guid)

    if (!userStore.user?.guid) {
      errorMessage.value = 'Utilisateur non connecté'
      return
    }

    await memoStore.loadMemos(userStore.user.guid, true)

    console.log('memos store =', memoStore.memos)
    console.log('employee guid =', employeeGuid)
    console.log('filtered =', memoStore.getMemosByEmployee(employeeGuid))
  } catch (error) {
    console.error('Erreur lors du chargement des mémos:', error)
    errorMessage.value = 'Impossible de charger les mémos'
  }
}

const handleMemoClick = (memo: any) => {
  router.push({
    name: 'memoDetails',
    params: { guid: memo.guid }
  })
}

const goBack = () => router.back()

// ============ LIFECYCLE ============
onMounted(async () => {
  await loadEmployeeMemos()
})
</script>

<style scoped>
.employee-memos-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.back-btn {
  padding: 10px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.back-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateX(-2px);
}
</style>