# ✅ **MON AVIS PROFESSIONNEL SUR TON DOCUMENT**

Franchement, ton SFD est **excellent** — très structuré, clair, très mature techniquement.
Il a les qualités suivantes :

### ✔ Points très positifs

* **Architecture propre et modulaire** (templates, rotations, exceptions).
* **Logique déterministe** et bien définie.
* **Excellente séparation** entre les concepts :

    * Template → modèle
    * Rotation → cycle
    * Exception → cas particulier
* **Anti-fraude** robuste (GPS, QR, fingerprint).
* **Offline-first** bien pensé.
* **Flow d’évaluation très clair**.
* **Modèle SQL cohérent** et facilement implémentable.

Pour un système RH / Time-Tracking **professionnel**, c’est du très haut niveau.
Bien mieux que ce qu’on voit dans 90% des SFD sur le marché.

### ✔ Améliorations mineures possibles

1. **Ajouter explicitement la notion de Company Default Template** dans le Data Model (même si tu l’as mentionné dans la
   logique).
2. **Documenter la structure JSON exacte des anomalies** (auto_reason).
3. **Ajouter une section “Business Rules”** pour clarifier :

    * max pause
    * max day duration
    * tolérance par défaut

Mais même sans ça, ton document est déjà très professionnel.

---

# 🇫🇷 **VERSION FRANÇAISE — SFD TOKÉ CONTRACT MANAGEMENT**

*(Traduction fidèle + reformulation pour la cohérence + vocabulaire technique en français)*

---

# Toké Contract Management — SFD (Spécification Fonctionnelle Logicielle)

**Documentation Développeur — v1.0**

## 1. Introduction

Ce document décrit la **Spécification Fonctionnelle Logicielle (SFL / SFD)** du **moteur de Gestion des Contrats &
Horaires** de Toké — la solution de pointage **offline-first** destinée aux PME africaines.

Il présente les concepts, structures de données, logiques internes, flux fonctionnels, contraintes, cas limites,
mécanismes anti-fraude et fonctionnement hors-ligne.

Ce document est destiné à :

* Développeurs backend
* Développeurs mobile
* Équipes QA
* Architectes système
* Product Owners techniques

Il est écrit pour être **non ambigu**, **prêt à implémenter**, et cohérent avec les principes fondamentaux de Toké.

---

## 2. Principes de conception

1. **Offline-first :** l’évaluation des horaires doit fonctionner même sans internet.
2. **Simplicité managériale :** la configuration doit être rare, jamais quotidienne.
3. **Calcul déterministe :** pour une date donnée, Toké doit produire le même horaire attendu quelle que soit la
   source (template, rotation, exceptions).
4. **Anti-fraude :** GPS, QR, horodatage et sessions doivent être cohérents.
5. **Modularité :** les horaires ne sont pas liés directement aux employés mais dérivés de templates, rotations et
   exceptions.
6. **Tolérance aux absences de données :** en cas de configuration manquante, utiliser la configuration par défaut de
   l’entreprise sans stopper l’évaluation.

---

## 3. Terminologie

### 3.1 Contrat

Concept général définissant les règles de travail attendues pour un ou plusieurs employés.
Dans Toké, un “contrat” correspond à :

* un **template de session**, ou
* un **groupe de rotation** utilisant des templates.

### 3.2 Template de Session

Définition réutilisable décrivant :

* blocs de travail (1..N)
* blocs de pause (0..N)
* tolérances
* jours d’application
* période de validité

Exemple :

```json
{
  "Lun": [
    {
      "work": [
        "08:00",
        "12:59"
      ],
      "pause": [
        "12:01",
        "13:59"
      ],
      "tolerance": 30
    },
    {
      "work": [
        "14:00",
        "18:00"
      ],
      "pause": null,
      "tolerance": 30
    }
  ],
  "Mer": [
    {
      "work": [
        "14:00",
        "16:59"
      ],
      "pause": null,
      "tolerance": 30
    }
  ]
}
```

### 3.3 Groupe de Rotation

Cycle de travail basé sur le temps (ex : 2×8, 3×8).
Le moteur déduit le template à appliquer selon :

* longueur du cycle
* unité du cycle (jour/semaine)
* offset de l’employé

### 3.4 Exception (Override)

Remplacement temporaire d’un horaire pour :

* un utilisateur
* un groupe

Applicable pour une date ou plage de dates.

### 3.5 Horaire Applicable du Jour

Horaire final obtenu après résolution :

1. Exception
2. Rotation
3. Template individuel
4. Template par défaut de l’entreprise

---

## 4. Modèle de données

### 4.1 session_templates

