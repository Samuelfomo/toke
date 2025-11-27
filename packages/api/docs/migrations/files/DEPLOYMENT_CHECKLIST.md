# ✅ Checklist de Déploiement - Fix Colonnes Générées

## 📦 Phase 1: Préparation (5 min)

### Vérifications Préalables
- [ ] J'ai lu `EXECUTIVE_SUMMARY.md`
- [ ] J'ai lu `fix_generated_columns.md`
- [ ] J'ai accès aux serveurs de développement/production
- [ ] J'ai les droits de modification du code
- [ ] J'ai une sauvegarde récente de la base de données

### Fichiers Nécessaires
- [ ] `GlobalLicenseModel_FIXED.ts` disponible
- [ ] `GlobalLicense_FIXED.ts` disponible
- [ ] `test_guide_after_fix.md` disponible
- [ ] `diagnostic_generated_columns.sh` disponible

---

## 🔧 Phase 2: Backup (5 min)

### Backup du Code
```bash
cd packages/api/src/master

# Backup Model
cp model/GlobalLicenseModel.ts model/GlobalLicenseModel.ts.backup-$(date +%Y%m%d-%H%M%S)

# Backup Class
cp class/GlobalLicense.ts class/GlobalLicense.ts.backup-$(date +%Y%m%d-%H%M%S)
```

- [ ] Backup de `GlobalLicenseModel.ts` effectué
- [ ] Backup de `GlobalLicense.ts` effectué
- [ ] Backups vérifiés (fichiers existent avec timestamp)

### Backup de la Base de Données (Optionnel mais Recommandé)
```bash
pg_dump -U toke_user -d toke_db > backup_before_fix_$(date +%Y%m%d-%H%M%S).sql
```

- [ ] Backup de la base effectué (optionnel)

---

## 🚀 Phase 3: Déploiement (10 min)

### Environnement de Développement

#### Étape 1: Copier les Fichiers Corrigés
```bash
cd packages/api/src/master

# Copier Model
cp /path/to/GlobalLicenseModel_FIXED.ts model/GlobalLicenseModel.ts

# Copier Class  
cp /path/to/GlobalLicense_FIXED.ts class/GlobalLicense.ts
```

- [ ] `GlobalLicenseModel.ts` remplacé
- [ ] `GlobalLicense.ts` remplacé
- [ ] Aucune erreur de syntaxe TypeScript visible

#### Étape 2: Compiler (si nécessaire)
```bash
npm run build
# ou
tsc
```

- [ ] Compilation réussie
- [ ] Aucune erreur TypeScript
- [ ] Aucun warning critique

#### Étape 3: Redémarrer le Serveur
```bash
npm run dev
# ou
pm2 restart toke-api
# ou
systemctl restart toke-api
```

- [ ] Serveur redémarré
- [ ] Serveur démarré sans erreur
- [ ] API accessible (GET /health ou équivalent)

---

## 🧪 Phase 4: Tests Fonctionnels (15 min)

### Tests Critiques

#### Test 1: Current License
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
    "total_seats_purchased": 8,  // ✅ Doit être présent
    ...
  }
}
```

- [ ] ✅ Request successful (HTTP 200)
- [ ] ✅ `total_seats_purchased` présent dans la réponse
- [ ] ✅ Valeur cohérente avec le nombre d'employés
- [ ] ❌ Aucune erreur "column does not exist"

#### Test 2: Billable Employees
```bash
curl -X GET "{{baseUrl}}/billing/billable-employees" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

- [ ] ✅ Request successful (HTTP 200)
- [ ] ✅ Liste des employés retournée
- [ ] ✅ Nombre correspond à `total_seats_purchased`
- [ ] ❌ Aucune erreur

#### Test 3: Current Cost
```bash
curl -X GET "{{baseUrl}}/billing/current-cost" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

- [ ] ✅ Request successful (HTTP 200)
- [ ] ✅ Calcul du coût correct
- [ ] ✅ `seats_charged` correspond à `total_seats_purchased`
- [ ] ❌ Aucune erreur

#### Test 4: Period Preview
```bash
curl -X GET "{{baseUrl}}/billing/period-preview" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

