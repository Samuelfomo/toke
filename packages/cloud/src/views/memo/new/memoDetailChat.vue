<template>
  <div class="flex flex-col h-full">

    <!-- Input fichier caché -->
    <input
        type="file"
        ref="fileInput"
        @change="ajouterFichiers"
        multiple
        accept=".txt,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.webm,.ogg"
        class="hidden"
    />

    <MemoChat
        :header-title="interlocuteurNom"
        :header-subtitle="getTypeLabel(memo?.type || '')"
        :header-info="memoHeaderInfo"
        :status-badge="statusBadge"
        :show-header-action="false"
        :messages="chatMessages"
        :loading="isLoading"
        loading-text="Chargement du mémo..."
        :show-input="true"
        v-model:input-text="reponseContenu"
        input-placeholder="Écrire un message..."
        :selected-files="fichiers"
        :is-recording="isRecording"
        :recording-time="recordingTime"
        :has-recording="!!audioBlob"
        :recorded-duration="recordedDuration"
        :is-preview-playing="isPreviewPlaying"
        :preview-current-time="previewCurrentTime"
        :show-audio-download="false"
        @back="$emit('back')"
        @toggle-panel="null"
        @send="envoyerReponse"
        @trigger-file-input="fileInput?.click()"
        @remove-file="supprimerFichier"
        @toggle-recording="toggleRecording"
        @remove-recording="deleteRecording"
        @toggle-preview-play="togglePreviewPlay"
        @view-image="(f: any) => voirImage(f.url)"
        @toggle-audio-play="handleToggleAudioPlay"
    >
      <template #image-preview="{ fichier }">
        <AuthenticatedMedia :url="fichier.url ?? ''" />
      </template>
    </MemoChat>

    <!-- Modal image -->
    <div v-if="imageModalUrl" class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" @click="imageModalUrl = null">
      <div class="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden" @click.stop>
        <button class="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70" @click="imageModalUrl = null">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <AuthenticatedMedia :url="imageModalUrl" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useMemoStore, type Memo } from '@/stores/memoStore';
import MemoService, { type MessageContent } from '@/service/MemoService';
import MemoChat from '../memoChat.vue';
import AuthenticatedMedia from '../AuthenticatedMedia.vue';

import {useRouter} from "vue-router";

const router = useRouter();

interface AttachedFile {
  id: string;
  nom: string;
  type: 'text' | 'image' | 'pdf' | 'audio';
  url: string;
  dateAjout: Date;
}

interface ConversationMessage {
  contenu: string;
  fichiers: AttachedFile[];
  dateEnvoi: Date;
  isFromManager: boolean;
  type: 'initial' | 'response' | 'validation';
}

interface ReponseEnvoyee {
  contenu: string;
  fichiers: File[];
  audioBlob: Blob | null;
  audioURL: string | null;
  duration: string;
  timestamp: string;
}

// ── Props & Emits ──────────────────────────────
const props = defineProps<{
  memoGuid: string;
  managerGuid: string;
}>();

const emit = defineEmits<{ 'action-done': [];'back': []; }>();

// ── Stores ─────────────────────────────────────
const userStore = useUserStore();
const memoStore = useMemoStore();
const userInitials = computed(() => userStore.userInitials || '?');

// ── State ──────────────────────────────────────
const memo = ref<Memo | null>(null);
const isLoading = ref(true);
const imageModalUrl = ref<string | null>(null);
const reponseContenu = ref('');
const fichiers = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const isSubmitting = ref(false);
const reponsesEnvoyees = ref<ReponseEnvoyee[]>([]);

// Audio recording
const isRecording = ref(false);
const mediaRecorder = ref<MediaRecorder | null>(null);
const audioChunks = ref<Blob[]>([]);
const audioBlob = ref<Blob | null>(null);
const audioURL = ref('');
const recordingTime = ref('00:00');
const recordingInterval = ref<number | null>(null);
const recordingStartTime = ref(0);
const recordedDuration = ref('00:00');

// Audio preview
const isPreviewPlaying = ref(false);
const previewCurrentTime = ref('0:00');
const previewAudio = ref<HTMLAudioElement | null>(null);

// Audio playback
const currentPlayingIndex = ref<string | null>(null);
const isPlaying = ref(false);
const audioElements = ref<Map<string, HTMLAudioElement>>(new Map());
const currentPlayingReponseId = ref<string | null>(null);
const isPlayingReponse = ref(false);
const reponseAudioElements = ref<Map<string, HTMLAudioElement>>(new Map());
const audioDurations = reactive<Record<string, number>>({});
const audioUpdateTrigger = ref(0);
const isUploadingFiles = ref(false);

// ── Computed ───────────────────────────────────
const memoCreeParlEmploye = computed(() => {
  if (!memo.value || !props.managerGuid) return false;
  return memo.value.createurId !== props.managerGuid;
});

const interlocuteurNom = computed(() => {
  if (!memo.value) return 'Employé';
  if (memo.value.createurId === props.managerGuid)
    return memo.value.destinataireNom && memo.value.destinataireNom !== 'N/A' ? memo.value.destinataireNom : 'Employé';
  return memo.value.createurNom || 'Employé';
});

const memoHeaderInfo = computed((): string => {
  if (!memo.value?.titre || memo.value.titre === 'Sans titre') return '';
  if (memo.value.type === 'other') return '';
  return formatMinutesInContent(memo.value.titre);
});

const peutEnvoyerReponse = computed(() =>
    reponseContenu.value.trim() || audioBlob.value !== null || fichiers.value.length > 0
);

