# PgBouncer avec PostgreSQL & Sequelize

> **Contexte** :
>
> * Serveur **Hetzner Cloud**
> * **Ubuntu 24.04.3 LTS**
> * **PostgreSQL déjà installé et fonctionnel**
> * Backend **Node.js + Sequelize**
> * Architecture **multi-tenant (1 base = 1 entreprise)** + projets simples

Ce document explique **quoi est PgBouncer**, **pourquoi l’utiliser**, **comment l’installer**, **comment le configurer
**, et **comment l’intégrer proprement dans tes projets existants sans les casser**.

---

## 1️⃣ PgBouncer : rappel rapide

PgBouncer est un **proxy de pool de connexions PostgreSQL**.

```
Application (Node.js / Sequelize)
        ↓
     PgBouncer
        ↓
   PostgreSQL
```

### Ce qu’il fait

* Réduit le nombre réel de connexions PostgreSQL
* Mutualise les connexions entre **plusieurs apps / tenants / services**
* Protège PostgreSQL contre la surcharge

### Ce qu’il ne fait pas

* Il **ne remplace pas PostgreSQL**
* Il **ne stocke pas de données**
* Il **n’impose rien** : tu choisis de l’utiliser ou non

---

## 2️⃣ Question clé : est-ce possible d’ajouter PgBouncer sans casser l’existant ?

### ✅ OUI — totalement possible

PgBouncer écoute sur **un autre port** (ex : `6432`) alors que PostgreSQL reste sur `5432`.

| Service    | Port |
|------------|------|
| PostgreSQL | 5432 |
| PgBouncer  | 6432 |

➡️ Les projets existants peuvent **continuer à se connecter directement à PostgreSQL**
➡️ Les nouveaux projets peuvent **passer par PgBouncer**

Tu n’es **PAS obligé** de tout migrer immédiatement.

---

## 3️⃣ Quand faut-il passer par PgBouncer ?

### Recommandé pour :

* Multi-tenant
* Plusieurs instances Node.js
* Plusieurs projets sur la même DB
* Scalabilité
* Production SaaS

### Optionnel pour :

* Petits scripts
* Cron jobs simples
* Outils admin ponctuels

---

## 4️⃣ Architecture cible (recommandée)

```
                        ┌───────────────┐
                        │ Projet A      │
                        │ (Sequelize)   │
                        └───────┬───────┘
                                │
                        ┌───────▼───────┐
                        │   PgBouncer   │  Port 6432
                        └───────┬───────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
   tenant_db_1            tenant_db_2            tenant_db_3
   (PostgreSQL)           (PostgreSQL)           (PostgreSQL)
```

---

## 5️⃣ Installation de PgBouncer (Ubuntu 24.04)

### 5.1 Mise à jour système

```bash
sudo apt update && sudo apt upgrade -y
```

### 5.2 Installation

```bash
sudo apt install pgbouncer -y
```

### 5.3 Vérification

```bash
pgbouncer --version
```

---

## 6️⃣ Configuration de PgBouncer

### 6.1 Fichier principal

```bash
sudo nano /etc/pgbouncer/pgbouncer.ini
```

### 6.2 Configuration minimale recommandée

```ini
[databases]
* = host=127.0.0.1 port=5432

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432

auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction

max_client_conn = 2000
default_pool_size = 50
reserve_pool_size = 10
reserve_pool_timeout = 5

server_idle_timeout = 30
server_lifetime = 3600

log_connections = 1
log_disconnections = 1
```

### Pourquoi `pool_mode = transaction` ?

* Compatible avec Sequelize
* Meilleur compromis performance / sécurité

---

## 7️⃣ Gestion des utilisateurs PgBouncer

### 7.1 Fichier users

```bash
sudo nano /etc/pgbouncer/userlist.txt
```

Format :

```
"db_user" "md5PASSWORD"
```

### 7.2 Générer un mot de passe MD5 PostgreSQL

```sql
SELECT 'md5' || md5('password' || 'username');
```

---

## 8️⃣ Démarrage et activation

```bash
sudo systemctl restart pgbouncer
sudo systemctl enable pgbouncer
sudo systemctl status pgbouncer
```

---

## 9️⃣ Intégration avec Sequelize (PROJET SIMPLE)

### AVANT (connexion directe PostgreSQL)

```ts
host: process.env.DB_HOST,
  port
:
5432,
```

### APRÈS (via PgBouncer)

```ts
host: process.env.DB_HOST,
  port
:
6432,
```

👉 **Aucun autre changement nécessaire**

---

## 🔟 Intégration avec ton TenantManager (multi-tenant)

### Ce qui change

* **RIEN dans la logique métier**
* Tu changes uniquement :

```ts
port: 6432, // PgBouncer
```

### ⚠️ Point CRITIQUE dans ton code actuel

```ts
await sequelize.query(`SET timezone = 'Africa/Douala'`);
```

❌ **Interdit avec PgBouncer en mode transaction**

### ✅ Solution recommandée

1️⃣ Supprimer ce `SET`
2️⃣ Définir le timezone **au niveau PostgreSQL** :

```sql
ALTER
DATABASE tenant_db SET timezone = 'Africa/Douala';
```

Ou globalement :

```sql
ALTER
SYSTEM SET timezone = 'Africa/Douala';
```

---

## 1️⃣1️⃣ Bonnes pratiques Sequelize + PgBouncer

### Pool côté Sequelize

```ts
pool: {
  max: 3,
    min
:
  0,
    idle
:
  10000,
    acquire
:
  30000,
}
```

👉 Petit pool côté app, gros pool côté PgBouncer

---

## 1️⃣2️⃣ Monitoring PgBouncer

Connexion admin :

```bash
psql -p 6432 -U pgbouncer pgbouncer
```

Commandes utiles :

```sql
SHOW
POOLS;
SHOW
CLIENTS;
SHOW
SERVERS;
SHOW
STATS;
```

---

## 1️⃣3️⃣ Faut-il forcer tous les projets à passer par PgBouncer ?

### ❌ NON (obligatoire)

### ✅ OUI (recommandé à terme)

| Cas               | Direct PostgreSQL | PgBouncer |
|-------------------|-------------------|-----------|
| Projets existants | ✅                 | Optionnel |
| Multi-tenant      | ❌                 | ✅         |
| Production SaaS   | ❌                 | ✅         |
| Scripts admin     | ✅                 | Optionnel |

---

## 1️⃣4️⃣ Résumé final

* PgBouncer **peut être ajouté sans casser l’existant**
* Tu n’es **pas obligé** de migrer tous les projets
* Pour ton **multi-tenant**, PgBouncer est **une très bonne décision**
* Attention aux **SET session** (timezone, search_path)
* Ta base d’architecture est **saine et professionnelle**

---

## 1️⃣5️⃣ Étapes recommandées pour toi

1️⃣ Installer PgBouncer
2️⃣ Tester avec **un seul projet**
3️⃣ Adapter le TenantManager (timezone côté DB)
4️⃣ Migrer progressivement les autres projets

---

Si tu veux, je peux ensuite te fournir :

* 🔐 Hardening sécurité PgBouncer
* 📊 Monitoring Grafana
* 🚀 Architecture HA (PgBouncer + failover)
* 🧠 Revue de ton TenantManager adaptée PgBouncer
