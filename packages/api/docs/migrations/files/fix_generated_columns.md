# Fix: Colonnes Générées PostgreSQL avec Sequelize

## Problème
Les colonnes générées par PostgreSQL (GENERATED COLUMNS) ne peuvent pas être sélectionnées explicitement par Sequelize. L'erreur `column "total_seats_purchased" does not exist` survient car Sequelize tente de les inclure dans les SELECT.

## Colonnes Concernées

### xa_global_license
- `total_seats_purchased` - Calculée depuis xa_employee_license
- `billing_status` (si existe) - Colonne générée

### Autres tables potentielles
Vérifier toutes les migrations qui créent des GENERATED COLUMNS.

---

## Solution 1: Modifier GlobalLicenseModel.ts

### Avant (INCORRECT)
```typescript
export default class GlobalLicenseModel extends BaseModel {
  public readonly db = {
    tableName: tableName.GLOBAL_LICENSE,
    id: 'id',
    guid: 'guid',
    tenant: 'tenant',
    // ... autres colonnes ...
    total_seats_purchased: 'total_seats_purchased', // ❌ Colonne générée
    license_status: 'license_status',
  } as const;

  protected total_seats_purchased?: number; // ❌ Ne devrait pas être dans le modèle de base
}
```

### Après (CORRECT)
```typescript
export default class GlobalLicenseModel extends BaseModel {
  public readonly db = {
    tableName: tableName.GLOBAL_LICENSE,
    id: 'id',
    guid: 'guid',
    tenant: 'tenant',
    license_type: 'license_type',
    billing_cycle_months: 'billing_cycle_months',
    base_price_usd: 'base_price_usd',
    minimum_seats: 'minimum_seats',
    current_period_start: 'current_period_start',
    current_period_end: 'current_period_end',
    next_renewal_date: 'next_renewal_date',
    // ❌ SUPPRIMER: total_seats_purchased: 'total_seats_purchased',
    license_status: 'license_status',
  } as const;

  // Colonnes de base (stockées physiquement)
  protected id?: number;
  protected guid?: number;
  protected tenant?: number;
  protected license_type?: Type;
  protected billing_cycle_months?: BillingCycle;
  protected base_price_usd?: number;
  protected minimum_seats?: number;
  protected current_period_start?: Date;
  protected current_period_end?: Date;
  protected next_renewal_date?: Date;
  // ❌ SUPPRIMER: protected total_seats_purchased?: number;
  protected license_status?: LicenseStatus;

  // ✅ Colonnes calculées (lecture seule, chargées séparément)
  private _total_seats_purchased?: number;
  
  protected constructor() {
    super();
  }
}
```

---

## Solution 2: Méthode pour Charger les Colonnes Calculées

Ajouter une méthode dédiée pour récupérer les colonnes générées :

```typescript
/**
 * Charge les colonnes calculées pour cette licence
 */
protected async loadComputedColumns(): Promise<void> {
  if (!this.guid) return;
  
  const result = await this.raw(`
    SELECT 
      total_seats_purchased,
      billing_status
    FROM xa_global_license
    WHERE guid = $1
  `, [this.guid]);
  
  if (result && result.length > 0) {
    this._total_seats_purchased = result[0].total_seats_purchased;
    // Autres colonnes calculées si nécessaire
  }
}

/**
 * Getter pour total_seats_purchased
 */
getTotalSeatsPurchased(): number {
  return this._total_seats_purchased || 0;
}
```

---

## Solution 3: Modifier la méthode find/load dans GlobalLicense.ts

```typescript
async load(
  identifier: any,
  byGuid: boolean = false,
  byTenant: boolean = false,
): Promise<GlobalLicense | null> {
  const data = byGuid
    ? await this.findByGuid(identifier)
    : byTenant
      ? await this.findByTenant(identifier)
      : await this.find(Number(identifier));

  if (!data) return null;
  
  const instance = this.hydrate(data);
  
  // ✅ Charger les colonnes calculées après hydratation
  await instance.loadComputedColumns();
  
  return instance;
}
```