- [ ] ✅ Request successful (HTTP 200)
- [ ] ✅ Prévisions cohérentes
- [ ] ✅ Breakdown complet
- [ ] ❌ Aucune erreur

### Tests Secondaires

#### Test 5: Création de Licence (si applicable)
```bash
curl -X POST "{{baseUrl}}/admin/global-license/create" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

- [ ] ✅ Création réussie
- [ ] ✅ `total_seats_purchased` initialisé à 0
- [ ] ❌ Pas d'erreur "cannot insert generated column"

#### Test 6: Mise à Jour de Licence (si applicable)
```bash
curl -X PUT "{{baseUrl}}/admin/global-license/update/123456" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

- [ ] ✅ Mise à jour réussie
- [ ] ✅ `total_seats_purchased` reste calculé automatiquement
- [ ] ❌ Pas d'erreur sur la colonne générée

---

## 📊 Phase 5: Vérification des Logs (5 min)

### Logs d'Application
```bash
tail -n 100 /var/log/toke-api/error.log | grep -i "total_seats"
# ou
pm2 logs toke-api --lines 100 | grep -i "total_seats"
```

- [ ] ❌ Aucune erreur "does not exist"
- [ ] ❌ Aucune erreur Sequelize
- [ ] ✅ Logs propres

### Logs PostgreSQL
```bash
tail -n 100 /var/log/postgresql/postgresql-*.log | grep -i "total_seats"
```

- [ ] ❌ Aucune erreur SQL
- [ ] ✅ Requêtes s'exécutent normalement

---

## 🔍 Phase 6: Diagnostic Automatisé (5 min)

### Exécuter le Script de Diagnostic
```bash
chmod +x diagnostic_generated_columns.sh
./diagnostic_generated_columns.sh
```

**Résultat attendu:**
```
✅ Diagnostic complet - Tout fonctionne correctement
```

- [ ] ✅ Script exécuté sans erreur
- [ ] ✅ Connexion PostgreSQL OK
- [ ] ✅ Table xa_global_license existe
- [ ] ✅ Colonne total_seats_purchased est générée
- [ ] ✅ Calcul correct
- [ ] ✅ Triggers présents
- [ ] ✅ Performance acceptable (< 200ms)

---

## 📈 Phase 7: Tests de Performance (5 min)

### Test de Charge Basique
```bash
# 10 requêtes simultanées
for i in {1..10}; do
  curl -X GET "{{baseUrl}}/billing/current-license" \
    -H "Authorization: Bearer YOUR_TOKEN" &
done
wait
```

- [ ] ✅ Toutes les requêtes réussies
- [ ] ✅ Pas de timeout
- [ ] ✅ Temps de réponse < 200ms en moyenne
- [ ] ❌ Aucune erreur de concurrence

### Monitoring
```bash
# CPU/Mémoire
top -p $(pgrep -f toke-api)

# Connections PostgreSQL
psql -U toke_user -d toke_db -c "SELECT count(*) FROM pg_stat_activity WHERE datname='toke_db';"
```

- [ ] CPU < 80%
- [ ] Mémoire stable
- [ ] Pas de fuite mémoire
- [ ] Connections PostgreSQL normales (< 20)

---

## 📝 Phase 8: Documentation (5 min)

### Mise à Jour de la Documentation
- [ ] Changelog mis à jour avec la correction
- [ ] Documentation API vérifiée (total_seats_purchased documenté)
- [ ] Notes de version préparées
- [ ] Équipe informée du déploiement

### Communication
- [ ] Message Slack/Teams envoyé à l'équipe
- [ ] Ticket Jira/GitHub mis à jour
- [ ] Stakeholders informés

---

## ✅ Phase 9: Validation Finale (5 min)

### Checklist Finale

#### Fonctionnalité
- [ ] ✅ Tous les endpoints billing fonctionnent
- [ ] ✅ `total_seats_purchased` visible dans toutes les réponses
- [ ] ✅ Calculs corrects
- [ ] ✅ Performance acceptable

