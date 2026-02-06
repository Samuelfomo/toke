#!/bin/bash

# 🔍 Script de Diagnostic - Colonnes Générées PostgreSQL
# Ce script vérifie que les colonnes générées sont correctement configurées

echo "======================================"
echo "🔍 Diagnostic des Colonnes Générées"
echo "======================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration PostgreSQL (à adapter)
DB_NAME="${DB_NAME:-toke_db}"
DB_USER="${DB_USER:-toke_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Fonction pour exécuter une requête SQL
run_query() {
    local query="$1"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$query" 2>/dev/null
}

# 1. Vérifier la connexion PostgreSQL
echo "1️⃣ Vérification de la connexion PostgreSQL..."
if run_query "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connexion PostgreSQL OK${NC}"
else
    echo -e "${RED}❌ Impossible de se connecter à PostgreSQL${NC}"
    echo "   Vérifiez les variables d'environnement: DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT"
    exit 1
fi
echo ""

# 2. Vérifier que la table xa_global_license existe
echo "2️⃣ Vérification de la table xa_global_license..."
TABLE_EXISTS=$(run_query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'xa_global_license')")
if [ "$TABLE_EXISTS" = "t" ]; then
    echo -e "${GREEN}✅ Table xa_global_license existe${NC}"
else
    echo -e "${RED}❌ Table xa_global_license n'existe pas${NC}"
    exit 1
fi
echo ""

# 3. Vérifier la colonne total_seats_purchased
echo "3️⃣ Vérification de la colonne total_seats_purchased..."
COLUMN_INFO=$(run_query "SELECT column_name, data_type, is_generated, generation_expression FROM information_schema.columns WHERE table_name = 'xa_global_license' AND column_name = 'total_seats_purchased'")

if [ -z "$COLUMN_INFO" ]; then
    echo -e "${RED}❌ Colonne total_seats_purchased n'existe pas${NC}"
    echo "   Action: Exécuter la migration 20250909100827-add-generated-columns-global-license.cjs"
    exit 1
fi

IS_GENERATED=$(echo "$COLUMN_INFO" | cut -d'|' -f3)
if [ "$IS_GENERATED" = "ALWAYS" ]; then
    echo -e "${GREEN}✅ Colonne total_seats_purchased est une colonne générée${NC}"
    echo "   Type: $(echo "$COLUMN_INFO" | cut -d'|' -f2)"
    echo "   Expression: $(echo "$COLUMN_INFO" | cut -d'|' -f4 | head -c 50)..."
else
    echo -e "${YELLOW}⚠️  Colonne total_seats_purchased existe mais n'est PAS générée${NC}"
    echo "   Action: Vérifier la migration"
fi
echo ""

# 4. Vérifier la colonne billing_status si elle existe
echo "4️⃣ Vérification de la colonne billing_status..."
BILLING_STATUS_INFO=$(run_query "SELECT column_name, data_type, is_generated FROM information_schema.columns WHERE table_name = 'xa_global_license' AND column_name = 'billing_status'")

if [ -z "$BILLING_STATUS_INFO" ]; then
    echo -e "${YELLOW}⚠️  Colonne billing_status n'existe pas (optionnel)${NC}"
else
    IS_GENERATED=$(echo "$BILLING_STATUS_INFO" | cut -d'|' -f3)
    if [ "$IS_GENERATED" = "ALWAYS" ]; then
        echo -e "${GREEN}✅ Colonne billing_status est une colonne générée${NC}"
    else
        echo -e "${YELLOW}⚠️  Colonne billing_status existe mais n'est PAS générée${NC}"
    fi
fi
echo ""

# 5. Tester le calcul de total_seats_purchased
echo "5️⃣ Test du calcul de total_seats_purchased..."
TENANT_COUNT=$(run_query "SELECT COUNT(*) FROM xa_global_license")
if [ "$TENANT_COUNT" -gt 0 ]; then
    echo "   Trouvé $TENANT_COUNT licence(s)"
    
    # Obtenir la première licence
    FIRST_LICENSE=$(run_query "SELECT guid, tenant, total_seats_purchased FROM xa_global_license LIMIT 1")
    GUID=$(echo "$FIRST_LICENSE" | cut -d'|' -f1)
    TENANT=$(echo "$FIRST_LICENSE" | cut -d'|' -f2)
    SEATS=$(echo "$FIRST_LICENSE" | cut -d'|' -f3)
    
    echo "   Licence GUID: $GUID"
    echo "   Tenant: $TENANT"
    echo "   total_seats_purchased: $SEATS"
    
    # Vérifier manuellement le compte
    MANUAL_COUNT=$(run_query "SELECT COUNT(*) FROM xa_employee_license WHERE tenant = $TENANT AND is_billable = true AND license_status = 'ACTIVE'")
    
    if [ "$SEATS" = "$MANUAL_COUNT" ]; then
        echo -e "${GREEN}✅ Calcul correct ($SEATS employés billables)${NC}"
    else
        echo -e "${RED}❌ Calcul incorrect: total_seats_purchased=$SEATS mais comptage manuel=$MANUAL_COUNT${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Aucune licence dans la base${NC}"
    echo "   Action: Créer une licence de test"
