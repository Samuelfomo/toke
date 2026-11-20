import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { test } from 'node:test';
import persistence from './planning-suggestion-persistence.fixture.cjs';
import { createServer } from 'node:http';
import { FixedAlternationAcknowledgementError } from '../src/utils/solver/planning.solver.ts';
import { buildRollingWindows, buildRollingWindowLocks, buildTemplateCatalog, commitEngineWindow, createCommittedState, mergeRollingDiagnostics } from '../src/utils/planning.rolling.horizon.ts';
import { fileURLToPath } from 'node:url';
import OrToolsPlanningSolver, { supportsOrToolsFixedAlternation } from '../src/utils/solver/ortools.planning.solver.ts';
import { prepareFixedAlternation, summarizeFixedAlternation } from '../src/utils/planning.fixed.alternation.ts';

const solverDir = fileURLToPath(new URL('../../planning-ortools/', import.meta.url));
const python = process.env.TOKE_TEST_PYTHON ?? `${solverDir}.venv/bin/python`;

test('real HTTP negotiation and CP-SAT solve for two representative weeks', { timeout: 35_000 }, async () => {
  const fixture = spawnSync(python, ['-c',
    'import json, runpy; print(json.dumps(runpy.run_path("tests/test_fixed_alternation.py")["request"]()))',
  ], { cwd: solverDir, encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  assert.equal(fixture.status, 0, fixture.stderr);
  const { fixed_alternation_policy: wirePolicy, ...input } = JSON.parse(fixture.stdout);
  input.fixedAlternationPolicy = prepareFixedAlternation(wirePolicy, input.employees).policy;

  const worker = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '0'], {
    cwd: solverDir, stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Solver startup timed out')), 8_000);
      let stderr = '';
      worker.stderr.on('data', chunk => {
        stderr += String(chunk);
        const match = stderr.match(/Uvicorn running on (http:\/\/127\.0\.0\.1:\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });
      worker.once('error', error => { clearTimeout(timeout); reject(error); });
      worker.once('exit', code => { clearTimeout(timeout); reject(new Error(`Solver exited ${code}: ${stderr}`)); });
    });
    assert.equal(await supportsOrToolsFixedAlternation(endpoint), true);
    const legacy = await new OrToolsPlanningSolver({ endpoint }).solve(input);
    assert.equal(legacy.diagnostics.fixedAlternationEvaluation, undefined);
    assert.equal(legacy.items[0].schedule['2026-12-29'], 'late');

    const solver = new OrToolsPlanningSolver({ endpoint, fixedAlternationSupported: true });
    const result = await solver.solve(input);
    const [aicha, camille] = result.items.map(item => item.schedule);
    assert.equal(aicha['2026-12-29'], 'morning');
    assert.equal(camille['2026-12-29'], 'late');
    assert.equal(aicha['2027-01-02'], null);
    assert.equal(camille['2027-01-03'], null);
    assert.equal(aicha['2027-01-10'], null);
    assert.equal(camille['2027-01-09'], null);
    const diagnostic = summarizeFixedAlternation(result.diagnostics.fixedAlternationEvaluation);
    assert.equal(diagnostic.status, 'APPLIED');
    assert.deepEqual(diagnostic.deviations, []);
    const third = { ...input.employees[0], guid: 'third', rotationOrder: 13 };
    const generate = persistence.loadGeneration(endpoint, { employees: [...input.employees, third] }, wirePolicy);
    const complete = await generate('manager', '2026-11-23', '2026-12-06');
    assert.equal(complete.engineResult.diagnostics.fixedAlternation.status, 'APPLIED');
    const manualRest = { employeeGuid: 'aicha', date: '2026-12-05', templateGuid: null, requirementGuid: null };
    const regenerated = await generate('manager', '2026-11-23', '2026-12-06', [], [manualRest]);
    assert.equal(regenerated.engineResult.items.find(item => item.userGuid === 'aicha').schedule['2026-12-05'], null);
    await assert.rejects(generate('manager', '2026-11-23', '2026-12-06', [], [
      { ...manualRest, date: '2026-12-04' },
    ]), error => error.details.violations.some(violation =>
      violation.code === 'FIXED_ALTERNATION_WEEKEND_REST_CONFLICT'));
    const withoutPolicy = persistence.loadGeneration(endpoint, { employees: [...input.employees, third] }, undefined);
    const legacyGeneration = await withoutPolicy('manager', '2026-11-23', '2026-12-06');
    assert.equal(legacyGeneration.persistedDiagnostics.fixedAlternation, undefined);
    for (const excluded of [['aicha'], ['camille'], ['aicha', 'camille']]) {
      const employee = { ...input.employees[0], guid: 'third' };
      const employees = [...input.employees, employee].filter(value => !excluded.includes(value.guid));
      const prepared = prepareFixedAlternation(wirePolicy, employees, excluded);
      assert.equal(prepared.status, 'NOT_APPLICABLE');
      assert.equal(prepared.reason, 'EMPLOYEE_EXCLUDED');
      assert.deepEqual(prepared.missingEmployeeGuids, excluded);
      const solved = await solver.solve({
        ...input, periodFrom: '2026-11-23', periodTo: '2026-12-06',
        employees, fixedAlternationPolicy: prepared.policy,
      });
      assert.deepEqual(solved.items.map(item => item.userGuid), employees.map(value => value.guid));
      for (const item of solved.items) {
        const reference = employees.find(value => value.guid === item.userGuid).fixedTemplate.guid;
        assert.ok(Object.values(item.schedule).every(shift => shift === null || shift === reference));
      }
      assert.equal(solved.diagnostics.fixedAlternationEvaluation, undefined);
      const generated = await generate('manager', '2026-11-23', '2026-12-06', excluded);
      assert.equal(generated.persistedDiagnostics.fixedAlternation.status, 'NOT_APPLICABLE');
      assert.deepEqual(generated.persistedDiagnostics.fixedAlternation.missingEmployeeGuids, excluded);
      assert.ok(generated.engineResult.items.every(item => !excluded.includes(item.userGuid)));
    }
    const windows = buildRollingWindows('2026-11-23', '2026-12-20');
    const rollingState = createCommittedState(input.employees);
    const catalog = buildTemplateCatalog(input.employees, [], []);
    const chunks = [];
    const forced = { employeeGuid: 'aicha', date: '2026-12-05', templateGuid: null, requirementGuid: null };
    for (const window of windows) {
      const { locks } = buildRollingWindowLocks(rollingState, window, [forced], [], catalog);
      const result = await solver.solve({
        ...input, periodFrom: window.solveFrom, periodTo: window.solveTo,
        lockedAssignments: locks,
      });
      commitEngineWindow(rollingState, result, window.commitFrom, window.commitTo);
      chunks.push({ result, window });
    }
    const rolling = mergeRollingDiagnostics(chunks).fixedAlternationEvaluation;
    assert.ok(rolling.checks.length > 20);
    assert.equal(new Set(rolling.checks.map(check => `${check.date}|${check.kind}`)).size, rolling.checks.length);
    assert.ok(rolling.checks.filter(check => check.kind === 'SHIFT').every(check =>
      check.expected.every((template, index) => check.actual[index] === template)));
    assert.equal(rollingState.schedules.get('aicha')['2026-12-05'], null);

    let mismatch = 'missing';
    const proxy = createServer(async (request, response) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const outgoing = Buffer.concat(chunks);
      const upstream = await fetch(endpoint + request.url, {
        method: request.method,
        ...(request.method === 'POST' && { headers: { 'Content-Type': 'application/json' }, body: outgoing }),
      });
      const body = await upstream.json();
      const evaluation = body.result?.diagnostics.fixedAlternationEvaluation;
      if (request.url === '/health' && mismatch === 'old-worker') {
        delete body.capabilities.fixedAlternationMandatoryWeekendRest;
      }
      if (evaluation && mismatch === 'missing') delete body.result.diagnostics.fixedAlternationEvaluation;
      if (evaluation && mismatch === 'invalid') evaluation.contractVersion = 1;
      response.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(body));
    });
    await new Promise((resolve, reject) => {
      proxy.once('error', reject);
      proxy.listen(0, '127.0.0.1', resolve);
    });
    try {
      const proxyEndpoint = `http://127.0.0.1:${proxy.address().port}`;
      assert.equal(await supportsOrToolsFixedAlternation(proxyEndpoint), true);
      const incompatible = new OrToolsPlanningSolver({ endpoint: proxyEndpoint, fixedAlternationSupported: true });
      await assert.rejects(incompatible.solve(input), FixedAlternationAcknowledgementError);
      mismatch = 'invalid';
      await assert.rejects(incompatible.solve(input), error =>
        error.code === 'PLANNING_SOLVER_PROTOCOL_ERROR' && !(error instanceof FixedAlternationAcknowledgementError));
      mismatch = 'missing';
      const generateViaProxy = persistence.loadGeneration(proxyEndpoint, { employees: [...input.employees, third] }, wirePolicy);
      for (const to of ['2026-12-06', '2026-12-20']) {
        await assert.rejects(generateViaProxy('manager', '2026-11-23', to),
          error => error.code === 'PLANNING_SOLVER_PROTOCOL_ERROR');
      }
      mismatch = 'old-worker';
      assert.equal(await supportsOrToolsFixedAlternation(proxyEndpoint, 2), false);
      await assert.rejects(generateViaProxy('manager', '2026-11-23', '2026-12-06'),
        error => error.code === 'FIXED_ALTERNATION_WEEKEND_REST_UNSUPPORTED');
      const retry = await new OrToolsPlanningSolver({ endpoint: proxyEndpoint }).solve(input);
      assert.equal(retry.diagnostics.fixedAlternationEvaluation, undefined);
    } finally {
      proxy.closeAllConnections();
      await new Promise(resolve => proxy.close(resolve));
    }
  } finally {
    worker.kill();
  }
});