#### Stabilité
- [ ] ✅ Aucune erreur dans les logs (30 min de monitoring)
- [ ] ✅ Serveur stable
- [ ] ✅ Base de données stable
- [ ] ✅ Pas de regression sur autres endpoints

#### Documentation
- [ ] ✅ Changelog mis à jour
- [ ] ✅ Équipe informée
- [ ] ✅ Tests documentés

---

## 🎯 Phase 10: Déploiement en Production (si DEV OK)

### Pré-Production (si applicable)
- [ ] Tests en pré-production effectués
- [ ] Validation QA obtenue
- [ ] Approbation du chef de projet

### Production
```bash
# Sur le serveur de production
cd /path/to/production/packages/api/src/master

# Backup
cp model/GlobalLicenseModel.ts model/GlobalLicenseModel.ts.backup-prod-$(date +%Y%m%d-%H%M%S)
cp class/GlobalLicense.ts class/GlobalLicense.ts.backup-prod-$(date +%Y%m%d-%H%M%S)

# Déploiement
cp /path/to/GlobalLicenseModel_FIXED.ts model/GlobalLicenseModel.ts
cp /path/to/GlobalLicense_FIXED.ts class/GlobalLicense.ts

# Build & Restart
npm run build:prod
pm2 restart toke-api-prod
```

- [ ] Backup production effectué
- [ ] Fichiers copiés
- [ ] Build production réussi
- [ ] Redémarrage production réussi
- [ ] Tests smoke en production OK (3 tests critiques minimum)
- [ ] Monitoring actif (alertes configurées)

### Rollback Plan (en cas de problème)
```bash
# Restaurer les backups
cp model/GlobalLicenseModel.ts.backup-prod-TIMESTAMP model/GlobalLicenseModel.ts
cp class/GlobalLicense.ts.backup-prod-TIMESTAMP class/GlobalLicense.ts

# Rebuild & Restart
npm run build:prod
pm2 restart toke-api-prod
```

- [ ] Plan de rollback testé
- [ ] Temps de rollback estimé: < 5 min

---

## 📊 Métriques de Succès

### Avant le Fix
- ❌ GET /billing/current-license: 100% échec
- ❌ GET /billing/billable-employees: 100% échec
- ❌ GET /billing/current-cost: 100% échec
- ❌ GET /billing/period-preview: 100% échec

### Après le Fix (Objectifs)
- ✅ GET /billing/current-license: 100% succès
- ✅ GET /billing/billable-employees: 100% succès
- ✅ GET /billing/current-cost: 100% succès
- ✅ GET /billing/period-preview: 100% succès
- ✅ Temps de réponse moyen: < 150ms
- ✅ Aucune erreur de colonne dans les logs
- ✅ Uptime: 99.9%+

---

## 🎉 Conclusion

### Si Tous les Tests Passent ✅
**🎊 Félicitations ! Le déploiement est un succès !**

- Tous les endpoints billing fonctionnent
- Les colonnes générées sont correctement gérées
- Les performances sont optimales
- La stabilité est assurée

### Si Certains Tests Échouent ❌
**⚠️ Ne pas déployer en production**

1. Consulter `test_guide_after_fix.md` → Section Troubleshooting
2. Vérifier les logs d'erreur
3. Exécuter `diagnostic_generated_columns.sh`
4. Contacter le support si nécessaire
5. Effectuer un rollback si déjà en production

---

## 📞 Contacts / Support

- **Documentation technique:** `fix_generated_columns.md`
- **Guide de test:** `test_guide_after_fix.md`
- **Résumé:** `EXECUTIVE_SUMMARY.md`
- **Script diagnostic:** `diagnostic_generated_columns.sh`

---

**Date de création:** 2025-10-24  
**Version:** 1.0  
**Temps estimé total:** 60 minutes (dev + tests)
**Criticité:** 🔴 HAUTE - Bloque tous les endpoints billing
