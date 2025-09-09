<template>
  <div class="app-container">
    <h1>📌 Envoi de Mémo</h1>

    <form @submit.prevent="sendMemo">
      <input v-model="newMemo.subject" placeholder="Sujet du mémo" required />

      <select v-model="newMemo.type">
        <option value="Absence">Absence</option>
        <option value="Retard">Retard</option>
        <option value="Information">Information</option>
      </select>

      <textarea
        v-model="newMemo.message"
        placeholder="Rédiger votre mémo..."
        rows="4"
        required
      ></textarea>

      <button type="submit">Envoyer le mémo</button>
    </form>

    <div class="memo-list">
      <h2>Mémos envoyés</h2>
      <div v-if="memos.length === 0">Aucun mémo pour le moment.</div>
      <div v-for="(memo, index) in memos" :key="index" class="memo">
        <h3>{{ memo.subject }} ({{ memo.type }})</h3>
        <p>{{ memo.message }}</p>
        <small>Envoyé le {{ memo.date }}</small>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from "vue";

interface Memo {
  subject: string;
  type: string;
  message: string;
  date: string;
}

const newMemo = reactive({
  subject: "",
  type: "Absence",
  message: "",
});

const memos = ref<Memo[]>([]);

function sendMemo() {
  const now = new Date().toLocaleString();
  memos.value.unshift({
    subject: newMemo.subject,
    type: newMemo.type,
    message: newMemo.message,
    date: now,
  });

  // reset form
  newMemo.subject = "";
  newMemo.type = "Absence";
  newMemo.message = "";
}
</script>

<style scoped>
.app-container {
  background: white;
  padding: 20px;
  margin: 30px auto;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 500px;
  font-family: Arial, sans-serif;
}

h1 {
  font-size: 1.5rem;
  text-align: center;
  margin-bottom: 20px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

input,
textarea,
select,
button {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
}

button {
  background: #007bff;
  color: white;
  cursor: pointer;
  border: none;
}

button:hover {
  background: #0056b3;
}

.memo-list {
  margin-top: 20px;
}

.memo {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  background: #fafafa;
}

.memo h3 {
  margin: 0;
  font-size: 1.1rem;
}

.memo small {
  color: gray;
}
</style>