const statusBadge = computed(() => {
  if (!memo.value) return undefined;
  return { value: memo.value.statut, icon: getStatutIcon(memo.value.statut), label: getStatutLabel(memo.value.statut) };
});

const conversationMessages = computed((): ConversationMessage[] => {
  if (!memo.value?.memoContent) return [];
  const messages: ConversationMessage[] = [];

  memo.value.memoContent.forEach((content) => {
    /**
     * content.user contient le GUID de l'utilisateur ayant envoyé ce bloc.
     * On compare directement avec le GUID du manager connecté.
     * - content.user === managerGuid → message du manager (aligné à droite)
     * - content.user !== managerGuid → message de l'employé (aligné à gauche)
     * Le statut "submitted" est le seul statut produit par l'employé — cohérent.
     */
    const isFromManager = content.user === props.managerGuid;

    const textMessages = formatMinutesInContent(
        content.message.filter(m => m.type === 'text').map(m => m.content).join('\n')
    );

    const files: AttachedFile[] = [];
    content.message.forEach((msg, msgIdx) => {
      if (msg.type === 'link') {
        const fileType = detectFileType(msg.content);
        if (fileType === 'audio' || fileType === 'image' || fileType === 'pdf') {
          files.push({
            id: `${content.created_at}-${msgIdx}`,
            nom: extractFileName(msg.content),
            type: fileType,
            url: msg.content,
            dateAjout: new Date(content.created_at)
          });
        }
      }
    });

    messages.push({
      contenu: textMessages,
      fichiers: files,
      dateEnvoi: new Date(content.created_at),
      isFromManager,
      type: (content as any).type as 'initial' | 'response' | 'validation'
    });
  });

  return messages.sort((a, b) => a.dateEnvoi.getTime() - b.dateEnvoi.getTime());
});

const chatMessages = computed(() => {
  const result: any[] = [];

  conversationMessages.value.forEach((msg, index) => {
    const attachments = msg.fichiers.map(f => ({
      id: f.id, nom: f.nom, name: f.nom, type: f.type, url: f.url,
      duration: getFormattedDuration(f.id)
    }));
    const metadata: any[] = [];
    if (index === 0 && memo.value?.dateIncident) {
      metadata.push({ iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: `Incident: ${formatDateShort(memo.value.dateIncident)}` });
    }
    result.push({
      id: `msg-${index}`,
      type: msg.isFromManager ? 'sent' : 'received',
      senderName: msg.isFromManager ? 'Vous (Manager)' : interlocuteurNom.value,
      senderInitials: msg.isFromManager ? userInitials.value : getInitials(interlocuteurNom.value),
      timestamp: formatDate(msg.dateEnvoi),
      content: msg.contenu || undefined,
      title: index === 0 ? memo.value?.titre : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      metadata: metadata.length > 0 ? metadata : undefined,
    });
  });

  reponsesEnvoyees.value.forEach((reponse, index) => {
    const attachments: any[] = reponse.fichiers.map(f => ({
      nom: f.name, name: f.name,
      type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('audio/') ? 'audio' : 'text'
    }));
    if (reponse.audioURL) {
      attachments.push({ id: `reponse-audio-${index}`, nom: 'Note vocale', name: 'Note vocale', type: 'audio', url: reponse.audioURL, duration: reponse.duration });
    }
    result.push({
      id: `local-${index}`, type: 'sent',
      senderName: 'Vous (Manager)', senderInitials: userInitials.value,
      timestamp: reponse.timestamp, content: reponse.contenu || undefined,
      attachments: attachments.length > 0 ? attachments : undefined
    });
  });

  return result;
});

// ── Methods ────────────────────────────────────
const chargerMemo = async () => {
  if (!props.memoGuid || !props.managerGuid) { isLoading.value = false; return; }
  isLoading.value = true;
  try {
    if (!memoStore.isCacheValid) await memoStore.loadMemos(props.managerGuid);
    const fromStore = memoStore.getMemoByGuid(props.memoGuid);
    if (fromStore) memo.value = fromStore;
    else {
      const refreshed = await memoStore.refreshMemo(props.managerGuid, props.memoGuid);
      memo.value = refreshed ?? null;
    }
  } finally {
    isLoading.value = false;
  }
};

const supprimerFichier = (index: number) => { fichiers.value.splice(index, 1); };

const ajouterFichiers = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    const total = fichiers.value.length + target.files.length + (audioBlob.value ? 1 : 0);
    if (total > 8) { alert('Maximum 8 fichiers autorisés'); return; }
    fichiers.value.push(...Array.from(target.files));
  }
  if (target) target.value = '';
};

const collectAllFiles = (): File[] => {
  const all: File[] = [...fichiers.value];
  if (audioBlob.value) all.push(new File([audioBlob.value], `audio-${Date.now()}.webm`, { type: audioBlob.value.type }));
  return all;
};

