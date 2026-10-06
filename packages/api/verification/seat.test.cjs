const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const transform = (f) =>
  stripTypeScriptTypes(read(f), { mode: 'transform' })
    .replace(/^import .*;$/gm, '')
    .replace(/^export \{.*;$/gm, '')
    .replace(/export default class /g, 'class ');
(async () => {
  const ctx = { SeatDb: class {}, SeatAssignmentError: class extends Error {} };
  vm.createContext(ctx);
  vm.runInContext(
    transform('master/model/SeatAssignmentModel.ts') +
      '\n' +
      transform('master/class/SeatAssignment.ts') +
      '\nglobalThis.Business=SeatAssignment;',
    ctx,
  );
  let calls = 0;
  const business = new ctx.Business({
    change: async () => {
      calls++;
      return { assignmentId: 42, id: 42, secret: 'internal', replayed: false, released: true };
    },
  });
  const body = { employee_license_guid: 100031, actor_user_guid: '7173056141612204' };
  let result = await business.change(100020, body, 'ASSIGN');
  assert.equal(result.assigned, true);
  assert.equal(result.employee_license_guid, 100031);
  assert(!JSON.stringify(result).includes('42'));
  assert(!('secret' in result));
  result = await business.change(100020, body, 'RELEASE');
  assert.equal(result.released, true);
  assert(!('assignmentId' in result));
  await assert.rejects(() => business.change(1, body, 'ASSIGN'));
  await assert.rejects(() => business.change(100020, { ...body, actor_user_guid: '' }, 'ASSIGN'));
  assert.equal(calls, 2);
  const raw = stripTypeScriptTypes(read('master/database/db.seat-assignment.ts'));
  const { changeSeatAssignment } = await import(
    'data:text/javascript;base64,' + Buffer.from(raw).toString('base64')
  );
  let open = null,
    occupied = 0,
    active = true,
    eligible = true,
    rollback = false,
    writes = 0;
  const db = {
    transaction: async (cb) => {
      try {
        return await cb({});
      } catch (e) {
        rollback = true;
        throw e;
      }
    },
    query: async (sql, opt) => {
      let r = [];
      if (sql.startsWith('SELECT * FROM xa_global_license'))
        r = [{ id: 1, license_status: active ? 'ACTIVE' : 'EXPIRED' }];
      else if (sql.startsWith('SELECT * FROM xa_employee_license'))
        r = [{ id: 2, global_license: 1 }];
      else if (sql.startsWith('SELECT * FROM xa_seat_assignment')) r = open ? [open] : [];
      else if (sql.includes(' AS eligible')) r = [{ eligible }];
      else if (sql.startsWith('SELECT * FROM xa_paid_seat_grant'))
        r = [{ billing_cycle: 3, valid_until: '2026-11-01T00:00:00Z' }];
      else if (sql.includes('SUM(seats)')) r = [{ seats: 5 }];
      else if (sql.includes(' AS occupied')) r = [{ occupied }];
      else if (sql.startsWith('INSERT INTO xa_seat_assignment')) {
        writes++;
        assert.equal(opt.replacements.actor, body.actor_user_guid);
        r = [{ id: 42 }];
      }
      return [r, {}];
    },
  };
  const input = {
    licenseGuid: 100020,
    employeeLicenseGuid: 100031,
    actorUserGuid: body.actor_user_guid,
  };
  assert.equal((await changeSeatAssignment(db, input, 'ASSIGN')).replayed, false);
  assert.equal(writes, 1);
  open = { id: 42 };
  assert.equal((await changeSeatAssignment(db, input, 'ASSIGN')).replayed, true);
  assert.equal(writes, 1);
  assert.equal((await changeSeatAssignment(db, input, 'RELEASE')).released, true);
  open = null;
  assert.equal((await changeSeatAssignment(db, input, 'RELEASE')).released, false);
  occupied = 5;
  await assert.rejects(() => changeSeatAssignment(db, input, 'ASSIGN'), /No paid place/);
  assert(rollback);
  occupied = 0;
  active = false;
  await assert.rejects(() => changeSeatAssignment(db, input, 'ASSIGN'), /not active/);
  active = true;
  eligible = false;
  await assert.rejects(() => changeSeatAssignment(db, input, 'ASSIGN'), /not eligible/);
  for (const dir of ['database', 'model', 'class', 'routes', 'services'])
    for (const name of fs.readdirSync(path.join(root, 'master', dir))) {
      const text = read(`master/${dir}/${name}`);
      stripTypeScriptTypes(text, { mode: 'transform' });
      if (dir !== 'database') assert(!/\b(SELECT|INSERT INTO|UPDATE xa_|DELETE FROM)\b/.test(text));
    }
  assert(!read('master/routes/seat.assignment.route.ts').includes('../database/'));
  console.log(
    'PASS: public GUID projection, delegation, assignment/replay/release, capacity, eligibility, errors and syntax; SQL mocked.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
