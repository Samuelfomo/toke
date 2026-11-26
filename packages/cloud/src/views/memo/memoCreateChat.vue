<template>
  <MemoChat :header-title="draft ? 'Modifier le brouillon' : 'Nouveau mémo'"
            :show-header-action="false" :show-input="false" @back="$emit('cancel')">
    <template #memo-details>
      <form class="mx-auto flex max-w-xl flex-col gap-4 rounded-xl bg-white p-4" @submit.prevent="enregistrer">
        <div v-if="!draft" class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-1 text-sm font-medium">
            Destinataire
            <select v-model="formulaire.destinataireId" class="rounded-md border border-gray-300 p-2"
                    required :disabled="chargement || isSubmitting">
              <option value="" disabled>{{ chargement ? 'Chargement…' : 'Choisir un collaborateur' }}</option>
              <option v-for="person in employes" :key="person.guid" :value="person.guid">
                {{ [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Collaborateur sans nom' }}
              </option>
            </select>
          </label>
          <label class="grid gap-1 text-sm font-medium">
            Type de mémo
            <select v-model="formulaire.type" class="rounded-md border border-gray-300 p-2"
                    required :disabled="isSubmitting" @change="definirTitre">
              <option value="" disabled>Sélectionner un type</option>
              <option v-for="(label, type) in memoTitles" :key="type" :value="type">{{ label }}</option>
            </select>
          </label>
        </div>
        <p v-if="!draft && !chargement && !employes.length && !erreur" class="text-sm text-gray-600">
          Aucun destinataire autorisé.
        </p>
        <label class="grid gap-1 text-sm font-medium">
          Titre
          <input v-model="formulaire.titre" class="rounded-md border border-gray-300 p-2"
                 required maxlength="200" :disabled="isSubmitting">
        </label>
        <label class="grid gap-1 text-sm font-medium">
          Message
          <textarea v-model="formulaire.contenu" class="rounded-md border border-gray-300 p-2"
                    required maxlength="3000" rows="6" :disabled="isSubmitting"></textarea>
        </label>
        <p v-if="erreur" role="alert" class="text-sm text-red-700">{{ erreur }}
          <button v-if="erreurDestinataires" type="button" class="underline" @click="chargerEmployes">Réessayer</button>
        </p>
        <button type="submit" :disabled="!peutEnregistrer || isSubmitting"
                class="self-end rounded-lg bg-[#004aad] px-4 py-2 font-semibold text-white disabled:opacity-50">
          {{ isSubmitting ? 'Enregistrement…' : 'Enregistrer le brouillon' }}
        </button>
      </form>
    </template>
  </MemoChat>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import MemoService, { type MemoCommand, type MemoRecipient } from '@/service/MemoService';
import { useMemoStore, type Memo } from '@/stores/memoStore';
import { memoReadErrorMessage } from '@/utils/memoReadError';
import MemoChat from './memoChat.vue';

const props = defineProps<{ preselectedEmployeeGuid?: string; draft?: Memo }>();
const emit = defineEmits<{ created: [memoGuid: string]; cancel: [] }>();
const memoStore = useMemoStore();
const session = memoStore.sessionKey;
let disposed = false;
const current = () => !disposed && session === memoStore.sessionKey;
onUnmounted(() => { disposed = true; });

const memoTitles = {
  delay_justification: 'Justification de retard',
  absence_justification: 'Justification d’absence',
  other: 'Autre',
};
const formulaire = ref({
  destinataireId: '',
  type: '',
  titre: props.draft?.originalTitle ?? '',
  contenu: props.draft?.memoContent?.[0]?.message?.filter(message => message.type === 'text')
    .map(message => message.content).join('\n') ?? '',
});
const employes = ref<MemoRecipient[]>([]);
const chargement = ref(false);
const isSubmitting = ref(false);
const erreur = ref('');
const erreurDestinataires = ref(false);
const peutEnregistrer = computed(() => Boolean(formulaire.value.titre.trim() && formulaire.value.contenu.trim() &&
  (props.draft || (formulaire.value.type && formulaire.value.destinataireId))));
const definirTitre = () => {
  const type = formulaire.value.type as keyof typeof memoTitles;
  formulaire.value.titre = type === 'other' ? '' : memoTitles[type];
};

async function chargerEmployes() {
  chargement.value = true;
  erreurDestinataires.value = false;
  erreur.value = '';
  try {
    const recipients = await MemoService.recipients();
    if (!current()) return;
    employes.value = recipients;
    if (recipients.some(person => person.guid === props.preselectedEmployeeGuid))
      formulaire.value.destinataireId = props.preselectedEmployeeGuid!;
  } catch (error) {
    if (!current()) return;
    erreurDestinataires.value = true;
    erreur.value = memoReadErrorMessage(error, 'Impossible de charger les destinataires.');
  } finally {
    if (current()) chargement.value = false;
  }
}
onMounted(() => { if (!props.draft) void chargerEmployes(); });

let lastAttempt: { payload: string; id: string } | undefined;
async function enregistrer() {
  if (!peutEnregistrer.value || isSubmitting.value || !current()) return;
  const { titre: title, contenu: text, type, destinataireId: targetGuid } = formulaire.value;
  const command: MemoCommand = props.draft
    ? { action: 'EDIT', guid: props.draft.guid, version: props.draft.version ?? null, title, text }
    : { action: 'CREATE', targetGuid, type, title, text };
  const payload = JSON.stringify(command);
  if (lastAttempt?.payload !== payload) lastAttempt = { payload, id: crypto.randomUUID() };
  isSubmitting.value = true;
  erreur.value = '';
  try {
    const result = await MemoService.command(command, lastAttempt.id);
    if (current()) emit('created', result.guid);
  } catch (error) {
    if (current()) erreur.value = memoReadErrorMessage(error, 'Impossible d’enregistrer le brouillon.');
  } finally {
    if (current()) isSubmitting.value = false;
  }
}
</script>