const envoyerReponse = async () => {
  if (!peutEnvoyerReponse.value || isSubmitting.value || !memo.value) return;
  isSubmitting.value = true;
  isUploadingFiles.value = true;
  try {
    const allFiles = collectAllFiles();
    const uploaded = allFiles.length > 0 ? await MemoService.uploadMultipleFiles(allFiles) : [];
    isUploadingFiles.value = false;
    const content = MemoService.buildMessageContent(reponseContenu.value, uploaded);
    await MemoService.sendReply(memo.value.guid, { user: props.managerGuid, message: content });

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    reponsesEnvoyees.value.push({
      contenu: reponseContenu.value,
      fichiers: [...fichiers.value],
      audioBlob: audioBlob.value,
      audioURL: audioBlob.value ? URL.createObjectURL(audioBlob.value) : null,
      duration: recordedDuration.value,
      timestamp: time
    });

    reponseContenu.value = '';
    fichiers.value = [];
    audioBlob.value = null;
    recordedDuration.value = '00:00';
    if (audioURL.value) { URL.revokeObjectURL(audioURL.value); audioURL.value = ''; }

    await memoStore.refreshMemo(props.managerGuid, memo.value.guid);
    await chargerMemo();
    emit('action-done');
  } catch (e: any) {
    alert(`Erreur: ${e.message || "Impossible d'envoyer"}`);
  } finally {
    isSubmitting.value = false;
    isUploadingFiles.value = false;
  }
};

const voirImage = (url: string) => { imageModalUrl.value = url; };

// ── Audio recording ────────────────────────────
const toggleRecording = async () => {
  if (isRecording.value) stopRecording();
  else await startRecording();
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.value = new MediaRecorder(stream);
    audioChunks.value = [];
    mediaRecorder.value.ondataavailable = (e) => audioChunks.value.push(e.data);
    mediaRecorder.value.onstop = () => {
      audioBlob.value = new Blob(audioChunks.value, { type: 'audio/webm' });
      audioURL.value = URL.createObjectURL(audioBlob.value);
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.value.start();
    isRecording.value = true;
    recordingStartTime.value = Date.now();
    recordingInterval.value = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTime.value) / 1000);
      recordingTime.value = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    }, 1000);
  } catch { alert("Impossible d'accéder au microphone"); }
};

const stopRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop();
    isRecording.value = false;
    if (recordingInterval.value) { clearInterval(recordingInterval.value); recordingInterval.value = null; }
    recordedDuration.value = recordingTime.value;
    recordingTime.value = '00:00';
  }
};

const deleteRecording = () => {
  if (audioURL.value) { URL.revokeObjectURL(audioURL.value); audioURL.value = ''; }
  audioBlob.value = null;
  recordedDuration.value = '00:00';
  isPreviewPlaying.value = false;
  if (previewAudio.value) { previewAudio.value.pause(); previewAudio.value = null; }
};

const togglePreviewPlay = () => {
  if (!audioURL.value) return;
  if (!previewAudio.value) previewAudio.value = new Audio(audioURL.value);
  if (isPreviewPlaying.value) {
    previewAudio.value.pause();
    isPreviewPlaying.value = false;
  } else {
    previewAudio.value.play();
    isPreviewPlaying.value = true;
    previewAudio.value.ontimeupdate = () => {
      const s = Math.floor(previewAudio.value!.currentTime);
      previewCurrentTime.value = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    previewAudio.value.onended = () => { isPreviewPlaying.value = false; previewCurrentTime.value = '0:00'; };
  }
};

const handleToggleAudioPlay = ({ messageId, url }: { messageId: string; url: string }) => {
  if (currentPlayingIndex.value === messageId && isPlaying.value) {
    audioElements.value.get(messageId)?.pause();
    isPlaying.value = false;
    return;
  }
  audioElements.value.forEach(a => a.pause());
  isPlaying.value = false;
  if (!audioElements.value.has(messageId)) {
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      audioDurations[messageId] = audio.duration;
      audioUpdateTrigger.value++;
    };
    audio.onended = () => { isPlaying.value = false; currentPlayingIndex.value = null; };
    audioElements.value.set(messageId, audio);
  }
  audioElements.value.get(messageId)!.play();
  isPlaying.value = true;
  currentPlayingIndex.value = messageId;
};

// ── Helpers ────────────────────────────────────
const getInitials = (nom: string) => {
  const p = nom.split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nom.substring(0, 2).toUpperCase();
};

const detectFileType = (url: string): 'image' | 'audio' | 'pdf' | 'text' => {
  if (url.match(/\.(m4a|mp3|wav|ogg|webm|aac)(\?.*)?$/i)) return 'audio';
  if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) return 'image';
  if (url.match(/\.pdf(\?.*)?$/i)) return 'pdf';
  return 'text';
};

const extractFileName = (url: string) => {
  try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Fichier'); }
  catch { return 'Fichier'; }
};

const formatMinutes = (n: number) => n < 60 ? `${n} min` : `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}`;
const formatMinutesInContent = (text: string) => text ? text.replace(/(\d+)\s*(minutes?|mins?|mn)/gi, (_, nb) => formatMinutes(parseInt(nb, 10))) : text;

const getTypeLabel = (type: string) => ({
  late_justification: 'Justification de retard',
  absence_justification: "Justification d'absence",
  correction_request: 'Demande de correction',
  session_closure: 'Clôture de session',
  auto_generated: 'Mémo automatique',
  other: 'Autres'
}[type] ?? type);

const getStatutLabel = (statut: string) => {
  if (statut === 'pending' || statut === 'submitted')
    return memoCreeParlEmploye.value ? 'En attente de validation' : 'En attente de réponse';
  return ({ approved: 'Approuvé', rejected: 'Rejeté', revoked: 'Révoqué', draft: 'Brouillon' }[statut] ?? statut);
};

const getStatutIcon = (statut: string) => ({ pending: '⏳', submitted: '📤', approved: '✅', rejected: '❌', revoked: '🚫', draft: '📝' }[statut] ?? '📋');

const getFormattedDuration = (fileId: string) => {
  const _ = audioUpdateTrigger.value;
  const d = audioDurations[fileId];
  if (!d || isNaN(d) || d === Infinity) return '--:--';
  return `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')}`;
};

