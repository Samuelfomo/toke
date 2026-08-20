<template>
  <div class="min-h-screen bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7] font-['Sora',sans-serif]">
    <Header/>

    <main class="max-w-[1400px] mx-auto px-6 py-8">

      <!-- ══ Page Header ════════════════════════════════════════════ -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <button
              @click="router.back()"
              class="w-9 h-9 flex items-center justify-center rounded-xl bg-white/70 border border-white/60 text-slate-500 hover:bg-white hover:text-slate-800 transition-colors shadow-sm"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
              {{ isEditMode ? 'Modifier un employé' : 'Ajouter un employé' }}
            </h1>
            <p class="text-sm text-slate-500 mt-0.5">
              {{
                isEditMode ? 'Mettez à jour les informations du compte employé.' : 'Créez un nouveau compte employé et envoyez-lui une invitation.'
              }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
              @click="router.back()"
              class="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white/70 border border-white/60 rounded-xl hover:bg-white shadow-sm transition-colors"
          >
            Annuler
          </button>
          <button
              @click="handleSubmit"
              :disabled="isSubmitting || !isFormValid"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004AAD] hover:bg-[#003a8c] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#004AAD]/20 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <svg v-if="isSubmitting" class="animate-spin" width="15" height="15" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {{ isSubmitting ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </div>

      <div
          v-if="submitError"
          role="alert"
          aria-live="assertive"
          class="mb-6 flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm"
      >
        <svg width="16" height="16" fill="none" stroke="#ef4444" viewBox="0 0 24 24" class="shrink-0 mt-0.5">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div class="flex-1">
          <p class="text-sm font-semibold text-rose-800">L'opération a échoué</p>
          <p class="text-sm text-rose-700 mt-0.5">{{ submitError }}</p>
        </div>
        <button
            type="button"
            class="text-rose-400 hover:text-rose-700"
            aria-label="Fermer le message"
            @click="submitError = ''"
        >
          ×
        </button>
      </div>

      <!-- ══ 3-Column Layout ════════════════════════════════════════ -->
      <div class="grid grid-cols-[260px_1fr_280px] gap-6 items-start">

        <!-- ── Col 1 : Sidebar ───────────────────────────────────── -->
        <div class="flex flex-col gap-4 sticky top-6">

          <!-- Nav steps -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Navigation</p>
            </div>
            <nav class="px-3 pb-4 flex flex-col gap-1">
              <button
                  v-for="step in steps"
                  :key="step.id"
                  @click="scrollToSection(step.id)"
                  :class="activeSection === step.id
                  ? 'bg-[#004AAD]/8 text-[#004AAD]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left"
              >
                <div :class="activeSection === step.id ? 'bg-[#004AAD] text-white' : 'bg-slate-100 text-slate-500'"
                     class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="step.id === 'section-general'" stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    <path v-else-if="step.id === 'section-pro'" stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="2"
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    <path v-else-if="step.id === 'section-access'" stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    <path v-else-if="step.id === 'section-extra'" stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                {{ step.label }}
              </button>
            </nav>
          </div>

          <!-- Processus de création -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm p-5">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Processus de création</p>
            <div class="flex flex-col gap-3">
              <div v-for="(step, idx) in creationSteps" :key="idx" class="flex items-start gap-3">
                <div class="flex flex-col items-center shrink-0">
                  <div
                      :class="step.done
                      ? 'bg-[#004AAD] border-[#004AAD]'
                      : step.active
                        ? 'bg-white border-[#004AAD]'
                        : 'bg-white border-slate-300'"
                      class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  >
                    <svg v-if="step.done" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white"
                         stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    <div v-else-if="step.active" class="w-2 h-2 rounded-full bg-[#004AAD]"></div>
                  </div>
                  <div v-if="idx < creationSteps.length - 1" class="w-px h-5 mt-1"
                       :class="step.done ? 'bg-[#004AAD]' : 'bg-slate-200'"></div>
                </div>
                <p
                    :class="step.done ? 'text-slate-800 font-semibold' : step.active ? 'text-[#004AAD] font-semibold' : 'text-slate-400'"
                    class="text-xs leading-tight pt-0.5"
                >
                  {{ step.label }}
                </p>
              </div>
            </div>
          </div>

          <!-- Bon à savoir -->
          <div class="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex gap-3">
            <div class="shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01"/>
              </svg>
            </div>
            <p class="text-xs text-amber-800 leading-relaxed">
              L'employé recevra un code OTP sur WhatsApp pour accéder à son compte et définir son mot de passe.
            </p>
          </div>

        </div>

        <!-- ── Col 2 : Formulaire ────────────────────────────────── -->
        <div class="flex flex-col gap-5">

          <!-- Informations générales -->
          <section id="section-general"
                   class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">Informations
              générales</h2>

            <div class="grid grid-cols-2 gap-4">
              <!-- Prénom -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Prénom <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <input
                      v-model="form.first_name"
                      type="text"
                      placeholder="Ex: Steve Jordan"
                      :class="errors.first_name ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-[#004AAD] focus:ring-[#004AAD]/10'"
                      class="w-full pl-9 pr-4 py-2.5 text-sm bg-white border rounded-xl outline-none focus:ring-2 transition-all placeholder:text-slate-300"
                  />
                </div>
                <p v-if="errors.first_name" class="text-xs text-rose-500">{{ errors.first_name }}</p>
              </div>

              <!-- Nom -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Nom <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <input
                      v-model="form.last_name"
                      type="text"
                      placeholder="Ex: NONGNING LELE"
                      :class="errors.last_name ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-[#004AAD] focus:ring-[#004AAD]/10'"
                      class="w-full pl-9 pr-4 py-2.5 text-sm bg-white border rounded-xl outline-none focus:ring-2 transition-all placeholder:text-slate-300"
                  />
                </div>
                <p v-if="errors.last_name" class="text-xs text-rose-500">{{ errors.last_name }}</p>
              </div>

              <!-- Téléphone -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Téléphone <span class="text-rose-500">*</span>
                </label>
                <div class="flex gap-2">
                  <!-- Country code selector -->
                  <button
                      @click="showCountryPicker = !showCountryPicker"
                      type="button"
                      class="relative flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-[#004AAD] transition-colors shrink-0"
                  >
                    <span class="text-base leading-none">{{ selectedCountry.flag }}</span>
                    <span class="text-slate-500 text-xs">{{ selectedCountry.dialCode }}</span>
                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                         class="text-slate-400">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  <!-- Country picker dropdown -->
                  <div v-if="showCountryPicker"
                       class="absolute z-50 mt-11 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                    <div class="max-h-52 overflow-y-auto py-1">
                      <button
                          v-for="c in countries"
                          :key="c.code"
                          @click="selectCountry(c)"
                          type="button"
                          :class="selectedCountry.code === c.code ? 'bg-blue-50 text-[#004AAD]' : 'text-slate-700 hover:bg-slate-50'"
                          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      >
                        <span class="text-base">{{ c.flag }}</span>
                        <span class="font-medium">{{ c.name }}</span>
                        <span class="ml-auto text-slate-400 text-xs">{{ c.dialCode }}</span>
                      </button>
                    </div>
                  </div>
                  <div class="relative flex-1">
                    <input
                        v-model="form.phone_number"
                        type="tel"
                        placeholder="6XX XXX XXX"
                        :class="errors.phone_number ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-[#004AAD] focus:ring-[#004AAD]/10'"
                        class="w-full px-4 py-2.5 text-sm bg-white border rounded-xl outline-none focus:ring-2 transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>
                <p v-if="errors.phone_number" class="text-xs text-rose-500">{{ errors.phone_number }}</p>
              </div>

              <!-- Email -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <input
                      v-model="form.email"
                      type="email"
                      placeholder="Ex: steve@imedialis.net"
                      :class="errors.email ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-[#004AAD] focus:ring-[#004AAD]/10'"
                      class="w-full pl-9 pr-4 py-2.5 text-sm bg-white border rounded-xl outline-none focus:ring-2 transition-all placeholder:text-slate-300"
                  />
                </div>
                <p v-if="errors.email" class="text-xs text-rose-500">{{ errors.email }}</p>
              </div>

              <!-- Pays -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Pays <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
                    </svg>
                  </div>
                  <select
                      v-model="form.country"
                      :class="errors.country ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-[#004AAD]'"
                      class="w-full pl-9 pr-8 py-2.5 text-sm bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#004AAD]/10 appearance-none transition-all text-slate-700"
                  >
                    <option value="" disabled>Sélectionner un pays</option>
                    <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.flag }} {{ c.name }}</option>
                  </select>
                  <svg class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="12"
                       height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
                <p v-if="errors.country" class="text-xs text-rose-500">{{ errors.country }}</p>
              </div>

              <!-- Code employé -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Code employé</label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2"/>
                    </svg>
                  </div>
                  <input
                      v-model="form.employee_code"
                      type="text"
                      placeholder="Ex: EMP-2024-001"
                      class="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/10 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <!-- Couleur employé -->
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-3">
                  <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Couleur de l'employé
                    <span class="normal-case tracking-normal font-medium text-slate-400">(optionnel)</span>
                  </label>

                  <button
                      v-if="form.employee_color" type="button" @click="resetEmployeeColor"
                      class="text-[11px] font-semibold text-slate-500 hover:text-[#004AAD] transition-colors"
                  >
                    {{ isEditMode ? 'Restaurer' : 'Automatique' }}
                  </button>
                </div>

                <div :class=" employeeColorConflict ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200' "
                    class="bg-white border rounded-2xl p-4 transition-all"
                >
                  <!-- En-tête -->
                  <div class="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p class="text-sm font-semibold text-slate-700">
                        Choisissez une couleur
                      </p>

                      <p class="text-[11px] text-slate-400 mt-0.5">
                        Sélectionnez une couleur proposée ou créez la vôtre.
                      </p>
                    </div>

                    <!-- Preview employé -->
                    <div
                        class="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200 shrink-0 flex items-center justify-center text-[10px] font-black transition-colors"
                        :style="employeeColorPreviewStyle"
                        :title=" form.employee_color || 'Attribution automatique' "
                    >
                      {{ previewInitials || '?' }}
                    </div>
                  </div>

                  <!-- Palette -->
                  <div class="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                    <button v-for="option in employeeColorOptions" :key="option.color"
                        type="button" :title="option.color"
                        @click="selectEmployeeColor(option.color)"
                        :class="[ option.selected ? 'ring-2 ring-[#004AAD] ring-offset-2 scale-105'
                         : 'hover:scale-110 hover:ring-2 hover:ring-slate-200 hover:ring-offset-1' ]"
                        class="relative aspect-square rounded-full cursor-pointer transition-all duration-150 shadow-sm"
                        :style="{ backgroundColor: option.color }"
                    >
                      <span v-if="option.selected"
                            class="absolute inset-0 flex items-center justify-center text-white drop-shadow">
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                        </svg>
                      </span>
                    </button>
                  </div>

                  <!-- Séparateur -->
                  <div class="flex items-center gap-3 my-4">
                    <div class="h-px bg-slate-100 flex-1"></div>
                    <span class="text-[10px] uppercase tracking-wider font-semibold text-slate-300">ou</span>
                    <div class="h-px bg-slate-100 flex-1"></div>
                  </div>

                  <!-- Couleur personnalisée -->
                  <div class="flex items-center gap-3">
                    <!-- Input natif caché -->
                    <input
                        ref="customEmployeeColorInput" v-model="employeeColorPickerValue" type="color"
                        tabindex="-1" class="absolute w-0 h-0 opacity-0 pointer-events-none" aria-hidden="true"
                        @input="applyEmployeeColorFromPicker"
                    />
                    <button
                        type="button" @click="openCustomEmployeeColorPicker"
                        class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200
                         bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-white
                          hover:border-[#004AAD]/40 hover:text-[#004AAD] transition-all"
                    >
                      <!-- Palette -->
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 3a9 9 0 100 18h1.5a1.5 1.5 0 000-3H12a1.5 1.5 0 010-3h2a7 7 0 007-7c0-2.761-4.03-5-9-5z"
                        />
                        <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
                        <circle cx="10" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                        <circle cx="15" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                        <circle cx="17" cy="10.5" r="1" fill="currentColor" stroke="none"/>
                      </svg>

                      Couleur personnalisée
                    </button>

                    <div v-if="normalizedFormEmployeeColor" class="flex items-center gap-2 ml-auto min-w-0">
        <span class="w-5 h-5 rounded-full border border-slate-200 shadow-sm shrink-0"
            :style="{ backgroundColor: normalizedFormEmployeeColor, }"></span>
                      <span class="text-[11px] font-mono font-semibold text-slate-500 truncate">
                        {{ normalizedFormEmployeeColor }}</span>
                    </div>
                  </div>
                </div>

                <p v-if="errors.employee_color" class="text-xs text-rose-500">
                  {{ errors.employee_color }}
                </p>
                <p v-else-if="employeeColorConflict" class="text-xs text-rose-500">
                  Cette couleur est déjà utilisée par un autre employé.
                </p>
                <p v-else-if="isEditMode" class="text-[11px] text-slate-400">
                  La couleur actuelle sera conservée si vous ne la modifiez pas.
                </p>
                <p v-else class="text-[11px] text-slate-400">
                  Aucune sélection : une couleur unique sera attribuée automatiquement.
                </p>
              </div>

              <!-- Date d'embauche -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Date d'embauche</label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <input
                      v-model="form.hire_date"
                      type="date"
                      class="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/10 transition-all text-slate-700"
                  />
                </div>
              </div>

            </div>
          </section>

          <!-- Informations professionnelles -->
          <section id="section-pro"
                   class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">Informations
              professionnelles</h2>

            <div class="grid grid-cols-2 gap-4">
              <!-- Département -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Département</label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <input
                      v-model="form.department"
                      type="text"
                      placeholder="Ex: Service Informatique"
                      class="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/10 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <!-- Poste / Titre -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Poste / Titre</label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <input
                      v-model="form.job_title"
                      type="text"
                      placeholder="Ex: Développeur Backend"
                      class="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/10 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>
          </section>

          <!-- Affectations & accès -->
          <section id="section-access"
                   class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm p-6">
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-base font-bold text-slate-900">Affectations & accès</h2>
              <span
                  class="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">Bientôt disponible</span>
            </div>
            <p class="text-sm text-slate-500 mb-4 pb-4 border-b border-slate-100">
              L'affectation au planning (rotation ou fixe) sera configurée après la création du compte.
            </p>
            <div class="flex flex-col gap-3">
              <div
                  class="flex items-center gap-3 p-4 bg-slate-50/80 border border-slate-200/60 rounded-xl opacity-50 cursor-not-allowed">
                <div class="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-500">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-700">Planning par rotation</p>
                  <p class="text-xs text-slate-500">Cycles et groupes de rotation</p>
                </div>
              </div>
              <div
                  class="flex items-center gap-3 p-4 bg-slate-50/80 border border-slate-200/60 rounded-xl opacity-50 cursor-not-allowed">
                <div class="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-700">Planning fixe</p>
                  <p class="text-xs text-slate-500">Horaires définis manuellement</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Informations complémentaires -->
          <section id="section-extra"
                   class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">
              Informations complémentaires
              <span class="ml-2 text-xs font-medium text-slate-400 normal-case tracking-normal">(optionnel)</span>
            </h2>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notes</label>
              <textarea
                  v-model="form.notes"
                  rows="4"
                  placeholder="Ajoutez des notes ou informations complémentaires…"
                  class="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/10 transition-all placeholder:text-slate-300 resize-none"
              ></textarea>
            </div>
          </section>

        </div>

        <!-- ── Col 3 : Panneau Aperçu ────────────────────────────── -->
        <div class="flex flex-col gap-4 sticky top-6">

          <!-- Aperçu compte -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm p-5">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Aperçu du compte</p>

            <div class="flex flex-col items-center gap-3 py-2">
              <div class="relative">
                <div
                    v-if="avatarPreview"
                    class="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white shadow-md"
                >
                  <img :src="avatarPreview" class="w-full h-full object-cover" alt="icon"/>
                </div>
                <div
                    v-else
                    class="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#004AAD]/15 to-[#004AAD]/30 flex items-center justify-center ring-4 ring-white shadow-md"
                >
                  <span v-if="previewInitials" class="text-2xl font-bold text-[#004AAD]">{{ previewInitials }}</span>
                  <svg v-else width="28" height="28" fill="none" stroke="#004AAD" viewBox="0 0 24 24"
                       class="opacity-40">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
              </div>

              <div class="text-center">
                <p class="text-sm font-bold text-slate-900">
                  {{ previewName || 'Nouveau collaborateur' }}
                </p>
                <p class="text-xs text-slate-500 mt-0.5">{{ form.job_title || 'Poste non défini' }}</p>
              </div>

              <!-- Upload avatar -->
              <label
                  class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors mt-1">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                Télécharger
                <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload"/>
              </label>
              <p class="text-[10px] text-slate-400">Photo de profil · Optionnel</p>
            </div>
          </div>

          <!-- Rôle attribué -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm p-5">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Rôle attribué</p>
            <div class="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200/60 rounded-xl">
              <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-bold text-slate-800">Employé</p>
              </div>
              <span
                  class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Par défaut</span>
            </div>
            <p class="text-xs text-slate-500 mt-2.5">Rôle attribué automatiquement à la création du compte.</p>
          </div>

          <!-- Ce qui sera créé -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm p-5">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ce qui sera créé</p>
            <div class="flex flex-col gap-2.5">
              <div v-for="item in creationChecklist" :key="item" class="flex items-center gap-2.5">
                <div class="w-4 h-4 rounded-full bg-[#004AAD]/10 flex items-center justify-center shrink-0">
                  <svg width="8" height="8" fill="none" stroke="#004AAD" stroke-width="3" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span class="text-xs text-slate-700 font-medium">{{ item }}</span>
              </div>
            </div>
          </div>

          <!-- OTP notice -->
          <div class="bg-[#004AAD]/6 border border-[#004AAD]/15 rounded-2xl p-4 flex gap-3">
            <div class="w-7 h-7 rounded-lg bg-[#004AAD]/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="13" height="13" fill="none" stroke="#004AAD" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <p class="text-xs text-[#004AAD]/80 leading-relaxed font-medium">
              L'employé devra utiliser le code OTP pour activer son compte.
            </p>
          </div>

        </div>

      </div>
    </main>

    <Footer/>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, reactive, onMounted} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import Header from '../views/components/header.vue'
