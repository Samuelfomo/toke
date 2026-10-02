import { Transaction } from 'sequelize';
import type { Sequelize } from 'sequelize';
export class RenewalPreviewError extends Error {}
export function renewalSubtotal(price:unknown,seats:number,months:number):string{
 if(typeof price!=='string'&&typeof price!=='number')throw new RenewalPreviewError('Invalid price');
 const match=/^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(price));
 if(!match||!Number.isSafeInteger(seats)||seats<0||![1,3,6,12].includes(months))throw new RenewalPreviewError('Invalid renewal parameters');
 const cents=(BigInt(match[1])*100n+BigInt((match[2]??'').padEnd(2,'0')))*BigInt(seats)*BigInt(months);
 if(cents>999999999999n)throw new RenewalPreviewError('Amount exceeds supported precision');
 return `${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
}
export type RenewalPreview = Awaited<ReturnType<typeof calculateRenewalPreview>>;
export async function previewRenewal(db:Sequelize,licenseGuid:number):Promise <RenewalPreview>{
 if(!Number.isInteger(licenseGuid)||licenseGuid<100000||licenseGuid>999999)throw new RenewalPreviewError('Invalid license GUID');
 return db.transaction<RenewalPreview>({isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ},transaction=>calculateRenewalPreview(db,licenseGuid,transaction));
}
export async function calculateRenewalPreview(db:Sequelize,licenseGuid:number,transaction:Transaction){
  async function rows(sql:string,replacements:Record <string,any>={}):Promise <any[]>{const [result]=await db.query(sql,{transaction,replacements});return result as any[];}
  const license=(await rows('SELECT * FROM xa_global_license WHERE guid= :guid',{guid:licenseGuid}))[0];
  if(!license)throw new RenewalPreviewError('License not found');
  if(!['ACTIVE','PENDING_PAYMENT','EXPIRED'].includes(license.license_status))throw new RenewalPreviewError('License requires review before renewal');
  if(!license.current_period_end||!license.next_renewal_date||new Date(license.current_period_end).getTime()!==new Date(license.next_renewal_date).getTime())throw new RenewalPreviewError('Renewal dates require reconciliation');
  const months=Number(license.billing_cycle_months),minimum=Number(license.minimum_seats);
  if(![1,3,6,12].includes(months)||!Number.isSafeInteger(minimum)||minimum<5)throw new RenewalPreviewError('Invalid billing cycle or minimum seats');
  const timezoneRow=(await rows('SELECT timezone FROM xa_tenant WHERE id = :id',{id:license.tenant}))[0];
  const timezone=timezoneRow?.timezone || 'UTC';
  if(!(await rows('SELECT name FROM pg_timezone_names WHERE name = :zone',{zone:timezone})).length)throw new RenewalPreviewError('Invalid billing timezone');
  const period=(await rows(`SELECT CAST(:start AS timestamptz) AS period_start,
   ((CAST(:start AS timestamptz) AT TIME ZONE :zone) + make_interval(months => CAST(:months AS integer))) AT TIME ZONE :zone AS period_end`,{start:license.current_period_end,months,zone:timezone}))[0];
  const statuses=await rows(`SELECT public.license_employee_billing_status(id,CAST(:at AS timestamptz))::text AS status,COUNT(*) AS count
   FROM xa_employee_license WHERE global_license= :license GROUP BY status`,{license:license.id,at:period.period_start});
  const counts:Record <string,number>={BILLABLE:0,NON_BILLABLE:0,TERMINATED:0};
  for(const row of statuses){if(!(row.status in counts)||!Number.isSafeInteger(Number(row.count))||Number(row.count)<0)throw new RenewalPreviewError('Invalid billing count');counts[row.status]=Number(row.count);}
  const seats=Math.max(minimum,counts.BILLABLE);
  const legacy=(await rows(`SELECT COUNT(*) AS count FROM xa_employee_license el WHERE global_license= :license
   AND declared_long_leave AND NOT EXISTS(SELECT 1 FROM xa_employee_leave l WHERE l.employee_license=el.id)`,{license:license.id}))[0];
  return {license_guid:licenseGuid,period_start:period.period_start,period_end:period.period_end,
   billing_cycle_months:months,minimum_seats:minimum,billable_employees:counts.BILLABLE,billed_seats:seats,
   employee_status_counts:counts,unit_price_usd:String(license.base_price_usd),
   subtotal_usd:renewalSubtotal(license.base_price_usd,seats,months),
   legacy_undated_leaves:Number(legacy.count),reconciliation_required:Number(legacy.count)>0,
   is_estimate:true,taxes_included:false,calendar_timezone:timezone};
}

