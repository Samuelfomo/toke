const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const planning = resolve(__dirname, '../src/views/planning');
function run(file, from, to, globals, result) {
  const source = readFileSync(resolve(planning, file), 'utf8');
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start);
  const script = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return vm.runInNewContext(`${script}\n${result}`, globals);
}
const ref = value => ({ value });

test('publication of only part of a suggestion opens the full suggestion period', async () => {
  let route;
  let closed = false;
  const submit = run('suggestion/suggestions/ScheduleSuggestionPreview.vue',
    'async function confirmPublication(', '\nasync function ', {
      suggestion: ref({ guid: 'suggestion', period_from: '2026-12-01', period_to: '2026-12-31' }),
      approvalPreview: ref({ effective_from: '2026-12-12' }),
      canConfirmPublication: ref(true), actionLoading: ref(false), publicationError: ref(''),
      ScheduleSuggestionService: { approve: async (guid, date) => {
        assert.equal(guid, 'suggestion');
        assert.equal(date, '2026-12-12');
        return { success: true };
      } },
      closePublication: () => { closed = true; },
      router: { push: async value => { route = value; } },
    }, 'confirmPublication');
  await submit();
  assert.equal(closed, true);
  assert.equal(route.name, 'schedule-assignment');
  assert.equal(route.query.date_from, '2026-12-01');
  assert.equal(route.query.date_to, '2026-12-31');
});

test('planning initializes both filters before the automatic mounted load', () => {
  const relativeFile = 'schedule_assignment/scheduleAssignmentList.vue';
  for (const [query, expected] of [
    [{ date_from: '2026-12-01', date_to: '2026-12-31' }, ['2026-12-01', '2026-12-31']],
    [{}, ['2026-11-23', '2026-11-29']],
    [{ date_from: '2026-02-30', date_to: '2026-03-04' }, ['2026-11-23', '2026-11-29']],
  ]) {
    const context = {
      route: { query }, getQueryString: value => typeof value === 'string' ? value : '',
      ref, computed: fn => ({ get value() { return fn(); } }),
      monday: new Date('2026-11-23'), sunday: new Date('2026-11-29'),
      watch: () => {}, onMounted: fn => fn(),
    };
    const period = run(relativeFile, 'function isPlanningDate(', '\nconst canApplyPeriod', context,
      '({ routePeriod, periodFrom, periodTo, draftPeriodFrom, draftPeriodTo })');
    Object.assign(context, period);
    const loaded = [];
    context.load = () => loaded.push([period.periodFrom.value, period.periodTo.value]);
    run(relativeFile, 'watch(routePeriod,', '\n</script>', context, '');
    assert.deepEqual(loaded, [expected]);
    assert.deepEqual([period.draftPeriodFrom.value, period.draftPeriodTo.value], expected);
  }
});

test('manual form stays open after an API error and emits saved only on confirmed success', async () => {
  const failure = new Error('Affectation refusée');
  let saved = 0;
  const context = {
    saving: ref(false), globalError: ref(''), isEdit: ref(false), currentUserGuid: ref('manager'),
    replacementPreview: ref(null), ApiClientError: class extends Error {},
    validateAll: () => true, emit: event => { if (event === 'saved') saved++; },
    form: { session_template_guid: 'template', start_date: '2026-12-01', target_guid: 'employee', target_type: 'user' },
    ScheduleAssignmentService: { create: async () => { throw failure; } }, Error,
  };
  const submit = run('schedule_assignment/scheduleAssignmentForm.vue', 'async function submit(', '\nfunction requestClose', context, 'submit');
  await submit();
  assert.equal(saved, 0);
  assert.equal(context.globalError.value, failure.message);
  assert.equal(context.saving.value, false);
  context.ScheduleAssignmentService.create = async () => ({ success: true });
  await submit();
  assert.equal(saved, 1);
});

test('planning loads persisted assignments and retains the day before for guard continuations', async () => {
  const published = { guid: 'published-assignment' };
  const assignments = ref([]);
  let filters;
  const load = run('schedule_assignment/scheduleAssignmentList.vue', 'async function load()', '\nfunction ',
    {
      userStore: { user: { guid: 'manager' } },
      teamStore: { loadTeam: async () => [] },
      loadRequestSequence: 0,
      loading: ref(false), hasLoadedOnce: ref(false), assignmentLoadFailed: ref(false),
      allAssignments: assignments, sessionTemplates: ref([{ guid: 'template' }]),
      previousIso: ref('2026-11-30'), periodTo: ref('2026-12-31'),
      ScheduleAssignmentService: { list: async (manager, query) => {
        assert.equal(manager, 'manager');
        filters = query;
        return { success: true, data: { schedule_assignments: { items: [published] } } };
      } },
    }, 'load');
  await load();
  assert.equal(filters.date_from, '2026-11-30');
  assert.equal(filters.date_to, '2026-12-31');
  assert.equal(assignments.value[0], published);
});

test('manual assignment shows impact and sends the token only on explicit confirmation', async () => {
  class ApiClientError extends Error {
    code = 'SCHEDULE_ASSIGNMENT_OVERLAP';
    details = {
      confirmation: 'replacement-token',
      affected: [{ guid: 'existing', replaced: { from: '2026-12-01', to: null }, preserved: [] }],
    };
  }
  const requests = [];
  const preview = ref(null);
  let saved = 0;
  const submit = run('schedule_assignment/scheduleAssignmentForm.vue', 'async function submit(', '\nfunction requestClose', {
    saving: ref(false), globalError: ref(''), isEdit: ref(false), currentUserGuid: ref('manager'),
    replacementPreview: preview, ApiClientError, validateAll: () => true,
    form: { session_template_guid: 'template', start_date: '2026-12-01', target_guid: 'employee', target_type: 'user' },
    emit: event => { if (event === 'saved') saved++; },
    ScheduleAssignmentService: { create: async payload => {
      requests.push(payload);
      if (!payload.replacement_confirmation) throw new ApiClientError();
      return { success: true };
    } },
  }, 'submit');
  await submit();
  assert.equal(requests[0].replacement_confirmation, undefined);
  assert.equal(preview.value.affected[0].guid, 'existing');
  assert.equal(saved, 0);
  await submit(preview.value.confirmation);
  assert.equal(requests[1].replacement_confirmation, 'replacement-token');
  assert.equal(saved, 1);
});