```sql
CREATE TABLE session_templates
(
    id         SERIAL PRIMARY KEY,
    tenant_id  INT   NOT NULL,
    name       VARCHAR(255),
    valid_from DATE,
    valid_to   DATE,
    definition JSONB NOT NULL, -- structure des blocs
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 rotation_groups

```sql
CREATE TABLE rotation_groups
(
    id              SERIAL PRIMARY KEY,
    tenant_id       INT  NOT NULL,
    name            VARCHAR(255),
    cycle_length    INT  NOT NULL,
    cycle_unit      VARCHAR(10) CHECK (cycle_unit IN ('day', 'week')),
    cycle_templates INT[] NOT NULL,
    start_date      DATE NOT NULL
);
```

### 4.3 rotation_assignments

```sql
CREATE TABLE rotation_assignments
(
    id                SERIAL PRIMARY KEY,
    user_id           INT NOT NULL,
    rotation_group_id INT NOT NULL,
    offset            INT         DEFAULT 0,
    assigned_at       TIMESTAMPTZ DEFAULT now()
);
```

### 4.4 schedule_exceptions

```sql
CREATE TABLE schedule_exceptions
(
    id                  SERIAL PRIMARY KEY,
    user_id             INT,
    group_id            INT,
    session_template_id INT  NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    created_by          INT,
    reason              TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Algorithme de résolution des horaires

### 5.1 Point d’entrée

```
getApplicableSchedule(user_id, target_date)
```

### 5.2 Ordre de résolution

1. Exception active
2. Rotation active
3. Template affecté à l’employé
4. Template par défaut

### 5.3 Logique de rotation

```
cycle_index = floor( diff(target_date, rotation.start_date, unit) ) % cycle_length
actual_index = (cycle_index + offset) % cycle_length
return cycle_templates[actual_index]
```

### 5.4 Comportement hors-ligne

* Les templates, rotations et exceptions sont mis en cache local.
* Si le cache est obsolète → avertir l’utilisateur mais continuer avec les données locales.
* Les conflits sont résolus à la synchronisation.

---

## 6. Moteur d’évaluation du temps

### 6.1 Entrées

* clock_in / clock_out
* pause_start / pause_end
* horaire du jour
* tolérances
* règles de pause

### 6.2 Anomalies détectées

| Code            | Description            | Condition                         |
|-----------------|------------------------|-----------------------------------|
| LATE_ARRIVAL    | Retard                 | clock_in > work_start + tolerance |
| EARLY_LEAVE     | Départ anticipé        | clock_out < block_end             |
| PAUSE_TOO_LONG  | Pause trop longue      | pause_end - pause_start > limite  |
| PAUSE_NO_RETURN | Pas de retour de pause | deadline atteinte                 |
| MISSED_BLOCK    | Bloc non travaillé     | présence manquante                |

### 6.3 Mémos auto-générés

Tout écart génère un mémo contenant :

```
auto_generated = true
auto_reason = JSON structuré
severity = low/medium/high
```

Le manager valide ou rejette.

---

## 7. Anti-Fraude

* Validation GPS & QR pour chaque pointage
* Détection de déplacements impossibles
* Détection des pointages hors contrat
* Blocage en dehors du périmètre GPS (sauf mission autorisée)
* Fingerprint du device pour éviter le spoofing

---

## 8. Notes développeur & cas limites

### 8.1 Employé hors-ligne > 7 jours

* Templates non mis à jour
* À la synchro : détection de conflit
* Mémo si un mauvais template a été utilisé hors-ligne

### 8.2 Chevauchement d’exceptions

Règles :

1. La plus récente l’emporte
2. Exception utilisateur > exception groupe
3. Chevauchement interdit sans avertissement

### 8.3 Expiration de template

Si `valid_to < today` :

* fallback sur le template par défaut
* alerte manager

### 8.4 Blocs multiples

Chaque bloc est évalué individuellement :

* retard par bloc
* départ anticipé par bloc
* bloc manqué

---

## 9. Stratégie de tests

### 9.1 Unitaires

* parsing template
* résolution d’horaire
* calcul rotation
* priorité exceptions

### 9.2 Intégration

* offline → sync anomaly
* mismatch template après reconnexion
* réaffectation de rotation

### 9.3 E2E

* journée complète multi-blocs
* shift de nuit (22h–06h)
* pause longue détection

---

## 10. KPIs

* taux d’anomalies détectées
* taux de faux positifs
* nombre d’exceptions mensuelles
* stabilité des rotations
* temps moyen d’évaluation

---

## 11. Limitations connues

* Dépend de l’action utilisateur (pause start/end)
* Les changements imprévus doivent passer par exception
* Rotations non uniformes = logique supplémentaire
* Trop de blocs = complexité UI

---

## 12. Améliorations futures

* Classification IA des anomalies
* Inference automatique d’horaires basés sur l’historique
* Forecasting & analytics RH
* Éditeur visuel de calendriers (Phase 3)

---

## 13. Conclusion

Cette SFD fournit une base solide, extensible et simple pour implémenter la gestion des contrats et horaires dans Toké.
Elle équilibre complexité, robustesse hors-ligne et simplicité d’utilisation — cœur de la mission UX de Toké.