const formatDate = (date: Date) => {
  const d = new Date(date);
  const now = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const h = `${hh}h${mm}`;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d >= today) return h;
  if (d >= yesterday) return `Hier à ${h}`;
  const mois = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
  return `${d.getDate()} ${mois[d.getMonth()]} à ${h}`;
};

const formatDateShort = (date: Date) => {
  const d = new Date(date);
  const mois = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
  return `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()} à ${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`;
};

// ── Lifecycle ──────────────────────────────────
onMounted(() => { chargerMemo(); });

// Recharger si le guid change (sélection d'un autre mémo)
watch(() => props.memoGuid, () => {
  memo.value = null;
  reponsesEnvoyees.value = [];
  reponseContenu.value = '';
  fichiers.value = [];
  chargerMemo();
});

onUnmounted(() => {
  audioElements.value.forEach(a => a.pause());
  reponseAudioElements.value.forEach(a => a.pause());
  if (audioURL.value) URL.revokeObjectURL(audioURL.value);
});
</script>

<!--<template>-->
<!--  <div class="flex flex-col h-full">-->

<!--    &lt;!&ndash; Input fichier caché &ndash;&gt;-->
<!--    <input-->
<!--      type="file"-->
<!--      ref="fileInput"-->
<!--      @change="ajouterFichiers"-->
<!--      multiple-->
<!--      accept=".txt,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.webm,.ogg"-->
<!--      class="hidden"-->
<!--    />-->

<!--    <MemoChat-->
<!--      :header-title="interlocuteurNom"-->
<!--      :header-subtitle="getTypeLabel(memo?.type || '')"-->
<!--      :header-info="memoHeaderInfo"-->
<!--      :status-badge="statusBadge"-->
<!--      :show-header-action="false"-->
<!--      :messages="chatMessages"-->
<!--      :loading="isLoading"-->
<!--      loading-text="Chargement du mémo..."-->
<!--      :show-input="true"-->
<!--      v-model:input-text="reponseContenu"-->
<!--      input-placeholder="Écrire un message..."-->
<!--      :selected-files="fichiers"-->
<!--      :is-recording="isRecording"-->
<!--      :recording-time="recordingTime"-->
<!--      :has-recording="!!audioBlob"-->
<!--      :recorded-duration="recordedDuration"-->
<!--      :is-preview-playing="isPreviewPlaying"-->
<!--      :preview-current-time="previewCurrentTime"-->
<!--      :show-audio-download="false"-->
<!--      @back="null"-->
<!--      @toggle-panel="null"-->
<!--      @send="envoyerReponse"-->
<!--      @trigger-file-input="fileInput?.click()"-->
<!--      @remove-file="supprimerFichier"-->
<!--      @toggle-recording="toggleRecording"-->
<!--      @remove-recording="deleteRecording"-->
<!--      @toggle-preview-play="togglePreviewPlay"-->
<!--      @view-image="(f: any) => voirImage(f.url)"-->
<!--      @toggle-audio-play="handleToggleAudioPlay as any"-->
<!--    >-->
<!--      <template #image-preview="{ fichier }">-->
<!--        <AuthenticatedMedia :url="fichier.url ?? ''" />-->
<!--      </template>-->
<!--    </MemoChat>-->

<!--    &lt;!&ndash; Modal image &ndash;&gt;-->
<!--    <div v-if="imageModalUrl" class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" @click="imageModalUrl = null">-->
<!--      <div class="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden" @click.stop>-->
<!--        <button class="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70" @click="imageModalUrl = null">-->
<!--          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>-->
<!--          </svg>-->
<!--        </button>-->
<!--        <AuthenticatedMedia :url="imageModalUrl" />-->
<!--      </div>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';-->
<!--import { useUserStore } from '@/stores/userStore';-->
<!--import { useMemoStore, type Memo } from '@/stores/memoStore';-->
<!--import MemoService, { type MessageContent } from '@/service/MemoService';-->
<!--import MemoChat from '../memoChat.vue';-->
<!--import AuthenticatedMedia from '../AuthenticatedMedia.vue';-->

<!--interface AttachedFile {-->
<!--  id: string;-->
<!--  nom: string;-->
<!--  type: 'text' | 'image' | 'pdf' | 'audio';-->
<!--  url: string;-->
<!--  dateAjout: Date;-->
<!--}-->

<!--interface ConversationMessage {-->
<!--  contenu: string;-->
<!--  fichiers: AttachedFile[];-->
<!--  dateEnvoi: Date;-->
<!--  isFromManager: boolean;-->
<!--  type: 'initial' | 'response' | 'validation';-->
<!--}-->

<!--interface ReponseEnvoyee {-->
<!--  contenu: string;-->
<!--  fichiers: File[];-->
<!--  audioBlob: Blob | null;-->
<!--  audioURL: string | null;-->
<!--  duration: string;-->
<!--  timestamp: string;-->
<!--}-->

<!--// ── Props & Emits ──────────────────────────────-->
<!--const props = defineProps<{-->
<!--  memoGuid: string;-->
<!--  managerGuid: string;-->
<!--}>();-->

<!--const emit = defineEmits<{ 'action-done': [] }>();-->

<!--// ── Stores ─────────────────────────────────────-->
<!--const userStore = useUserStore();-->
<!--const memoStore = useMemoStore();-->
<!--const userInitials = computed(() => userStore.userInitials || '?');-->

