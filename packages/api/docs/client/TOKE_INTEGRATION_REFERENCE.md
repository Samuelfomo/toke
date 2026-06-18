# Toké — Référence d'Intégration

> **Document destiné aux ingénieurs intégrateurs** qui construisent des systèmes communiquant avec Toké (connecteurs paie, SIRH, BI, ETL, badgeuses, exports légaux, notifications, etc.).
>
> **Périmètre** : ce document reflète l'**existant réel** (collections Postman + architecture validée). Les manques (webhooks, doc OpenAPI publique, etc.) sont signalés explicitement comme **gaps** plutôt que masqués.
>
> **Version** : 1.0 — Référence basée sur les collections Postman *Toké App Check-in API* et *Toké App Manager API*.

---

## 1. Vue d'Ensemble

### 1.1 Ce qu'est Toké, en une phrase d'intégrateur

Toké est une plateforme **multi-tenant** de pointage et de gestion d'équipe terrain, conçue mobile-first pour l'Afrique centrale, qui expose une **API REST signée** comme unique surface d'intégration. Toute donnée qui entre ou sort de Toké passe par cette API.

### 1.2 Architecture en 3 applications

| App | Plateforme | Persona | Surface API |
|---|---|---|---|
| **Toké Pointage** | Mobile (Android prio) | Employé qui pointe | API Check-in (lecture seule + POST pointage) |
| **Toké Manager** | Mobile | Chef d'équipe, RH, direction | API Manager (CRUD complet du périmètre) |
| **Toké RH / Web Dashboard** | Web (`my.toke.cm`) | Direction, RH, intégrateurs | API Manager (mêmes endpoints) + extensions futures |

> **Implication pour l'intégrateur** : il n'y a **pas trois APIs distinctes**. Il y a une **API plateforme unique** dont chaque app consomme un sous-ensemble. Les permissions sont portées par le **rôle de l'utilisateur authentifié**, pas par l'app appelante.

### 1.3 Deux bases d'URL à connaître

Les Postman révèlent **deux base URLs** qui correspondent à deux périmètres distincts :

| Variable Postman | Rôle | Exemple |
|---|---|---|
| `{{baseUrl}}` | **API tenant** — données opérationnelles (pointages, sites, mémos, employés) | `https://demo.toke.cm/api` |
| `{{mBaseUrl}}` | **API master** — données transverses (licences, paiements, fraude globale) | `https://api.toke.cm/master` |

**Règle d'intégration** : les opérations métier quotidiennes tapent `baseUrl` (subdomain tenant). Les opérations de facturation/licence tapent `mBaseUrl` (master). Un connecteur de paie monoclient n'a besoin que de `baseUrl`. Un connecteur reseller multi-tenant a besoin des deux.

---

## 2. Modèle Conceptuel — Les 6 Objets à Maîtriser

Avant de toucher l'API, il faut avoir en tête ces 6 objets et leurs relations.

### 2.1 Tenant
**Définition** : une entreprise cliente de Toké. Identifié par un **subdomain** (ex : `demo.toke.cm`, `batix.toke.cm`).

**Caractéristiques** :
- Pays, devise primaire, langue préférée, timezone (`Africa/Douala` par défaut)
- Informations de facturation (email, adresse, téléphone, numéro fiscal)
- Un seul tenant = une instance logique isolée (multi-tenant strict)

**Endpoint clé** : `GET /tenant/:identifier` — résout un subdomain en GUID tenant. **Première requête de toute intégration** pour bootstrapper la résolution multi-tenant.

### 2.2 User
**Définition** : tout être humain qui interagit avec Toké, quel que soit son rôle.

**Une seule table `users`** porte tous les utilisateurs. Le **rôle** est une propriété attachée, pas une classe d'objet. Un même user peut cumuler `EMPLOYEE` + `MANAGER` (un chef d'équipe qui pointe ses propres heures).

**Rôles système** :
- `EMPLOYEE` — pointage, création de mémos, consultation historique personnel
- `MANAGER` — gestion d'équipe, validation mémos, création sites/QR
- `MANAGER_SENIOR` — supervision de managers, escalade
- `HR_ADMIN` — accès tenant complet
- `AUDITOR` — pointage multi-sites (cas inspecteurs/commerciaux)

