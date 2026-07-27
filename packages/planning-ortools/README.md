# Toké Planning OR-Tools — Step 9

## Installation

```bash
cd /opt/toke/packages/planning-ortools
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Démarrage local

```bash
uvicorn app.main:app \
  --host 127.0.0.1 \
  --port 8090
```

## Vérification

```bash
curl http://127.0.0.1:8090/health
```

## Configuration de l’API Node.js

Dans l’environnement PM2 de `api-tenant` :

```text
PLANNING_ORTOOLS_URL=http://127.0.0.1:8090
```

Puis :

```bash
pm2 restart ecosystem.config.cjs --update-env
```

Configuration Toké :

```json
{
  "solver_type": "ORTOOLS",
  "solver_timeout_seconds": 20,
  "fallback_to_greedy": true
}
```

## Endpoint

```text
POST /solve
```

Le body est exactement `PlanningSolverInput`, déjà envoyé par
`OrToolsPlanningSolver` côté Node.js.

## État de cette version

Contraintes prises en charge :

- FIXED / ROTATING / EXCLUDED ;
- EXACT / RANGE / FILL_REMAINING ;
- un service principal par date ;
- capacités min/cible/max ;
- gardes avec continuation ;
- repos après garde ;
- repos hebdomadaire ;
- jours consécutifs ;
- minutes hebdomadaires ;
- gardes consécutives ;
- repos minimum entre services ;
- équité selon historique, gardes et charge.

Non inclus volontairement :

- rôle de manager ;
- gestion de caisse ;
- poste de travail ;
- indisponibilités individuelles ;
- équipes de garde fixes A/B.