<!--// ── State ──────────────────────────────────────-->
<!--const memo = ref<Memo | null>(null);-->
<!--const isLoading = ref(true);-->
<!--const imageModalUrl = ref<string | null>(null);-->
<!--const reponseContenu = ref('');-->
<!--const fichiers = ref<File[]>([]);-->
<!--const fileInput = ref<HTMLInputElement | null>(null);-->
<!--const isSubmitting = ref(false);-->
<!--const reponsesEnvoyees = ref<ReponseEnvoyee[]>([]);-->

<!--// Audio recording-->
<!--const isRecording = ref(false);-->
<!--const mediaRecorder = ref<MediaRecorder | null>(null);-->
<!--const audioChunks = ref<Blob[]>([]);-->
<!--const audioBlob = ref<Blob | null>(null);-->
<!--const audioURL = ref('');-->
<!--const recordingTime = ref('00:00');-->
<!--const recordingInterval = ref<number | null>(null);-->
<!--const recordingStartTime = ref(0);-->
<!--const recordedDuration = ref('00:00');-->

<!--// Audio preview-->
<!--const isPreviewPlaying = ref(false);-->
<!--const previewCurrentTime = ref('0:00');-->
<!--const previewAudio = ref<HTMLAudioElement | null>(null);-->

<!--// Audio playback-->
<!--const currentPlayingIndex = ref<string | null>(null);-->
<!--const isPlaying = ref(false);-->
<!--const audioElements = ref<Map<string, HTMLAudioElement>>(new Map());-->
<!--const currentPlayingReponseId = ref<string | null>(null);-->
<!--const isPlayingReponse = ref(false);-->
<!--const reponseAudioElements = ref<Map<string, HTMLAudioElement>>(new Map());-->
<!--const audioDurations = reactive<Record<string, number>>({});-->
<!--const audioUpdateTrigger = ref(0);-->
<!--const isUploadingFiles = ref(false);-->

<!--// ── Computed ───────────────────────────────────-->
<!--const memoCreeParlEmploye = computed(() => {-->
<!--  if (!memo.value || !props.managerGuid) return false;-->
<!--  return memo.value.createurId !== props.managerGuid;-->
<!--});-->

<!--const interlocuteurNom = computed(() => {-->
<!--  if (!memo.value) return 'Employé';-->
<!--  if (memo.value.createurId === props.managerGuid)-->
<!--    return memo.value.destinataireNom && memo.value.destinataireNom !== 'N/A' ? memo.value.destinataireNom : 'Employé';-->
<!--  return memo.value.createurNom || 'Employé';-->
<!--});-->

<!--const memoHeaderInfo = computed((): string => {-->
<!--  if (!memo.value?.titre || memo.value.titre === 'Sans titre') return '';-->
<!--  if (memo.value.type === 'other') return '';-->
<!--  return formatMinutesInContent(memo.value.titre);-->
<!--});-->

<!--const peutEnvoyerReponse = computed(() =>-->
<!--  reponseContenu.value.trim() || audioBlob.value !== null || fichiers.value.length > 0-->
<!--);-->

<!--const statusBadge = computed(() => {-->
<!--  if (!memo.value) return undefined;-->
<!--  return { value: memo.value.statut, icon: getStatutIcon(memo.value.statut), label: getStatutLabel(memo.value.statut) };-->
<!--});-->

<!--// const conversationMessages = computed((): ConversationMessage[] => {-->
<!--//   if (!memo.value?.memoContent) return [];-->
<!--//   const messages: ConversationMessage[] = [];-->
<!--//-->
<!--//   memo.value.memoContent.forEach((content) => {-->
<!--//     const authorUser = content.user;-->
<!--//     const auteurEmployee = memoStore.employees.find(e => e.guid === memo.value!.createurId);-->
<!--//     const destinataireEmployee = memoStore.employees.find(e => e.guid === memo.value!.destinataireId);-->
<!--//     const auteurEmail = auteurEmployee?.email ?? '';-->
<!--//     const destinataireEmail = destinataireEmployee?.email ?? '';-->
<!--//-->
<!--//     let isFromManager: boolean;-->
<!--//     if ((content as any).type === 'validation') isFromManager = true;-->
<!--//     else if (destinataireEmail && authorUser === destinataireEmail) isFromManager = true;-->
<!--//     else if (auteurEmail && authorUser === auteurEmail) isFromManager = false;-->
<!--//     else if ((content as any).type === 'initial') isFromManager = false;-->
<!--//     else isFromManager = true;-->
<!--//-->
<!--//     const textMessages = formatMinutesInContent(-->
<!--//       content.message.filter(m => m.type === 'text').map(m => m.content).join('\n')-->
<!--//     );-->
<!--//-->
<!--//     const files: AttachedFile[] = [];-->
<!--//     content.message.forEach((msg, msgIdx) => {-->
<!--//       if (msg.type === 'link') {-->
<!--//         const fileType = detectFileType(msg.content);-->
<!--//         if (fileType === 'audio' || fileType === 'image' || fileType === 'pdf') {-->
<!--//           files.push({-->
<!--//             id: `${content.created_at}-${msgIdx}`,-->
<!--//             nom: extractFileName(msg.content),-->
<!--//             type: fileType,-->
<!--//             url: msg.content,-->
<!--//             dateAjout: new Date(content.created_at)-->
<!--//           });-->
<!--//         }-->
<!--//       }-->
<!--//     });-->
<!--//-->
<!--//     messages.push({-->
<!--//       contenu: textMessages,-->
<!--//       fichiers: files,-->
<!--//       dateEnvoi: new Date(content.created_at),-->
<!--//       isFromManager,-->
<!--//       type: (content as any).type as 'initial' | 'response' | 'validation'-->
<!--//     });-->
<!--//   });-->
<!--//-->
<!--//   return messages.sort((a, b) => a.dateEnvoi.getTime() - b.dateEnvoi.getTime());-->
<!--// });-->