**Identité** : chaque user a un `guid` (string numérique 16 chiffres, ex : `5751601882956203`). Les GUIDs **ne sont pas des UUIDs** — c'est un détail d'intégration important pour les schémas de DB côté connecteur.

### 2.3 Site
**Définition** : un lieu autorisé pour le pointage, avec une **géofence** (polygone GeoJSON + rayon de tolérance) et un **QR code**.

**Types** :
- `manager_site` — site privé d'un manager (le QR n'est utilisable que par son équipe)
- `global_site` — site partagé tenant-wide (siège, agence)
- `temporary_site` — chantier court, mission ponctuelle
- `public_site` — gares, aéroports (cas auditeurs/commerciaux)

**Implication intégration** : un export "pointages par chantier" doit traiter le cas où un site est temporaire ou réassigné. Le `site_type` est un filtre métier important.

### 2.4 TimeEntry (Pointage)
**Définition** : un événement atomique — clock_in, clock_out, pause_start, pause_end, ou external_mission.

**Champs critiques** :
- `pointage_type` (5 valeurs) — détermine l'effet sur la session
- `clocked_at` (timestamp **revendiqué** par le device)
- `real_clocked_at` (timestamp **serveur**, source de vérité légale)
- `latitude`, `longitude`, `gps_accuracy` — preuve de présence
- `qr_code` (string) — preuve de scan, lié à un site
- `device` (GUID) — identifie le smartphone

> ⚠️ **Gotcha intégration** : `clocked_at` ≠ `real_clocked_at`. Le premier peut être manipulé (offline, horloge décalée). Pour les exports paie ou conformité, **utilise `real_clocked_at`**. Le `clocked_at` ne sert qu'à reconstituer la chronologie offline et détecter les anomalies.

### 2.5 WorkSession
**Définition** : un groupement automatique d'un `clock_in` jusqu'à son `clock_out`, avec les pauses entre.

**Règle invariante** : un user a **0 ou 1 session ouverte** à un instant T (contrainte SQL `idx_unique_open_session`). Si tu pousses un `clock_in` alors qu'une session est déjà ouverte, le serveur la ferme automatiquement et peut générer un **mémo auto-généré** pour anomalie.

**Implication** : un connecteur ne doit jamais essayer de "reconstruire" des sessions côté client. Toujours requêter `work-sessions` ou les endpoints `attendance/*` qui les exposent déjà calculées.

### 2.6 Memo
**Définition** : un document de justification structuré avec **valeur probante légale** au Cameroun (Loi n°92/007 + n°2010/013).

**Types courants** : `delay_justification`, `forgotten_clock_out`, `unplanned_absence`, `external_mission`, et plus.

**Statuts** : `draft` → `submitted` → `pending` → `validated` | `rejected` → (archivé après 1 an).

**Workflow d'escalade** : si un manager ne traite pas un mémo sous 24h, escalade auto vers N+1 (J+1 relance, J+3 escalade, J+7 RH/Direction).

**Mémos auto-générés** : le système crée lui-même des mémos quand il détecte une anomalie (oubli de clock-out, présence hors géofence, etc.). Endpoint : `GET /memo/auto-generated`. **C'est un signal fort pour les connecteurs de qualité de données.**

### 2.7 License (master DB)
**Définition** : un contrat d'abonnement entre un tenant et Toké.

**Champs** : `license_type` (ex : `CLOUD_FLEX`), `billing_cycle_months`, `base_price_usd`, `minimum_seats`, `total_seats_purchased`, `license_status`.

**Prix de référence en USD**, conversion vers devise locale (XAF, etc.) via la table `exchange_rate`. Cette mécanique permet à Toké d'opérer en multi-pays sans recoder les prix.

---

## 3. Authentification & Sécurité API

### 3.1 Headers obligatoires

Toute requête authentifiée embarque **au minimum** 3 headers, parfois 4 :

