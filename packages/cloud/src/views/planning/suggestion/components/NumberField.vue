<template>
    <div>
        <div class="flex items-center justify-between gap-3">
            <label
                :for="fieldId"
                class="text-xs font-bold text-slate-700"
            >
                {{ label }}
                <span v-if="!optional" class="text-red-500">*</span>
            </label>

            <span
                v-if="optional"
                class="text-[10px] font-semibold uppercase tracking-wide text-slate-400"
            >
                Facultatif
            </span>
        </div>

        <div class="relative mt-2">
            <input
                :id="fieldId"
                :value="modelValue"
                type="number"
                :min="min"
                :max="max"
                :step="step"
                :disabled="disabled"
                :placeholder="optional ? 'Laisser vide' : undefined"
                class="field-control"
                :class="[
                    suffix ? 'pr-24' : '',
                    error ? 'field-control-error' : '',
                ]"
                @input="handleInput"
                @blur="$emit('blur')"
            />

            <span
                v-if="suffix"
                class="pointer-events-none absolute right-3 top-1/2 max-w-[82px] -translate-y-1/2 truncate text-[10px] font-semibold text-slate-400"
            >
                {{ suffix }}
            </span>
        </div>

        <p v-if="error" class="field-error-text">
            {{ error }}
        </p>
        <p v-else-if="help" class="field-help">
            {{ help }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
    defineProps<{
        modelValue: number | string
        label: string
        help?: string
        suffix?: string
        min?: number
        max?: number
        step?: number
        optional?: boolean
        disabled?: boolean
        error?: string
        id?: string
    }>(),
    {
        help: '',
        suffix: '',
        step: 1,
        optional: false,
        disabled: false,
        error: '',
        id: '',
    },
)

const emit = defineEmits<{
    'update:modelValue': [value: number | string]
    blur: []
}>()

const fieldId = computed(
    () =>
        props.id ||
        `number-field-${props.label
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')}`,
)

function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement
    emit(
        'update:modelValue',
        target.value === '' ? '' : Number(target.value),
    )
}
</script>

<style scoped>
.field-control {
    width: 100%;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 0.7rem 0.8rem;
    font-size: 0.75rem;
    color: #334155;
    outline: none;
    transition: 0.16s;
}

.field-control:focus {
    border-color: #a5b4fc;
    box-shadow: 0 0 0 3px #e0e7ff;
}

.field-control:disabled {
    cursor: not-allowed;
    background: #f1f5f9;
    color: #94a3b8;
}

.field-control-error {
    border-color: #fca5a5;
}

.field-error-text {
    margin-top: 0.35rem;
    font-size: 0.68rem;
    line-height: 1rem;
    color: #dc2626;
}

.field-help {
    margin-top: 0.35rem;
    font-size: 0.68rem;
    line-height: 1rem;
    color: #94a3b8;
}
</style>