<!--const conversationMessages = computed((): ConversationMessage[] => {-->
<!--  if (!memo.value?.memoContent) return [];-->

<!--  const messages: ConversationMessage[] = [];-->

<!--  memo.value.memoContent.forEach((content) => {-->
<!--    const authorGuid = content.user;-->
<!--    const managerGuid = props.managerGuid;-->

<!--    // 🔥 Détermination fiable de l'auteur-->
<!--    const isFromManager =-->
<!--        (content as any).type === 'validation' || authorGuid === managerGuid;-->

<!--    // 📝 Texte-->
<!--    const textMessages = formatMinutesInContent(-->
<!--        content.message-->
<!--            .filter(m => m.type === 'text')-->
<!--            .map(m => m.content)-->
<!--            .join('\n')-->
<!--    );-->

<!--    // 📎 Fichiers-->
<!--    const files: AttachedFile[] = [];-->

<!--    content.message.forEach((msg, msgIdx) => {-->
<!--      if (msg.type === 'link') {-->
<!--        const fileType = detectFileType(msg.content);-->

<!--        if (fileType === 'audio' || fileType === 'image' || fileType === 'pdf') {-->
<!--          files.push({-->
<!--            id: `${content.created_at}-${msgIdx}`,-->
<!--            nom: extractFileName(msg.content),-->
<!--            type: fileType,-->
<!--            url: msg.content,-->
<!--            dateAjout: new Date(content.created_at)-->
<!--          });-->
<!--        }-->
<!--      }-->
<!--    });-->

<!--    // 📦 Push message-->
<!--    messages.push({-->
<!--      contenu: textMessages,-->
<!--      fichiers: files,-->
<!--      dateEnvoi: new Date(content.created_at),-->
<!--      isFromManager,-->
<!--      type: (content as any).type as 'initial' | 'response' | 'validation'-->
<!--    });-->
<!--  });-->

<!--  // ⏱️ Tri chronologique-->
<!--  return messages.sort(-->
<!--      (a, b) => a.dateEnvoi.getTime() - b.dateEnvoi.getTime()-->
<!--  );-->
<!--});-->

<!--const chatMessages = computed(() => {-->
<!--  const result: any[] = [];-->

<!--  conversationMessages.value.forEach((msg, index) => {-->
<!--    const attachments = msg.fichiers.map(f => ({-->
<!--      id: f.id, nom: f.nom, name: f.nom, type: f.type, url: f.url,-->
<!--      duration: getFormattedDuration(f.id)-->
<!--    }));-->
<!--    const metadata: any[] = [];-->
<!--    if (index === 0 && memo.value?.dateIncident) {-->
<!--      metadata.push({ iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: `Incident: ${formatDateShort(memo.value.dateIncident)}` });-->
<!--    }-->
<!--    result.push({-->
<!--      id: `msg-${index}`,-->
<!--      type: msg.isFromManager ? 'sent' : 'received',-->
<!--      senderName: msg.isFromManager ? 'Vous (Manager)' : interlocuteurNom.value,-->
<!--      senderInitials: msg.isFromManager ? userInitials.value : getInitials(interlocuteurNom.value),-->
<!--      timestamp: formatDate(msg.dateEnvoi),-->
<!--      content: msg.contenu || undefined,-->
<!--      title: index === 0 ? memo.value?.titre : undefined,-->
<!--      attachments: attachments.length > 0 ? attachments : undefined,-->
<!--      metadata: metadata.length > 0 ? metadata : undefined,-->
<!--    });-->
<!--  });-->

<!--  reponsesEnvoyees.value.forEach((reponse, index) => {-->
<!--    const attachments: any[] = reponse.fichiers.map(f => ({-->
<!--      nom: f.name, name: f.name,-->
<!--      type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('audio/') ? 'audio' : 'text'-->
<!--    }));-->
<!--    if (reponse.audioURL) {-->
<!--      attachments.push({ id: `reponse-audio-${index}`, nom: 'Note vocale', name: 'Note vocale', type: 'audio', url: reponse.audioURL, duration: reponse.duration });-->
<!--    }-->
<!--    result.push({-->
<!--      id: `local-${index}`, type: 'sent',-->
<!--      senderName: 'Vous (Manager)', senderInitials: userInitials.value,-->
<!--      timestamp: reponse.timestamp, content: reponse.contenu || undefined,-->
<!--      attachments: attachments.length > 0 ? attachments : undefined-->
<!--    });-->
<!--  });-->

<!--  return result;-->
<!--});-->

<!--// ── Methods ────────────────────────────────────-->
<!--const chargerMemo = async () => {-->
<!--  if (!props.memoGuid || !props.managerGuid) { isLoading.value = false; return; }-->
<!--  isLoading.value = true;-->
<!--  try {-->
<!--    if (!memoStore.isCacheValid) await memoStore.loadMemos(props.managerGuid);-->
<!--    const fromStore = memoStore.getMemoByGuid(props.memoGuid);-->
<!--    if (fromStore) memo.value = fromStore;-->
<!--    else {-->
<!--      const refreshed = await memoStore.refreshMemo(props.managerGuid, props.memoGuid);-->
<!--      memo.value = refreshed ?? null;-->
<!--    }-->
<!--  } finally {-->
<!--    isLoading.value = false;-->
<!--  }-->
<!--};-->