```
x-api-key:       <token statique du tenant>
x-api-signature: <signature HMAC de la requête>
x-api-timestamp: <unix timestamp, anti-replay>
x-tenant-id:     <GUID du tenant, pour endpoints multi-tenant côté master>
Content-Type:    application/json
```

> **Note d'intégrateur** : les Postman montrent `x-api-signature` comme une variable d'environnement. La documentation publique de l'algorithme de signature n'est pas encore exposée — **demande à l'équipe Toké la formule exacte (canonical request, secret, hash)** avant de coder un client. C'est un **gap à combler dans la doc publique**.

### 3.2 Authentification utilisateur

Toké distingue 3 mécanismes d'authentification selon le persona :

| Mécanisme | Persona | Endpoint d'entrée | Usage |
|---|---|---|---|
| **OTP** (6 chiffres) | Employé/Manager (onboarding) | `GET /user/:otp/verify` | Première connexion, génère le compte |
| **PIN** (4 chiffres) | Employé (quotidien) | `PATCH /user/:guid/define-pin` puis fourni au `POST /time-entries` | Validation rapide de pointage |
| **Password** | Manager | `PATCH /user/manager/password` (body : email + password) | Connexion à l'app Manager / Web |

**Implication intégration** : un connecteur server-to-server **ne s'authentifie pas comme un user**. Il utilise l'`x-api-key` + signature au nom du tenant. Le PIN/password sont des secrets utilisateur, pas des credentials d'intégration.

### 3.3 Modèle de permissions

Les permissions sont **portées par le rôle** de l'utilisateur authentifié et son **périmètre hiérarchique** (table `org_hierarchy`). Concrètement :
- Un `MANAGER` ne voit que **ses** subordonnés directs (et indirects via la hiérarchie).
- Un `HR_ADMIN` voit tout le tenant.
- Un `EMPLOYEE` ne voit que ses propres données.

Pour un connecteur qui doit voir **toutes** les données d'un tenant (cas paie, BI), utilise un compte `HR_ADMIN` dédié à l'intégration. Ne réutilise jamais le compte personnel d'un dirigeant.

---

## 4. Surface API par Domaine

> Cette section liste **les endpoints existants extraits des Postman**, regroupés par domaine fonctionnel. Quand un endpoint a un nom Postman explicite (✅, 📋, etc.), je le conserve pour faciliter le mapping.

### 4.1 Domaine : Tenant & Authentification

| Méthode | Endpoint | Usage |
|---|---|---|
| `GET` | `{{mBaseUrl}}/tenant/:identifier` | Résoudre un subdomain (ex `demo.toke.cm`) en GUID tenant |
| `POST` | `{{baseUrl}}/tenant` | Initialiser un nouveau tenant (setup initial) |
| `POST` | `{{baseUrl}}/global-license/` | Créer la licence globale du tenant |
| `PATCH` | `{{endpoint}}/tenant/:guid/subdomain` | Finaliser le setup tenant (subdomain) |
| `PATCH` | `{{baseUrl}}/user/manager/password` | Login manager (email + password) |
| `PATCH` | `{{baseUrl}}/user/:guid/define-password` | Définir/changer le password d'un user |
| `GET` | `{{baseUrl}}/user-role/:guid/list` | Récupérer le profil + rôles d'un user (post-login) |
| `GET` | `{{baseUrl}}/user/:otp/verify` | Vérifier un OTP (onboarding employé ou manager) |

### 4.2 Domaine : Employés & Hiérarchie

| Méthode | Endpoint | Usage |
|---|---|---|
| `POST` | `{{baseUrl}}/user/` | Créer un employé (champs : supervisor, email, first/last_name, phone_number, country, employee_code, hire_date, department, job_title) |
| `GET` | `{{baseUrl}}/user/:guid` | Détails d'un user |
| `PUT` | `{{baseUrl}}/user/:guid` | Mettre à jour un user |
| `PATCH` | `{{baseUrl}}/user/:guid/status` | Activer/désactiver un user (body : `{supervisor, status: true|false}`) |
| `PATCH` | `{{baseUrl}}/user/:guid/generate-otp` | Générer un OTP d'onboarding (body : `country`, `expiration_minutes`) |
| `POST` | `{{baseUrl}}/user/share` | Inviter un nouveau manager |
| `GET` | `{{baseUrl}}/org-hierarchy/supervisor/:userGuid/list` | Liste mes employés directs |
| `POST` | `{{baseUrl}}/org-hierarchy/reassign` | Réassigner un employé (body : `subordinate_guid`, `new_supervisor_guid`, `effective_date`) |
| `GET` | `{{baseUrl}}/org-hierarchy/my-level?manager=X` | Récupérer mes managers pairs |