fi
echo ""

# 6. Vérifier les triggers
echo "6️⃣ Vérification des triggers..."
TRIGGER_COUNT=$(run_query "SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'xa_employee_license'")
if [ "$TRIGGER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Trouvé $TRIGGER_COUNT trigger(s) sur xa_employee_license${NC}"
    
    # Lister les triggers
    TRIGGERS=$(run_query "SELECT trigger_name, event_manipulation FROM information_schema.triggers WHERE event_object_table = 'xa_employee_license'")
    echo "$TRIGGERS" | while IFS='|' read -r name event; do
        echo "   - $name ($event)"
    done
else
    echo -e "${YELLOW}⚠️  Aucun trigger trouvé sur xa_employee_license${NC}"
    echo "   Action: Vérifier les migrations de triggers"
fi
echo ""

# 7. Vérifier les index
echo "7️⃣ Vérification des index recommandés..."
check_index() {
    local table=$1
    local column=$2
    local index_name=$3
    
    INDEX_EXISTS=$(run_query "SELECT EXISTS (SELECT FROM pg_indexes WHERE tablename = '$table' AND indexdef LIKE '%$column%')")
    if [ "$INDEX_EXISTS" = "t" ]; then
        echo -e "${GREEN}✅ Index sur $table.$column existe${NC}"
    else
        echo -e "${YELLOW}⚠️  Index manquant sur $table.$column${NC}"
        echo "   SQL: CREATE INDEX idx_${table}_${column} ON $table($column);"
    fi
}

check_index "xa_global_license" "tenant" "tenant"
check_index "xa_global_license" "guid" "guid"
check_index "xa_employee_license" "tenant" "tenant"
check_index "xa_employee_license" "is_billable" "billable"
echo ""

# 8. Test de performance
echo "8️⃣ Test de performance des requêtes..."
START_TIME=$(date +%s%N)
run_query "SELECT guid, tenant, total_seats_purchased FROM xa_global_license WHERE tenant = 1 LIMIT 1" > /dev/null
END_TIME=$(date +%s%N)
DURATION=$(( ($END_TIME - $START_TIME) / 1000000 ))

if [ "$DURATION" -lt 100 ]; then
    echo -e "${GREEN}✅ Performance excellente: ${DURATION}ms${NC}"
elif [ "$DURATION" -lt 200 ]; then
    echo -e "${GREEN}✅ Performance acceptable: ${DURATION}ms${NC}"
else
    echo -e "${YELLOW}⚠️  Performance lente: ${DURATION}ms${NC}"
    echo "   Action: Vérifier les index"
fi
echo ""

# Résumé
echo "======================================"
echo "📊 Résumé du Diagnostic"
echo "======================================"
echo ""

# Compter les succès et échecs
SUCCESS=0
WARNINGS=0
FAILURES=0

# Logique de comptage basée sur les résultats précédents
# (à adapter selon les besoins)

if [ "$TABLE_EXISTS" = "t" ]; then ((SUCCESS++)); else ((FAILURES++)); fi
if [ "$IS_GENERATED" = "ALWAYS" ]; then ((SUCCESS++)); else ((WARNINGS++)); fi
if [ "$TRIGGER_COUNT" -gt 0 ]; then ((SUCCESS++)); else ((WARNINGS++)); fi

TOTAL=$((SUCCESS + WARNINGS + FAILURES))

echo "✅ Succès: $SUCCESS/$TOTAL"
echo "⚠️  Avertissements: $WARNINGS/$TOTAL"
echo "❌ Échecs: $FAILURES/$TOTAL"
echo ""

if [ "$FAILURES" -gt 0 ]; then
    echo -e "${RED}❌ Diagnostic échoué - Corrections nécessaires${NC}"
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Diagnostic partiel - Optimisations recommandées${NC}"
    exit 0
else
    echo -e "${GREEN}✅ Diagnostic complet - Tout fonctionne correctement${NC}"
    exit 0
fi