import Footer from '../views/components/footer.vue'
import {useUserStore} from '@/stores/userStore'
import {useTeamStore} from '@/stores/teamStore'
import UserService, {type OtpDeliveryResult} from '@/service/UserService'
import {
  EMPLOYEE_COLOR_PATTERN,
  EMPLOYEE_COLOR_PALETTE,
  normalizeEmployeeColor,
} from '@/utils/employeeColor'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const teamStore = useTeamStore()

// ── Mode ──────────────────────────────────────────────────────────────
const isEditMode = computed(() => !!route.params.id)
const employeeGuid = computed(() => route.params.id as string | undefined)

// ── Form state ────────────────────────────────────────────────────────
const form = reactive({
  first_name: '',
  last_name: '',
  phone_number: '',
  email: '',
  country: 'CM',
  employee_code: '',
  employee_color: '',
  hire_date: '',
  department: '',
  job_title: '',
  notes: '',
})

const errors = reactive<Record<string, string>>({})
const isSubmitting = ref(false)
const submitError = ref('')
const avatarPreview = ref<string | null>(null)
const showCountryPicker = ref(false)
const activeSection = ref('section-general')
const employeeColorPickerValue = ref('#2563EB')
const originalEmployeeColor = ref<string | null>(null)
const customEmployeeColorInput = ref<HTMLInputElement | null>(null)