### 4.3 Domaine : Sites & QR Codes

| Méthode | Endpoint | Usage |
|---|---|---|
| `POST` | `{{baseUrl}}/site` | Créer un site (nom, type, adresse, geofence_polygon GeoJSON, geofence_radius, allowed_roles) |
| `GET` | `{{baseUrl}}/site` | Lister les sites actifs du tenant (utilisé par App Pointage pour résoudre le scan QR) |
| `GET` | `{{baseUrl}}/site/creator/:guid/active` | Lister mes sites actifs en tant que créateur |
| `GET` | `{{baseUrl}}/site/:guid` | Détails d'un site |
| `PATCH` | `{{baseUrl}}/site/generate-qr-code` | Générer un QR code pour un couple (site, manager) |

### 4.4 Domaine : Pointage (TimeEntries)

**Endpoint pivot** — c'est par là que rentre toute donnée de présence :

```http
POST {{baseUrl}}/time-entries
Content-Type: application/json
x-api-key: ...
x-api-signature: ...

{
    "pin": "9876",
    "user": "4474090992296020",
    "device": "9593801571049101",
    "qr_code": "84JE99",
    "site": "9792559004233401",
    "pointage_type": "clock_in",
    "clocked_at": "2025-10-24T11:23:00Z",
    "real_clocked_at": "2025-10-24T11:24:00Z",
    "latitude": 6.04573,
    "longitude": 7.70129,
    "gps_accuracy": 5
}
```

**Autres endpoints lecture** :

| Méthode | Endpoint | Usage |
|---|---|---|
| `GET` | `{{baseUrl}}/time-entries/:userGuid/last` | Dernier pointage d'un employé |
| `GET` | `{{baseUrl}}/time-entries/user/:userGuid/list` | Tous les pointages d'un employé |
| `GET` | `{{baseUrl}}/time-entries/attendance/history?manager=&site=&start_date=&end_date=&employee=` | Historique filtrable |
| `GET` | `{{baseUrl}}/time-entries/attendance/employee/:guid/history?start_date=&end_date=&include_time_entries=` | Historique d'un employé |
| `GET` | `{{baseUrl}}/time-entries/attendance?manager=&site=&employee=&start_date=&end_date=&pointage_type=&status=` | Filtrage avancé (endpoint de choix pour les exports) |
| `GET` | `{{baseUrl}}/time-entries/attendance/statistics?manager=&site=&start_date=&end_date=` | Stats agrégées d'équipe |

### 4.5 Domaine : Attendance temps réel & Sessions

| Méthode | Endpoint | Usage |
|---|---|---|
| `GET` | `{{baseUrl}}/user/attendance/active-sessions?manager=X` | Sessions actuellement ouvertes (qui est au travail maintenant) |
| `GET` | `{{baseUrl}}/user/attendance/today?manager=X` | Présence du jour |
| `GET` | `{{baseUrl}}/user/attendance/employee/:guid/current` | Session courante d'un employé |
| `GET` | `{{baseUrl}}/user/attendance/site/:guid/current` | Qui est présent sur un site maintenant |
| `PATCH` | `{{baseUrl}}/work-sessions/:guid/correct` | Corriger une session (body : `corrections`, `manager_guid`) |
| `PATCH` | `{{baseUrl}}/work-sessions/attendance/entry/:guid/correct` | Corriger un pointage individuel |
| `PATCH` | `{{baseUrl}}/work-sessions/attendance/session/:guid/close` | Forcer la fermeture d'une session (cas oubli) |

### 4.6 Domaine : Mémos

