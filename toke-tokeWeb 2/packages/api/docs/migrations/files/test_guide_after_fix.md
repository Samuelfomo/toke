# Guide de Test - Après Correction des Colonnes Générées

## Étape 1: Appliquer les Corrections

1. **Remplacer GlobalLicenseModel.ts**
   - Chemin: `packages/api/src/master/model/GlobalLicenseModel.ts`
   - Remplacer par: `GlobalLicenseModel_FIXED.ts`

2. **Remplacer GlobalLicense.ts**
   - Chemin: `packages/api/src/master/class/GlobalLicense.ts`
   - Remplacer par: `GlobalLicense_FIXED.ts`

3. **Redémarrer le serveur**
   ```bash
   npm run dev
   # ou
   pm2 restart toke-api
   ```

---

## Étape 2: Tests Unitaires des Modèles

### Test 1: Chargement d'une Licence par Tenant
```bash
curl -X GET "{{baseUrl}}/billing/current-license" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu:**
```json
{
  "success": true,
  "data": {
    "guid": 123456,
    "license_type": "STANDARD",
    "billing_cycle_months": 1,
    "base_price_usd": 3.0,
    "minimum_seats": 5,
    "current_period_start": "2025-10-01T00:00:00.000Z",
    "current_period_end": "2025-10-31T23:59:59.999Z",
    "next_renewal_date": "2025-11-01T00:00:00.000Z",
    "total_seats_purchased": 8,  // ✅ Doit être présent
    "license_status": "ACTIVE",
    "tenant": {...}
  }
}
```

**❌ Avant correction:**
```json
{
  "success": false,
  "error": {
    "code": "search_failed",
    "message": "Failed to calculate current cost",
    "details": "column \"total_seats_purchased\" does not exist"
  }
}
```

---

### Test 2: Liste des Employés Billables
```bash
curl -X GET "{{baseUrl}}/billing/billable-employees" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu:**
```json
{
  "success": true,
  "data": {
    "count": 8,
    "billable_employees": [
      {
        "employee_guid": 789012,
        "full_name": "John Doe",
        "is_billable": true,
        "license_start_date": "2025-10-15T00:00:00.000Z"
      }
    ]
  }
}
```

---

### Test 3: Coût Actuel de la Période
```bash
curl -X GET "{{baseUrl}}/billing/current-cost" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu:**
```json
{
  "success": true,
  "data": {
    "base_cost_usd": 24.0,  // 8 seats × $3
    "tax_amount_usd": 4.32,  // 18% TVA
    "total_cost_usd": 28.32,
    "total_cost_local": 17000,  // En XAF
    "currency": "XAF",
    "seats_charged": 8,
    "minimum_seats": 5,
    "period_start": "2025-10-01T00:00:00.000Z",
    "period_end": "2025-10-31T23:59:59.999Z"
  }
}
```

---

### Test 4: Aperçu de Fin de Période
```bash
curl -X GET "{{baseUrl}}/billing/period-preview" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu:**
```json
{
  "success": true,
  "data": {
    "projected_total_usd": 28.32,
    "projected_total_local": 17000,
    "breakdown": {
      "base_price_per_seat": 3.0,
      "seats_to_charge": 8,
      "subtotal": 24.0,
      "tax_rate": 0.18,
      "tax_amount": 4.32,
      "total": 28.32
    },
    "currency": "XAF",
    "exchange_rate": 600.0,
    "period_info": {
      "start": "2025-10-01T00:00:00.000Z",
      "end": "2025-10-31T23:59:59.999Z",
      "days_remaining": 7
    }
  }
}
```

---

## Étape 3: Tests d'Intégration

### Test 5: Création d'une Licence
```bash
curl -X POST "{{baseUrl}}/admin/global-license/create" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": 1,
    "license_type": "STANDARD",
    "billing_cycle_months": 1,
    "base_price_usd": 3.0,
    "minimum_seats": 5,
    "current_period_start": "2025-11-01T00:00:00.000Z",
    "current_period_end": "2025-11-30T23:59:59.999Z",
    "next_renewal_date": "2025-12-01T00:00:00.000Z"
  }'
```

**Vérifications:**
- ✅ La licence est créée sans erreur
- ✅ `total_seats_purchased` est automatiquement calculé à 0
- ✅ Pas de tentative d'insertion de `total_seats_purchased`

---

### Test 6: Mise à Jour d'une Licence
```bash
curl -X PUT "{{baseUrl}}/admin/global-license/update/123456" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "base_price_usd": 3.5,
    "minimum_seats": 10
  }'
```

**Vérifications:**
- ✅ La mise à jour fonctionne
- ✅ `total_seats_purchased` reste calculé automatiquement
- ✅ Pas de tentative de mise à jour de `total_seats_purchased`

---

### Test 7: Ajout d'un Employé Billable
```bash
curl -X POST "{{baseUrl}}/employee-license/assign" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_guid": 789012,
    "license_start_date": "2025-10-24T00:00:00.000Z"
  }'
```

**Vérifications:**
- ✅ L'employé est assigné
- ✅ Le trigger PostgreSQL met à jour `total_seats_purchased`
- ✅ GET /billing/current-license montre `total_seats_purchased` incrémenté

---

