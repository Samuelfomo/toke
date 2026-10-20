import { Sequelize, Transaction } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';
import { decimalUnits } from '../../services/renewal-amounts.js';

import AdjustmentPreviewDb from './db.adjustment-preview.js';

export class AdjustmentIssuanceError extends Error {}
export class AdjustmentIssuanceConflict extends AdjustmentIssuanceError {}
export interface AdjustmentIssuanceInput {
  tenant: number;
  license: number;
  cycle: number;
  start: string;
  end: string;
  method: number;
  actor: string;
  key: string;
  coverageReference: string;
}
const eventType = 'USAGE_REGULARIZATION_ISSUED';
/** Persistance atomique uniquement. Le calcul de la facture est fourni par la classe métier. */
export default class AdjustmentIssuanceDb {
  constructor(private readonly connection?: Sequelize) {}
  async issue(i: AdjustmentIssuanceInput, calculate: (raw: any) => Record<string, any>) {
    const db = this.connection ?? TableInitializer.getModel('xa_license_adjustment').sequelize;
    if (!db) throw new Error('Master database unavailable');
    const request = {
      tenant_guid: i.tenant,
      license_guid: i.license,
      billing_cycle_guid: i.cycle,
      period_start: i.start,
      period_end: i.end,
      payment_method_guid: i.method,
      coverage_reference: i.coverageReference,
    };
    try {
      return await db.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
        async (transaction) => {
          const rows = async (sql: string, replacements: Record<string, any> = {}) => {
            const [result] = await db.query(sql, { transaction, replacements });
            return result as any[];
          };
          const l = (
            await rows(
              `SELECT l.id,l.tenant,c.id AS cycle_id,t.timezone FROM public.xa_global_license l
           JOIN public.xa_tenant t ON t.id=l.tenant JOIN public.xa_billing_cycle c ON c.global_license=l.id
           WHERE l.guid=:license AND t.guid=:tenant AND c.guid=:cycle FOR UPDATE OF l`,
              { license: i.license, tenant: i.tenant, cycle: i.cycle },
            )
          )[0];
          if (!l)
            throw new AdjustmentIssuanceError('Cycle or license does not belong to this tenant');
          const prior = (
            await rows(
              `SELECT e.guid AS event_guid,e.actor_user_guid,e.metadata,e.occurred_at AS issued_at,
             a.guid AS adjustment_guid,a.payment_due_date,a.payment_status,p.guid AS payment_transaction_guid,p.transaction_status
           FROM public.xa_license_event e
           JOIN public.xa_license_adjustment a ON a.guid=(e.new_payload->>'adjustment_guid')::integer AND a.global_license=e.global_license
           JOIN public.xa_payment_transaction p ON p.adjustment=a.id AND p.guid=(e.new_payload->>'payment_transaction_guid')::integer
           WHERE e.global_license=:license AND e.event_type=:type AND e.operation_key=:key`,
              { license: l.id, type: eventType, key: i.key },
            )
          )[0];
          if (prior) {
            const saved = prior.metadata?.request;
            if (
              prior.actor_user_guid !== i.actor ||
              !saved ||
              Object.keys(request).some(
                (key) => saved[key] !== request[key as keyof typeof request],
              )
            )
              throw new AdjustmentIssuanceConflict(
                'Idempotency key conflicts with the original issuance',
              );
            if (!prior.metadata?.snapshot)
              throw new AdjustmentIssuanceError('Issued snapshot requires reconciliation');
            return { ...prior, snapshot: prior.metadata.snapshot, replayed: true };
          }
          // A malformed old audit row must not silently allow reuse of its operation key.
          if (
            (
              await rows(
                'SELECT guid FROM public.xa_license_event WHERE global_license=:license AND event_type=:type AND operation_key=:key',
                { license: l.id, type: eventType, key: i.key },
              )
            ).length
          )
            throw new AdjustmentIssuanceError('Existing issuance requires reconciliation');
          const raw = await new AdjustmentPreviewDb(db).load(i, transaction);
          if (raw.existing_adjustment_guid)
            throw new AdjustmentIssuanceConflict(
              'A regularization already exists for this month; reuse its existing transaction',
            );
          const quote = calculate(raw);
          if (
            !quote.calculation_available ||
            !quote.requires_regularization ||
            !quote.total_amount_local
          )
            throw new AdjustmentIssuanceError(
              'Closed, fully covered, non-offered month with a positive surplus required; partial coverage needs review',
            );
          const method = (
            await rows('SELECT * FROM public.xa_payment_method WHERE guid=:guid AND active=true', {
              guid: i.method,
            })
          )[0];
          if (!method || !method.supported_currencies?.includes(quote.billing_currency_code))
            throw new AdjustmentIssuanceError(
              'Active payment method supporting billing currency required',
            );
          const usd = decimalUnits(quote.total_amount_usd, 2);
          if (
            usd < decimalUnits(method.min_amount_usd, 2) ||
            usd > decimalUnits(method.max_amount_usd, 2)
          )
            throw new AdjustmentIssuanceError('Amount outside payment method limits');
          const dates = (
            await rows(
              `SELECT CURRENT_TIMESTAMP AS issued_at,
           ((CURRENT_TIMESTAMP AT TIME ZONE :zone)+INTERVAL '7 days') AT TIME ZONE :zone AS due`,
              { zone: l.timezone || 'UTC' },
            )
          )[0];
          // Réutiliser la séquence interne d'identité existante ; aucune nouvelle séquence publique.
          const identity = (
            await rows(
              "SELECT nextval(pg_get_serial_sequence('public.xa_license_adjustment','id')) AS id",
            )
          )[0];
          const id = Number(identity.id),
            guid = 100000 + id;
          if (!Number.isSafeInteger(id) || id < 1 || guid > 999999)
            throw new AdjustmentIssuanceError('Adjustment GUID range exhausted');
          if (
            (await rows('SELECT id FROM public.xa_license_adjustment WHERE guid=:guid', { guid }))
              .length
          )
            throw new AdjustmentIssuanceConflict(
              'Adjustment GUID collision; no invoice was committed',
            );
          let paymentGuid: number | undefined;
          for (let n = 0; n < 32; n++) {
            const candidate = Number(
              (await rows("SELECT nextval('public.xa_renewal_payment_guid_seq') AS guid"))[0].guid,
            );
            if (
              !(
                await rows('SELECT id FROM public.xa_payment_transaction WHERE guid=:guid', {
                  guid: candidate,
                })
              ).length
            ) {
              paymentGuid = candidate;
              break;
            }
          }
          if (!paymentGuid)
            throw new AdjustmentIssuanceError('Payment GUID allocation requires reconciliation');
          const args = {
            ...quote,
            id,
            guid,
            license: l.id,
            cycle: l.cycle_id,
            tenant: l.tenant,
            start: i.start,
            end: i.end,
            issued: dates.issued_at,
            due: dates.due,
            taxes: JSON.stringify(
              raw.taxes.map((t: any) => ({
                guid: t.guid,
                tax_name: t.tax_name,
                tax_type: t.tax_type,
                tax_rate: String(t.tax_rate),
              })),
            ),
          };
          const a = (
            await rows(
              `INSERT INTO public.xa_license_adjustment(id,guid,global_license,billing_cycle,adjustment_kind,period_start,period_end,
           adjustment_date,employees_added_count,months_remaining,price_per_employee_usd,
           subtotal_usd,tax_amount_usd,total_amount_usd,billing_currency_code,exchange_rate_used,
           subtotal_local,tax_amount_local,total_amount_local,tax_rules_applied,payment_status,
           payment_due_immediately,invoice_sent_at,payment_due_date,created_at,updated_at)
           VALUES(:id,:guid,:license,:cycle,'USAGE_REGULARIZATION',:start,:end,:issued,:surplus_seats,1,:unit_price_usd,
           :subtotal_usd,:tax_amount_usd,:total_amount_usd,:billing_currency_code,:exchange_rate_used,
           :subtotal_local,:tax_amount_local,:total_amount_local,CAST(:taxes AS jsonb),'PENDING',false,:issued,:due,:issued,:issued)
           RETURNING id,guid,payment_status`,
              args,
            )
          )[0];
          const p = (
            await rows(
              `INSERT INTO public.xa_payment_transaction(guid,source_type,billing_cycle,adjustment,amount_usd,amount_local,currency_code,
           exchange_rate_used,payment_method,payment_reference,transaction_status,initiated_at,created_at,updated_at)
           VALUES(:payment,'ADJUSTMENT',NULL,:adjustment,:total_amount_usd,:total_amount_local,:billing_currency_code,
           :exchange_rate_used,:method,:reference,'PENDING',:issued,:issued,:issued) RETURNING guid,transaction_status`,
              {
                ...args,
                payment: paymentGuid,
                adjustment: a.id,
                method: method.id,
                reference: 'TOKE_USAGE_' + paymentGuid,
              },
            )
          )[0];
          const snapshot = {
            ...quote,
            is_estimate: false,
            can_issue: false,
            creates_debt: true,
            payment_due_date: dates.due,
            issued_at: dates.issued_at,
            data_completeness: 'ADMIN_ATTESTED',
            coverage_reference: i.coverageReference,
            employees: raw.employees.map((e: any) => ({
              employee_license_guid: e.employee_license_guid,
              active_days: e.active_days,
            })),
            tax_rules_applied: JSON.parse(args.taxes),
          };
          const payload = {
            adjustment_guid: a.guid,
            payment_transaction_guid: p.guid,
            billing_cycle_guid: i.cycle,
            adjustment_kind: 'USAGE_REGULARIZATION',
            period_start: i.start,
            period_end: i.end,
            payment_due_date: dates.due,
            total_amount_local: quote.total_amount_local,
            billing_currency_code: quote.billing_currency_code,
            payment_status: 'PENDING',
          };
          const event = (
            await rows(
              `INSERT INTO public.xa_license_event(tenant,global_license,event_type,operation_key,actor_type,actor_user_guid,
           effective_at,previous_payload,new_payload,reason,metadata)
           VALUES(:tenant,:license,:type,:key,'USER',:actor,:issued,'{}',CAST(:payload AS jsonb),:reason,CAST(:metadata AS jsonb))
           RETURNING guid`,
              {
                ...args,
                type: eventType,
                key: i.key,
                actor: i.actor,
                payload: JSON.stringify(payload),
                reason: 'Monthly observed usage exceeds capacity paid for the full month',
                metadata: JSON.stringify({ request, snapshot }),
              },
            )
          )[0];
          return {
            adjustment_guid: a.guid,
            payment_transaction_guid: p.guid,
            event_guid: event.guid,
            snapshot,
            issued_at: dates.issued_at,
            payment_due_date: dates.due,
            payment_status: a.payment_status,
            transaction_status: p.transaction_status,
            replayed: false,
          };
        },
      );
    } catch (error: any) {
      if (
        error?.original?.code === '23505' ||
        error?.parent?.code === '23505' ||
        error?.original?.code === '40001' ||
        error?.parent?.code === '40001'
      )
        throw new AdjustmentIssuanceConflict(
          'Concurrent issuance conflict; consult the existing adjustment and retry with the same key',
        );
      throw error;
    }
  }
}