| Méthode | Endpoint | Usage |
|---|---|---|
| `POST` | `{{baseUrl}}/memo` | Créer un mémo (champs : `author_user`, `target_user`, `memo_type`, `memo_status`, `title`, `description`, `incident_datetime`, `affected_session`, `affected_entries`, `attachments`, `memo_context`, `auto_generated`) |
| `GET` | `{{baseUrl}}/memo/my-memos?author=X` | Mémos d'un user (côté employé) |
| `GET` | `{{baseUrl}}/memo/my-created?author=X` | Mémos créés par un manager |
| `GET` | `{{baseUrl}}/memo/pending-validation?validator=X` | Mémos en attente de validation |
| `GET` | `{{baseUrl}}/memo/escalated-to-me?validator=X` | Mémos escaladés vers un validateur |
| `GET` | `{{baseUrl}}/memo/urgent` | Mémos en retard de traitement |
| `GET` | `{{baseUrl}}/memo/auto-generated` | Mémos auto-générés par le système (signal qualité) |
| `GET` | `{{baseUrl}}/memo/statistics/overview` | Stats agrégées mémos |
| `PUT` | `{{baseUrl}}/memo/:guid` | Éditer un brouillon |
| `PATCH` | `{{baseUrl}}/memo/:guid/validate` | Valider (body : `validator_user`, `validator_comments`) |
| `PATCH` | `{{baseUrl}}/memo/:guid/reject` | Rejeter (commentaire obligatoire) |
| `PATCH` | `{{baseUrl}}/memo/:guid/escalate` | Escalader vers N+1 (body : `new_validator`, `reason`) |
| `PATCH` | `{{baseUrl}}/memo/:guid/respond` | Répondre à son propre mémo (employé) |
| `GET` | `{{baseUrl}}/memo/:guid/attachments` | Lister les pièces jointes d'un mémo |
| `GET` | `{{baseUrl}}/memo/attachments/:token` | Téléchargement sécurisé d'une pièce jointe (token URL) |

### 4.7 Domaine : Licences & Paiements (master)

| Méthode | Endpoint | Usage |
|---|---|---|
| `GET` | `{{mBaseUrl}}/billing/current-license/:tenant` | Licence courante du tenant |
| `GET` | `{{mBaseUrl}}/billing/billable-employees/:tenant` | Nombre d'employés facturables (= sièges consommés) |
| `GET` | `{{baseUrl}}/{{router}}/billing/current-cost` | Coût de la période en cours |
| `GET` | `{{mBaseUrl}}/billing/period-preview/:tenant` | Aperçu de la facture fin de période |
| `GET` | `{{mBaseUrl}}/billing/pending-adjustments/:tenant` | Ajustements en attente (ajouts/retraits de sièges) |
| `PATCH` | `{{mBaseUrl}}/billing/adjustment/confirm` | Confirmer un ajustement (body : `adjustment`) |
| `GET` | `{{mBaseUrl}}/billing/adjustment/:guid` | Détails d'un ajustement |
| `POST` | `{{mBaseUrl}}/billing/payment/initiate` | Initier un paiement mobile money (body : `billing_cycle`, `adjustment`, `amount_usd`, `currency_code`, `exchange_rate_used`, `payment_method`) |
| `GET` | `{{mBaseUrl}}/billing/payment/:transactionId/status` | Statut d'un paiement |
| `POST` | `{{mBaseUrl}}/billing/payment/retry` | Réessayer un paiement échoué |
| `GET` | `{{mBaseUrl}}/billing/payment-history/:tenant` | Historique des paiements du tenant |

### 4.8 Domaine : Anti-Fraude

| Méthode | Endpoint | Usage |
|---|---|---|
| `GET` | `{{mBaseUrl}}/fraud/active-alerts` | Alertes de fraude actives |
| `GET` | `{{baseUrl}}/{{router}}/fraud/patterns/` | Patterns suspects détectés sur des employés |
| `PUT` | `{{mBaseUrl}}/fraud/alerts/:guid/investigate` | Démarrer une investigation (body : `notes`, `investigator`) |
| `PUT` | `{{mBaseUrl}}/fraud/alerts/:guid/resolve` | Résoudre une alerte |