### Test 8: Retrait d'un Employé Billable
```bash
curl -X DELETE "{{baseUrl}}/employee-license/revoke/789012" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Vérifications:**
- ✅ La licence de l'employé est révoquée
- ✅ Le trigger PostgreSQL met à jour `total_seats_purchased`
- ✅ GET /billing/current-license montre `total_seats_purchased` décrémenté

---

## Étape 4: Tests de Charge

### Test 9: Requêtes Multiples Simultanées
```bash
# Lancer 10 requêtes en parallèle
for i in {1..10}; do
  curl -X GET "{{baseUrl}}/billing/current-license" \
    -H "Authorization: Bearer YOUR_TOKEN" &
done
wait
```

**Vérifications:**
- ✅ Toutes les requêtes réussissent
- ✅ Pas d'erreur "column does not exist"
- ✅ Les résultats sont cohérents

---

## Étape 5: Vérification des Logs

### Logs à Surveiller
```bash
# Vérifier qu'il n'y a plus d'erreurs Sequelize
tail -f /var/log/toke-api/error.log | grep "total_seats_purchased"

# Doit afficher: rien (aucune erreur)
```

### Logs Attendus (Succès)
```
🟢 Licence globale créée - Tenant: 1 | Type: STANDARD | GUID: 123456
✅ Licence globale créée avec ID: 42
✅ Colonnes calculées chargées pour GUID: 123456
```

---

## Étape 6: Validation PostgreSQL Directe

### Vérifier que la Colonne Générée Fonctionne
```sql
-- Se connecter à PostgreSQL
psql -U toke_user -d toke_db

-- Vérifier la définition de la colonne
SELECT 
  column_name, 
  is_nullable, 
  column_default,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_name = 'xa_global_license'
  AND column_name = 'total_seats_purchased';

-- Résultat attendu:
-- column_name: total_seats_purchased
-- is_generated: ALWAYS
-- generation_expression: (SELECT count(...)...)
```

### Test Direct en SQL
```sql
-- Voir la valeur calculée
SELECT 
  guid,
  tenant,
  total_seats_purchased,
  minimum_seats
FROM xa_global_license
WHERE tenant = 1;

-- Vérifier que total_seats_purchased correspond au nombre d'employés billables
SELECT 
  gl.guid,
  gl.total_seats_purchased,
  COUNT(el.id) as actual_count
FROM xa_global_license gl
LEFT JOIN xa_employee_license el ON el.tenant = gl.tenant
  AND el.is_billable = true
  AND el.license_status = 'ACTIVE'
WHERE gl.tenant = 1
GROUP BY gl.guid, gl.total_seats_purchased;

-- Les deux valeurs doivent être identiques
```

---

## Checklist Finale

- [ ] Aucune erreur "column does not exist" dans les logs
- [ ] GET /billing/current-license fonctionne
- [ ] GET /billing/billable-employees fonctionne
- [ ] GET /billing/current-cost fonctionne
- [ ] GET /billing/period-preview fonctionne
- [ ] total_seats_purchased est correctement affiché dans toutes les réponses
- [ ] La création de licence fonctionne sans erreur
- [ ] La mise à jour de licence fonctionne sans erreur
- [ ] L'ajout d'employé met à jour total_seats_purchased
- [ ] Le retrait d'employé met à jour total_seats_purchased
- [ ] Les requêtes multiples ne causent pas d'erreurs
- [ ] Les logs montrent le chargement des colonnes calculées

---

## Troubleshooting

### Problème: "total_seats_purchased" still does not exist

**Cause:** Les migrations n'ont pas été appliquées correctement

**Solution:**
```bash
# Vérifier les migrations
npm run migration:status

# Réappliquer la migration si nécessaire
npm run migration:up -- --name 20250909100827-add-generated-columns-global-license.cjs
```

### Problème: total_seats_purchased est toujours 0

**Cause:** Les triggers ne sont pas créés ou ne fonctionnent pas

**Solution:**
```bash
# Vérifier les triggers
npm run migration:status

# Réappliquer les triggers
npm run migration:up -- --name 20250912113257-add-fraud-detection-triggers.cjs
npm run migration:up -- --name 20250912164045-add-activity-monitoring-triggers.cjs
```

### Problème: Raw queries sont lentes

**Cause:** Pas d'index sur les colonnes fréquemment recherchées

**Solution:**
```sql
-- Créer des index
CREATE INDEX IF NOT EXISTS idx_global_license_tenant ON xa_global_license(tenant);
CREATE INDEX IF NOT EXISTS idx_global_license_guid ON xa_global_license(guid);
CREATE INDEX IF NOT EXISTS idx_employee_license_tenant ON xa_employee_license(tenant);
```

---

## Performances Attendues

| Endpoint | Temps de Réponse | Notes |
|----------|------------------|-------|
| GET /billing/current-license | < 100ms | Avec raw query |
| GET /billing/billable-employees | < 150ms | Avec JOIN |
| GET /billing/current-cost | < 100ms | Calcul simple |
| GET /billing/period-preview | < 150ms | Avec calculs |

---

## Prochaines Étapes

Après validation des tests ci-dessus:

1. Appliquer les mêmes corrections aux autres modèles utilisant des colonnes générées
2. Documenter le pattern pour les futurs développeurs
3. Ajouter des tests unitaires automatisés
4. Mettre à jour la documentation API

---

## Contacts en Cas de Problème

- Vérifier la migration: `20250909100827-add-generated-columns-global-license.cjs`
- Vérifier les triggers: `20250912113257-add-fraud-detection-triggers.cjs`
- Consulter: `fix_generated_columns.md` pour les détails techniques