---

## Solution 4: Méthode Alternative avec Raw Query

Si vous avez besoin de `total_seats_purchased` fréquemment, utilisez une raw query :

```typescript
protected async find(id: number): Promise<any> {
  // ✅ Utiliser raw query pour inclure les colonnes générées
  const result = await this.raw(`
    SELECT 
      gl.*,
      gl.total_seats_purchased
    FROM xa_global_license gl
    WHERE gl.id = $1
    LIMIT 1
  `, [id]);
  
  return result && result.length > 0 ? result[0] : null;
}

protected async findByGuid(guid: number): Promise<any> {
  const result = await this.raw(`
    SELECT 
      gl.*,
      gl.total_seats_purchased
    FROM xa_global_license gl
    WHERE gl.guid = $1
    LIMIT 1
  `, [guid]);
  
  return result && result.length > 0 ? result[0] : null;
}

protected async findByTenant(tenant: number): Promise<any> {
  const result = await this.raw(`
    SELECT 
      gl.*,
      gl.total_seats_purchased
    FROM xa_global_license gl
    WHERE gl.tenant = $1
    LIMIT 1
  `, [tenant]);
  
  return result && result.length > 0 ? result[0] : null;
}
```

---

## Solution 5: Méthode update() - Ne Jamais Mettre à Jour les Colonnes Générées

```typescript
protected async update(): Promise<void> {
  await this.validate();

  if (!this.id) {
    throw new Error('Global License ID is required for update');
  }

  const updateData: Record<string, any> = {};
  if (this.tenant !== undefined) updateData[this.db.tenant] = this.tenant;
  if (this.license_type !== undefined) updateData[this.db.license_type] = this.license_type;
  if (this.billing_cycle_months !== undefined)
    updateData[this.db.billing_cycle_months] = this.billing_cycle_months;
  if (this.base_price_usd !== undefined) updateData[this.db.base_price_usd] = this.base_price_usd;
  if (this.minimum_seats !== undefined) updateData[this.db.minimum_seats] = this.minimum_seats;
  if (this.current_period_start !== undefined)
    updateData[this.db.current_period_start] = this.current_period_start;
  if (this.current_period_end !== undefined)
    updateData[this.db.current_period_end] = this.current_period_end;
  if (this.next_renewal_date !== undefined)
    updateData[this.db.next_renewal_date] = this.next_renewal_date;
  // ❌ SUPPRIMER: if (this.total_seats_purchased !== undefined)
  //   updateData[this.db.total_seats_purchased] = this.total_seats_purchased;
  if (this.license_status !== undefined) updateData[this.db.license_status] = this.license_status;

  const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
  if (!affected) {
    throw new Error('Failed to update global master entry');
  }
  
  // ✅ Recharger les colonnes calculées après mise à jour
  await this.loadComputedColumns();
}
```

---

## Solution 6: Méthode create() - Supprimer l'Insertion de Colonnes Générées

```typescript
protected async create(): Promise<void> {
  await this.validate();

  const guid = await this.guidGenerator(this.db.tableName, 6);
  if (!guid) {
    throw new Error('Failed to generate GUID for global master entry');
  }

  const lastID = await this.insertOne(this.db.tableName, {
    [this.db.guid]: guid,
    [this.db.tenant]: this.tenant,
    [this.db.license_type]: this.license_type,
    [this.db.billing_cycle_months]: this.billing_cycle_months,
    [this.db.base_price_usd]: this.base_price_usd || 3.0,
    [this.db.minimum_seats]: this.minimum_seats || 5,
    [this.db.current_period_start]: this.current_period_start,
    [this.db.current_period_end]: this.current_period_end,
    [this.db.next_renewal_date]: this.next_renewal_date,
    // ❌ SUPPRIMER: [this.db.total_seats_purchased]: this.total_seats_purchased || 0,
    [this.db.license_status]: this.license_status || LicenseStatus.ACTIVE,
  });

  if (!lastID) {
    throw new Error('Failed to create global master entry');
  }

  this.id = typeof lastID === 'object' ? lastID.id : lastID;
  this.guid = guid;
  
  // ✅ Charger les colonnes calculées après création
  await this.loadComputedColumns();
}
```