### 4.9 Gaps connus (à date)

Ces fonctionnalités sont **citées dans la doc** mais **absentes des Postman**. Un intégrateur doit demander à l'équipe Toké leur disponibilité réelle :

| Gap | Impact intégrateur | Workaround actuel |
|---|---|---|
| **Webhooks** sortants (events `time_entry.created`, `memo.validated`, `payment.success`, etc.) | Pas de push, oblige au polling | Polling périodique de `time-entries/attendance` + `memo/urgent` |
| **Exports CSV légaux CNPS / Inspection du travail** (cités dans la doc) | Pas d'endpoint dédié visible | Construire le CSV côté connecteur depuis `attendance/history` |
| **OpenAPI/Swagger** publique | Doc Postman manuelle | Ce document + dialogue avec l'équipe |
| **Endpoint d'upload de fichiers** (mémos référencent `https://demo.toke.cm/upload/f/...`) | Pas vu dans Postman, mais URL pattern visible | Demander la procédure exacte (multipart endpoint ?) |
| **Algorithme de signature `x-api-signature`** | Documentation absente | Demander la formule + un exemple de signature pour validation |
| **Endpoints Web Dashboard analytics** (section `📊 Dashboard & Analytics` est vide dans le Postman Manager) | Pas encore implémenté | Construire les analytics côté connecteur (BI tool) |

---

## 5. Workflows d'Intégration Types

### 5.1 Workflow A — Connecteur Paie (export mensuel)

**Objectif** : produire un CSV mensuel par employé avec heures travaillées, retards justifiés, absences, primes éventuelles.

```
1. GET /tenant/:identifier              → résoudre tenant
2. GET /org-hierarchy/.../list          → lister tous les employés actifs
3. Pour chaque employé :
   GET /time-entries/attendance/employee/:guid/history?start_date=&end_date=
4. GET /memo/my-memos?author=X  +  filtre status=validated
5. Joindre côté connecteur, agréger en CSV
6. (Optionnel) GET /memo/auto-generated → flag les sessions reconstruites pour audit
```

**Points d'attention** :
- Utilise `real_clocked_at`, pas `clocked_at`
- Filtre `status=closed` pour exclure les sessions encore ouvertes
- Pondère selon `pointage_type` (les `external_mission` peuvent compter différemment)

### 5.2 Workflow B — Connecteur BI (dashboards temps réel)

**Objectif** : alimenter un Power BI / Metabase / Looker avec des KPIs présence.

**Pattern recommandé** :
```
Polling toutes les 5–15 min :
  - GET /user/attendance/today?manager=X
  - GET /user/attendance/active-sessions?manager=X
  - GET /time-entries/attendance/statistics?manager=&site=&start_date=&end_date=
  
Polling quotidien (00h30 locale) :
  - GET /time-entries/attendance?...&start_date=hier&end_date=hier
    pour la consolidation J-1
```

**Anti-pattern** : NE PAS poller `/time-entries/user/:guid/list` employé par employé en boucle — risque de rate limiting et de N+1 queries.

### 5.3 Workflow C — Bridge SIRH (Sage, Cegid, etc.)

**Objectif** : synchroniser le référentiel employés entre un SIRH maître et Toké.

```
Daily sync :
  1. SIRH → Toké (créations / modifs employés) :
     POST /user/ pour nouveau
     PUT /user/:guid pour update
     PATCH /user/:guid/status pour départ
  2. SIRH ← Toké (mémos validés impactant la paie) :
     GET /memo/my-created?author=X + filter status=validated
     ou GET /memo/auto-generated
```

**Règle d'or** : décider un **système de source de vérité** par champ. Si Sage est maître pour `hire_date`, le connecteur ne doit jamais accepter une modif venant de Toké pour ce champ.

### 5.4 Workflow D — Détection fraude poussée (analytics externe)

```
Quotidien :
  GET /fraud/active-alerts
  GET /fraud/patterns/  (par employé suspect)
  Pour chaque alerte → enrichir avec /time-entries/attendance/employee/:guid/history
  Pousser dans le SIEM / outil d'investigation
```