<!--const supprimerFichier = (index: number) => { fichiers.value.splice(index, 1); };-->

<!--const ajouterFichiers = (event: Event) => {-->
<!--  const target = event.target as HTMLInputElement;-->
<!--  if (target.files) {-->
<!--    const total = fichiers.value.length + target.files.length + (audioBlob.value ? 1 : 0);-->
<!--    if (total > 8) { alert('Maximum 8 fichiers autorisés'); return; }-->
<!--    fichiers.value.push(...Array.from(target.files));-->
<!--  }-->
<!--  if (target) target.value = '';-->
<!--};-->

<!--const collectAllFiles = (): File[] => {-->
<!--  const all: File[] = [...fichiers.value];-->
<!--  if (audioBlob.value) all.push(new File([audioBlob.value], `audio-${Date.now()}.webm`, { type: audioBlob.value.type }));-->
<!--  return all;-->
<!--};-->

<!--const envoyerReponse = async () => {-->
<!--  if (!peutEnvoyerReponse.value || isSubmitting.value || !memo.value) return;-->
<!--  isSubmitting.value = true;-->
<!--  isUploadingFiles.value = true;-->
<!--  try {-->
<!--    const allFiles = collectAllFiles();-->
<!--    const uploaded = allFiles.length > 0 ? await MemoService.uploadMultipleFiles(allFiles) : [];-->
<!--    isUploadingFiles.value = false;-->
<!--    const content = MemoService.buildMessageContent(reponseContenu.value, uploaded);-->
<!--    await MemoService.sendReply(memo.value.guid, { user: props.managerGuid, message: content });-->

<!--    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });-->
<!--    reponsesEnvoyees.value.push({-->
<!--      contenu: reponseContenu.value,-->
<!--      fichiers: [...fichiers.value],-->
<!--      audioBlob: audioBlob.value,-->
<!--      audioURL: audioBlob.value ? URL.createObjectURL(audioBlob.value) : null,-->
<!--      duration: recordedDuration.value,-->
<!--      timestamp: time-->
<!--    });-->

<!--    reponseContenu.value = '';-->
<!--    fichiers.value = [];-->
<!--    audioBlob.value = null;-->
<!--    recordedDuration.value = '00:00';-->
<!--    if (audioURL.value) { URL.revokeObjectURL(audioURL.value); audioURL.value = ''; }-->

<!--    await memoStore.refreshMemo(props.managerGuid, memo.value.guid);-->
<!--    await chargerMemo();-->
<!--    emit('action-done');-->
<!--  } catch (e: any) {-->
<!--    alert(`Erreur: ${e.message || "Impossible d'envoyer"}`);-->
<!--  } finally {-->
<!--    isSubmitting.value = false;-->
<!--    isUploadingFiles.value = false;-->
<!--  }-->
<!--};-->

<!--const voirImage = (url: string) => { imageModalUrl.value = url; };-->

<!--// ── Audio recording ────────────────────────────-->
<!--const toggleRecording = async () => {-->
<!--  if (isRecording.value) stopRecording();-->
<!--  else await startRecording();-->
<!--};-->

<!--const startRecording = async () => {-->
<!--  try {-->
<!--    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });-->
<!--    mediaRecorder.value = new MediaRecorder(stream);-->
<!--    audioChunks.value = [];-->
<!--    mediaRecorder.value.ondataavailable = (e) => audioChunks.value.push(e.data);-->
<!--    mediaRecorder.value.onstop = () => {-->
<!--      audioBlob.value = new Blob(audioChunks.value, { type: 'audio/webm' });-->
<!--      audioURL.value = URL.createObjectURL(audioBlob.value);-->
<!--      stream.getTracks().forEach(t => t.stop());-->
<!--    };-->
<!--    mediaRecorder.value.start();-->
<!--    isRecording.value = true;-->
<!--    recordingStartTime.value = Date.now();-->
<!--    recordingInterval.value = window.setInterval(() => {-->
<!--      const elapsed = Math.floor((Date.now() - recordingStartTime.value) / 1000);-->
<!--      recordingTime.value = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;-->
<!--    }, 1000);-->
<!--  } catch { alert("Impossible d'accéder au microphone"); }-->
<!--};-->

<!--const stopRecording = () => {-->
<!--  if (mediaRecorder.value && isRecording.value) {-->
<!--    mediaRecorder.value.stop();-->
<!--    isRecording.value = false;-->
<!--    if (recordingInterval.value) { clearInterval(recordingInterval.value); recordingInterval.value = null; }-->
<!--    recordedDuration.value = recordingTime.value;-->
<!--    recordingTime.value = '00:00';-->
<!--  }-->
<!--};-->

<!--const deleteRecording = () => {-->
<!--  if (audioURL.value) { URL.revokeObjectURL(audioURL.value); audioURL.value = ''; }-->
<!--  audioBlob.value = null;-->
<!--  recordedDuration.value = '00:00';-->
<!--  isPreviewPlaying.value = false;-->
<!--  if (previewAudio.value) { previewAudio.value.pause(); previewAudio.value = null; }-->
<!--};-->

<!--const togglePreviewPlay = () => {-->
<!--  if (!audioURL.value) return;-->
<!--  if (!previewAudio.value) previewAudio.value = new Audio(audioURL.value);-->
<!--  if (isPreviewPlaying.value) {-->
<!--    previewAudio.value.pause();-->
<!--    isPreviewPlaying.value = false;-->
<!--  } else {-->
<!--    previewAudio.value.play();-->
<!--    isPreviewPlaying.value = true;-->
<!--    previewAudio.value.ontimeupdate = () => {-->
<!--      const s = Math.floor(previewAudio.value!.currentTime);-->
<!--      previewCurrentTime.value = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;-->
<!--    };-->
<!--    previewAudio.value.onended = () => { isPreviewPlaying.value = false; previewCurrentTime.value = '0:00'; };-->
<!--  }-->
<!--};-->