// ── Countries ─────────────────────────────────────────────────────────
const countries = [
  {code: 'CM', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237'},
  {code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33'},
  {code: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221'},
  {code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225'},
  {code: 'CD', name: 'Congo (RDC)', flag: '🇨🇩', dialCode: '+243'},
  {code: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241'},
  {code: 'BJ', name: 'Bénin', flag: '🇧🇯', dialCode: '+229'},
  {code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228'},
  {code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234'},
]

const selectedCountry = ref(countries[0])

const selectCountry = (c: typeof countries[0]) => {
  selectedCountry.value = c
  form.country = c.code
  showCountryPicker.value = false
}

// ── Steps sidebar ─────────────────────────────────────────────────────
const steps = [
  {
    id: 'section-general',
    label: 'Informations générales',
    icon: {render: () => `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`}
  },
  {
    id: 'section-pro',
    label: 'Informations professionnelles',
    icon: {render: () => `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`}
  },
  {
    id: 'section-access',
    label: 'Affectations & accès',
    icon: {render: () => `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`}
  },
  {
    id: 'section-extra',
    label: 'Informations complémentaires',
    icon: {render: () => `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>`}
  },
]

const creationSteps = computed(() => [
  {label: 'Informations employé', done: isFormValid.value, active: !isFormValid.value},
  {label: 'Affectation rôle par défaut', done: false, active: isFormValid.value},
  {label: 'Création planning', done: false, active: false},
  {label: 'Envoi invitation (OTP)', done: false, active: false},
])

const creationChecklist = [
  'Compte employé',
  'Rôle employé (par défaut)',
  'Planning par défaut',
  'Licence employé',
  'Envoi OTP sur WhatsApp',
]

// ── Preview ───────────────────────────────────────────────────────────
const previewName = computed(() => {
  const parts = [form.first_name, form.last_name].filter(Boolean)
  return parts.join(' ')
})

const previewInitials = computed(() => {
  const f = form.first_name?.[0] ?? ''
  const l = form.last_name?.[0] ?? ''
  return (f + l).toUpperCase() || ''
})


const normalizedFormEmployeeColor = computed(() =>
    normalizeEmployeeColor(form.employee_color),
)

const usedEmployeeColors = computed(() => {
  const currentGuid = employeeGuid.value

  return new Set(
      teamStore.employees
          .filter((employee) => employee.guid !== currentGuid)
          .map((employee) => normalizeEmployeeColor(employee.employeeColor))
          .filter((color): color is string => Boolean(color)),
  )
})

const employeeColorOptions = computed(() =>
    EMPLOYEE_COLOR_PALETTE
        .filter(
            (color) =>
                !usedEmployeeColors.value.has(color),
        )
        .map((color) => ({
          color,
          selected:
              normalizedFormEmployeeColor.value === color,
        })),
)

const employeeColorConflict = computed(() => {
  const color = normalizedFormEmployeeColor.value
  return Boolean(color && usedEmployeeColors.value.has(color))
})

const employeeColorPreviewStyle = computed(() => {
  const color = normalizedFormEmployeeColor.value
  if (!color) {
    return {
      backgroundColor: '#F1F5F9',
      color: '#64748B',
    }
  }

  const r = Number.parseInt(color.slice(1, 3), 16)
  const g = Number.parseInt(color.slice(3, 5), 16)
  const b = Number.parseInt(color.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return {
    backgroundColor: color,
    color: luminance >= 0.62 ? '#0F172A' : '#FFFFFF',
  }
})

const selectEmployeeColor = (color: string) => {
  const normalized =
      normalizeEmployeeColor(color)

  if (!normalized) return

  // Protection supplémentaire.
  if (usedEmployeeColors.value.has(normalized)) {
    return
  }

  form.employee_color = normalized
  employeeColorPickerValue.value = normalized

  delete errors.employee_color
}

const openCustomEmployeeColorPicker = () => {
  customEmployeeColorInput.value?.click()
}

const applyEmployeeColorFromPicker = (
    event: Event,
) => {
  const input =
      event.target as HTMLInputElement

  const normalized =
      normalizeEmployeeColor(input.value)

  if (!normalized) return

  employeeColorPickerValue.value = normalized
  form.employee_color = normalized
}

const normalizeEmployeeColorInput = () => {
  const raw = form.employee_color.trim().toUpperCase()
  form.employee_color = raw

  if (EMPLOYEE_COLOR_PATTERN.test(raw)) {
    employeeColorPickerValue.value = raw
  }
}

const resetEmployeeColor = () => {
  if (isEditMode.value) {
    form.employee_color = originalEmployeeColor.value ?? ''
    if (originalEmployeeColor.value) {
      employeeColorPickerValue.value = originalEmployeeColor.value
    }
    return
  }

  form.employee_color = ''
}

// ── Validation ────────────────────────────────────────────────────────
const isFormValid = computed(() =>
    !!form.last_name.trim() &&
    !!form.phone_number.trim() &&
    !!form.country.trim()
)

const validate = (): boolean => {
  Object.keys(errors).forEach(k => delete (errors as any)[k])
  let valid = true

  if (!form.last_name.trim()) {
    errors.last_name = 'Le nom est requis.';
    valid = false
  }
  if (!form.phone_number.trim()) {
    errors.phone_number = 'Le numéro de téléphone est requis.';
    valid = false
  }
  if (!form.country.trim()) {
    errors.country = 'Le pays est requis.';
    valid = false
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Adresse email invalide.'
    valid = false
  }

  if (form.employee_color && !normalizedFormEmployeeColor.value) {
    errors.employee_color = 'Utilisez le format hexadécimal #RRGGBB.'
    valid = false
  } else if (employeeColorConflict.value) {
    errors.employee_color = 'Cette couleur est déjà utilisée dans votre équipe.'
    valid = false
  }

  return valid
}

const channelLabel = (channel: string): string => {
  if (channel === 'whatsapp') return 'WhatsApp'
  if (channel === 'email') return 'email'
  return channel
}

const buildCreationFlash = (
    employeeName: string,
    delivery?: OtpDeliveryResult,
) => {
  if (!delivery || delivery.status === 'sent') {
    return {
      type: 'success' as const,
      title: 'Employé créé',
      message: `${employeeName} a été créé et son OTP a été envoyé avec succès.`,
    }
  }

  const sent = delivery.sent_channels.map(channelLabel).join(' et ')
  const failed = delivery.failed_channels.map(channelLabel).join(' et ')

  if (delivery.status === 'partial_failure') {
    return {
      type: 'warning' as const,
      title: 'Employé créé — envoi partiel',
      message: `Le compte de ${employeeName} a été créé. OTP envoyé par ${sent || 'un canal disponible'}, mais échec sur ${failed}.`,
    }
  }

  return {
    type: 'warning' as const,
    title: 'Employé créé — invitation non envoyée',
    message: `Le compte de ${employeeName} a été créé, mais l'OTP n'a pu être envoyé par aucun canal. Vous pourrez le régénérer depuis son profil.`,
  }
}

// ── Submit ────────────────────────────────────────────────────────────
const handleSubmit = async () => {
  submitError.value = ''
  if (!validate()) return

  isSubmitting.value = true

  try {
    const supervisorGuid = userStore.user?.guid!

    const payload = {
      supervisor: supervisorGuid,
      last_name: form.last_name.trim(),
      phone_number: `${selectedCountry.value.dialCode}${form.phone_number.trim()}`,
      country: form.country.trim().toUpperCase(),
      ...(form.first_name.trim() && {first_name: form.first_name.trim()}),
      ...(form.email.trim() && {email: form.email.trim().toLowerCase()}),
      ...(form.employee_code.trim() && {employee_code: form.employee_code.trim().toUpperCase()}),
      ...(normalizedFormEmployeeColor.value && {employee_color: normalizedFormEmployeeColor.value}),
      ...(form.hire_date && {hire_date: form.hire_date}),
      ...(form.department.trim() && {department: form.department.trim()}),
      ...(form.job_title.trim() && {job_title: form.job_title.trim()}),
    }

    if (isEditMode.value && employeeGuid.value) {
      // Ne jamais modifier l'identité couleur si le manager n'a rien changé.
      if (
          normalizedFormEmployeeColor.value === originalEmployeeColor.value ||
          !normalizedFormEmployeeColor.value
      ) {
        delete (payload as any).employee_color
      }

      const response = await UserService.updateEmployee(employeeGuid.value, supervisorGuid, payload)

      console.log('updateEmployee', response)
      if (response.success) {
        const updatedEmployee = (response as any).data ?? payload
        teamStore.updateEmployee({
          ...updatedEmployee,
          guid: employeeGuid.value,
        })
        await router.push({name: 'equipe'})
      } else {
        submitError.value =
            (response as any)?.error?.message ??
            (response as any)?.message ??
            'Une erreur est survenue lors de la mise à jour.'
      }
    } else {
      const response = await UserService.createEmployee(payload)

      if (response.success && response.data) {
        const employee = response.data
        const employeeName =
            [employee.first_name, employee.last_name].filter(Boolean).join(' ') ||
            'Le collaborateur'

        teamStore.addEmployee({
          ...employee,
          roles: {
            count: employee.role ? 1 : 0,
            items: employee.role ? [employee.role] : [],
          },
        })

        teamStore.setFlash(
            buildCreationFlash(employeeName, employee.otp_delivery),
        )

        await router.push({name: 'equipe'})
      } else {
        submitError.value =
            (response as any)?.error?.message ??
            'Une erreur est survenue lors de la création.'
      }
    }
  } catch (e: any) {
    submitError.value = e?.message ?? 'Erreur inattendue. Veuillez réessayer.'
  } finally {
    isSubmitting.value = false
  }
}

// ── Avatar upload ─────────────────────────────────────────────────────
const handleAvatarUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    avatarPreview.value = ev.target?.result as string
  }
  reader.readAsDataURL(file)
}

// ── Scroll nav ────────────────────────────────────────────────────────
const scrollToSection = (id: string) => {
  activeSection.value = id
  document.getElementById(id)?.scrollIntoView({behavior: 'smooth', block: 'start'})
}

// ── Pre-fill on edit ──────────────────────────────────────────────────
onMounted(() => {
  if (isEditMode.value && employeeGuid.value) {
    const emp = teamStore.getEmployeeById(employeeGuid.value)
    if (emp) {
      form.first_name = emp.firstName
      form.last_name = emp.lastName
      form.email = emp.email === 'N/A' ? '' : emp.email
      form.country = emp.country ?? 'CM'
      form.employee_code = emp.employeeCode === 'N/A' ? '' : emp.employeeCode
      originalEmployeeColor.value = normalizeEmployeeColor(emp.employeeColor)
      form.employee_color = originalEmployeeColor.value ?? ''
      if (originalEmployeeColor.value) {
        employeeColorPickerValue.value = originalEmployeeColor.value
      }
      form.hire_date = emp.hireDate ?? ''
      form.department = emp.department === 'N/A' ? '' : emp.department
      form.job_title = emp.jobTitle === 'N/A' ? '' : emp.jobTitle
      avatarPreview.value = emp.avatar

      const country = countries.find(c => c.code === emp.country) ?? countries[0]
      selectedCountry.value = country

      const rawPhone = emp.phoneNumber === 'N/A' ? '' : (emp.phoneNumber ?? '')
      form.phone_number = rawPhone.startsWith(country.dialCode)
          ? rawPhone.slice(country.dialCode.length).trim()
          : rawPhone
    }
  }
})
</script>