---

## 6. Contraintes Opérationnelles à Respecter

### 6.1 Multi-tenant strict
- **Jamais** de requête sans `x-tenant-id` sur les endpoints master.
- Un GUID d'une entité d'un tenant n'a **aucune signification** dans un autre tenant.
- Un connecteur multi-tenant doit maintenir une **map tenant → api_key** côté lui.

### 6.2 Multi-devises
- Tous les montants côté master sont stockés en **USD** (`amount_usd`, `base_price_usd`).
- La conversion vers la devise locale (XAF, EUR, etc.) se fait via `exchange_rate_used` au moment de la transaction.
- Un connecteur de comptabilité doit **stocker les deux** : USD + montant local figé au taux du jour.

### 6.3 Offline-first côté employé
- Les pointages employé peuvent arriver **en batch** plusieurs heures après leur `clocked_at`.
- Un dashboard "temps réel" doit accepter que `real_clocked_at` peut être 12h+ après `clocked_at`.
- Pour les exports légaux : attendre **J+1 minimum** pour la consolidation, sinon données incomplètes.

### 6.4 Pagination & volumes
- Les endpoints `attendance/history` peuvent retourner de gros volumes (centaines de pointages/jour sur un tenant 300 employés).
- Filtre toujours par `start_date` / `end_date`.
- (À confirmer avec l'équipe : la pagination est-elle implémentée ? Limit/offset ? Cursor ?)

### 6.5 Idempotence
- `POST /time-entries` accepte un `local_id` côté offline (vu dans le modèle SQL : `idx_unique_offline_entry`).
- Pour un connecteur qui réinjecte des pointages, **toujours** fournir un `local_id` stable pour éviter les doublons en cas de retry.

### 6.6 Audit trail
- Les mémos validés sont **immutables** (conformité Cameroun).
- Toute modification d'un pointage passe par `/work-sessions/.../correct` qui crée une trace, pas un UPDATE direct.
- Un connecteur ne doit **jamais** essayer de "nettoyer" l'historique — il casse la valeur probante.

---

## 7. Modèles de Données — Schémas Synthétiques

### 7.1 User (extraits Postman)

```json
{
  "guid": "5751601882956203",
  "supervisor": "6427683422365001",
  "email": "manfred@gmail.cm",
  "first_name": "Manfred",
  "last_name": "Moukaté",
  "phone_number": "695888709",
  "country": "CM",
  "employee_code": "SYS-45001",
  "hire_date": "2025-09-01",
  "department": "INFO",
  "job_title": "LOGICIEL",
  "roles": ["EMPLOYEE"],
  "status": true
}
```

### 7.2 Site (avec géofence)

```json
{
  "guid": "9856563826540801",
  "name": "Chantier Nord BATIX",
  "site_type": "manager_site",
  "created_by": "3915293612562351",
  "address": {
    "city": "Douala",
    "location": "Quartier Bonanjo",
    "place_name": "baba"
  },
  "geofence_polygon": {
    "type": "Polygon",
    "coordinates": [[[9.70123, 4.04567], [9.70134, 4.04567], [9.70134, 4.04578], [9.70123, 4.04578], [9.70123, 4.04567]]]
  },
  "geofence_radius": 50,
  "allowed_roles": {"1": "EMPLOYEE", "2": "MANAGER"},
  "active": true
}
```

### 7.3 TimeEntry

```json
{
  "guid": "<auto>",
  "user": "4474090992296020",
  "device": "9593801571049101",
  "site": "9792559004233401",
  "qr_code": "84JE99",
  "pointage_type": "clock_in",
  "clocked_at": "2025-10-24T11:23:00Z",
  "real_clocked_at": "2025-10-24T11:24:00Z",
  "latitude": 6.04573,
  "longitude": 7.70129,
  "gps_accuracy": 5,
  "pin": "9876"
}
```

### 7.4 Memo

```json
{
  "author_user": "3337892849459602",
  "target_user": "5751601882956203",
  "memo_type": "delay_justification",
  "memo_status": "draft",
  "title": "Retard prévu demain 30min",
  "description": "Rendez-vous médical contrôle mensuel. Arriverai 8h30 au lieu 8h00.",
  "incident_datetime": "2024-12-02T08:30:00Z",
  "affected_session": null,
  "affected_entries": null,
  "attachments": ["https://demo.toke.cm/upload/f/1760525068431-663266003.png"],
  "memo_context": {
    "advance_notice": "24_hours",
    "impact_level": "minor",
    "mitigation_plan": "rattrapage_fin_journee",
    "recurrence": "monthly_medical"
  },
  "auto_generated": false
}
```

### 7.5 License initialization

```json
{
  "tenant": 100002,
  "license_type": "CLOUD_FLEX",
  "billing_cycle_months": 3,
  "current_period_start": "2025-06-01",
  "current_period_end": "2025-09-01",
  "next_renewal_date": "2025-09-01",
  "base_price_usd": 199.99,
  "minimum_seats": 5,
  "total_seats_purchased": 10,
  "license_status": "ACTIVE"
}
```

### 7.6 Payment initiation

```json
{
  "billing_cycle": 100001,
  "adjustment": 100001,
  "amount_usd": 150.75,
  "currency_code": "XAF",
  "exchange_rate_used": 611.50,
  "payment_method": 100001,
  "failure_reason": null
}
```

---

## 8. Glossaire d'Intégration

| Terme | Définition courte |
|---|---|
| **Tenant** | Une entreprise cliente, isolée logiquement. Identifiée par un subdomain. |
| **GUID** | Identifiant Toké (string numérique 16 chiffres, pas un UUID). |
| **OTP** | Code 6 chiffres temporaire, usage onboarding uniquement. |
| **PIN** | Code 4 chiffres, secret utilisateur quotidien pour pointer. |
| **Session** | Conteneur logique entre un clock_in et un clock_out, avec pauses. |
| **Mémo** | Document de justification avec valeur probante légale au Cameroun. |
| **Géofence** | Polygone GeoJSON + rayon de tolérance définissant un site. |
| **Auto-generated memo** | Mémo créé par le système suite à une anomalie détectée. |
| **Master DB** | Base centrale Toké (licences, paiements, fraude transverse). |
| **baseUrl vs mBaseUrl** | API tenant vs API master ; deux racines distinctes. |
| **CLOUD_FLEX** | Type de licence à sièges flexibles avec minimum + ajustements. |

---

## 9. Checklist Pré-Intégration

Avant d'écrire la première ligne de code d'un connecteur Toké, l'ingénieur intégrateur doit avoir validé :

- [ ] J'ai un `x-api-key` valide pour le tenant cible
- [ ] J'ai la formule exacte de calcul de `x-api-signature` (auprès de l'équipe Toké)
- [ ] J'ai identifié `baseUrl` (subdomain du tenant) et `mBaseUrl` (master, si pertinent)
- [ ] J'ai un compte `HR_ADMIN` dédié à l'intégration (pas un compte humain personnel)
- [ ] J'ai confirmé le fuseau horaire du tenant (par défaut `Africa/Douala`)
- [ ] J'ai défini ma politique d'idempotence (`local_id` côté `time-entries` pour les retries)
- [ ] J'ai défini ma politique de polling (fréquence + endpoints) — pas de webhooks à date
- [ ] J'ai un plan de gestion d'erreur pour les pointages refusés (geofence violation, doublon, session déjà fermée)
- [ ] J'ai validé avec Toké les limites de rate limiting (à confirmer)
- [ ] J'ai un dataset de test sur le tenant de demo (`demo.toke.cm`) avant production

---

## 10. Contacts & Ressources

- **Backend** : équipe Toké (Yaoundé)
- **Documentation produit** : ce dépôt + collections Postman (`Toké App Check-in API`, `Toké App Manager API`)
- **Demo tenant** : `demo.toke.cm`
- **Dashboard web** : `my.toke.cm`
- **Marketing & vente** : `toke.cm`

---

*Document de référence — révisez à chaque évolution majeure des collections Postman.*