<!--const handleToggleAudioPlay = ({ messageId, url }: { messageId: string; url: string }) => {-->
<!--  if (currentPlayingIndex.value === messageId && isPlaying.value) {-->
<!--    audioElements.value.get(messageId)?.pause();-->
<!--    isPlaying.value = false;-->
<!--    return;-->
<!--  }-->
<!--  audioElements.value.forEach(a => a.pause());-->
<!--  isPlaying.value = false;-->
<!--  if (!audioElements.value.has(messageId)) {-->
<!--    const audio = new Audio(url);-->
<!--    audio.onloadedmetadata = () => {-->
<!--      audioDurations[messageId] = audio.duration;-->
<!--      audioUpdateTrigger.value++;-->
<!--    };-->
<!--    audio.onended = () => { isPlaying.value = false; currentPlayingIndex.value = null; };-->
<!--    audioElements.value.set(messageId, audio);-->
<!--  }-->
<!--  audioElements.value.get(messageId)!.play();-->
<!--  isPlaying.value = true;-->
<!--  currentPlayingIndex.value = messageId;-->
<!--};-->

<!--// ── Helpers ────────────────────────────────────-->
<!--const getInitials = (nom: string) => {-->
<!--  const p = nom.split(' ');-->
<!--  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nom.substring(0, 2).toUpperCase();-->
<!--};-->

<!--const detectFileType = (url: string): 'image' | 'audio' | 'pdf' | 'text' => {-->
<!--  if (url.match(/\.(m4a|mp3|wav|ogg|webm|aac)(\?.*)?$/i)) return 'audio';-->
<!--  if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) return 'image';-->
<!--  if (url.match(/\.pdf(\?.*)?$/i)) return 'pdf';-->
<!--  return 'text';-->
<!--};-->

<!--const extractFileName = (url: string) => {-->
<!--  try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Fichier'); }-->
<!--  catch { return 'Fichier'; }-->
<!--};-->

<!--const formatMinutes = (n: number) => n < 60 ? `${n} min` : `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}`;-->
<!--const formatMinutesInContent = (text: string) => text ? text.replace(/(\d+)\s*(minutes?|mins?|mn)/gi, (_, nb) => formatMinutes(parseInt(nb, 10))) : text;-->

<!--const getTypeLabel = (type: string) => ({-->
<!--  late_justification: 'Justification de retard',-->
<!--  absence_justification: "Justification d'absence",-->
<!--  correction_request: 'Demande de correction',-->
<!--  session_closure: 'Clôture de session',-->
<!--  auto_generated: 'Mémo automatique',-->
<!--  other: 'Autres'-->
<!--}[type] ?? type);-->

<!--const getStatutLabel = (statut: string) => {-->
<!--  if (statut === 'pending' || statut === 'submitted')-->
<!--    return memoCreeParlEmploye.value ? 'En attente de validation' : 'En attente de réponse';-->
<!--  return ({ approved: 'Approuvé', rejected: 'Rejeté', revoked: 'Révoqué', draft: 'Brouillon' }[statut] ?? statut);-->
<!--};-->

<!--const getStatutIcon = (statut: string) => ({ pending: '⏳', submitted: '📤', approved: '✅', rejected: '❌', revoked: '🚫', draft: '📝' }[statut] ?? '📋');-->

<!--const getFormattedDuration = (fileId: string) => {-->
<!--  const _ = audioUpdateTrigger.value;-->
<!--  const d = audioDurations[fileId];-->
<!--  if (!d || isNaN(d) || d === Infinity) return '&#45;&#45;:&#45;&#45;';-->
<!--  return `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')}`;-->
<!--};-->

<!--const formatDate = (date: Date) => {-->
<!--  const d = new Date(date);-->
<!--  const now = new Date();-->
<!--  const hh = String(d.getHours()).padStart(2, '0');-->
<!--  const mm = String(d.getMinutes()).padStart(2, '0');-->
<!--  const h = `${hh}h${mm}`;-->
<!--  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());-->
<!--  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);-->
<!--  if (d >= today) return h;-->
<!--  if (d >= yesterday) return `Hier à ${h}`;-->
<!--  const mois = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];-->
<!--  return `${d.getDate()} ${mois[d.getMonth()]} à ${h}`;-->
<!--};-->

<!--const formatDateShort = (date: Date) => {-->
<!--  const d = new Date(date);-->
<!--  const mois = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];-->
<!--  return `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()} à ${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`;-->
<!--};-->

<!--// ── Lifecycle ──────────────────────────────────-->
<!--onMounted(() => { chargerMemo(); });-->

<!--// Recharger si le guid change (sélection d'un autre mémo)-->
<!--watch(() => props.memoGuid, () => {-->
<!--  memo.value = null;-->
<!--  reponsesEnvoyees.value = [];-->
<!--  reponseContenu.value = '';-->
<!--  fichiers.value = [];-->
<!--  chargerMemo();-->
<!--});-->

<!--onUnmounted(() => {-->
<!--  audioElements.value.forEach(a => a.pause());-->
<!--  reponseAudioElements.value.forEach(a => a.pause());-->
<!--  if (audioURL.value) URL.revokeObjectURL(audioURL.value);-->
<!--});-->
<!--</script>-->