---

## Solution 7: Modifier toJSON() dans GlobalLicense.ts

```typescript
async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
  const tenant = await this.getTenantObject();
  
  // ✅ S'assurer que les colonnes calculées sont chargées
  if (this._total_seats_purchased === undefined) {
    await this.loadComputedColumns();
  }

  const baseData = {
    [RS.GUID]: this.guid,
    [RS.LICENSE_TYPE]: this.license_type,
    [RS.BILLING_CYCLE_MONTHS]: this.billing_cycle_months,
    [RS.BASE_PRICE_USD]: this.base_price_usd,
    [RS.MINIMUM_SEATS]: this.minimum_seats,
    [RS.CURRENT_PERIOD_START]: this.current_period_start,
    [RS.CURRENT_PERIOD_END]: this.current_period_end,
    [RS.NEXT_RENEWAL_DATE]: this.next_renewal_date,
    [RS.TOTAL_SEATS_PURCHASED]: this._total_seats_purchased || 0, // ✅ Utiliser la propriété privée
    [RS.LICENSE_STATUS]: this.license_status,
  };

  if (view === responseValue.MINIMAL) {
    return {
      ...baseData,
      [RS.TENANT]: tenant?.getGuid(),
    };
  }

  return {
    ...baseData,
    [RS.TENANT]: tenant?.toJSON(),
  };
}
```

---

## Solution 8: BaseModel - Ajouter une méthode raw()

Si elle n'existe pas déjà dans `db.base.js`, ajouter :

```typescript
/**
 * Exécute une requête SQL brute
 */
protected async raw(query: string, params: any[] = []): Promise<any[]> {
  try {
    const [results] = await this.sequelize.query(query, {
      replacements: params,
      type: QueryTypes.SELECT,
    });
    return results as any[];
  } catch (error) {
    console.error('❌ Erreur raw query:', error);
    throw error;
  }
}
```

---

## Checklist de Vérification

- [ ] Supprimer `total_seats_purchased` de la définition `db` dans GlobalLicenseModel
- [ ] Supprimer `protected total_seats_purchased` de GlobalLicenseModel
- [ ] Ajouter `private _total_seats_purchased` à la place
- [ ] Ajouter la méthode `loadComputedColumns()`
- [ ] Ajouter le getter `getTotalSeatsPurchased()`
- [ ] Modifier `find()`, `findByGuid()`, `findByTenant()` pour utiliser raw queries
- [ ] Supprimer toute référence à `total_seats_purchased` dans `create()`
- [ ] Supprimer toute référence à `total_seats_purchased` dans `update()`
- [ ] Appeler `loadComputedColumns()` après chaque `load()`
- [ ] Mettre à jour `toJSON()` pour utiliser `_total_seats_purchased`
- [ ] Tester tous les endpoints concernés

---

## Endpoints à Tester Après Correction

1. `GET /billing/current-license` ✅
2. `GET /billing/billable-employees` ✅
3. `GET /billing/current-cost` ✅
4. `GET /billing/period-preview` ✅
5. Tous les endpoints utilisant GlobalLicense

---

## Notes Importantes

⚠️ **Les colonnes générées dans PostgreSQL :**
- Ne peuvent PAS être insérées manuellement
- Ne peuvent PAS être mises à jour manuellement  
- Sont calculées automatiquement par PostgreSQL
- Doivent être lues via SELECT mais PAS incluses dans la définition Sequelize

✅ **Bonnes pratiques :**
- Utiliser raw queries pour lire les colonnes générées
- Les stocker dans des propriétés privées (`_columnName`)
- Ne JAMAIS les inclure dans INSERT ou UPDATE
- Les recharger après chaque modification des données sources
