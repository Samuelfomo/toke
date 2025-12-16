# Comment fonctionne la gestion des horaires dans Toké - Expliqué simplement

Imagine que tu gères une petite entreprise avec plusieurs employés qui ont des horaires différents. Toké t'aide à gérer
tout ça automatiquement. Voici comment :

## 🎯 Le Principe de Base

Au lieu de dire chaque jour à chaque employé "tu travailles de 8h à 17h aujourd'hui", tu crées des **modèles d'horaires
** une seule fois, et Toké s'occupe du reste.

---

## 📋 Les 3 Façons de Définir des Horaires

### **1. Le Modèle Simple (Session Template)**

C'est comme un emploi du temps fixe.

**Exemple :** Marie travaille toujours :

- **Lundi à Vendredi :** 8h-12h puis 14h-18h (avec pause de 12h à 14h)
- **Samedi :** 9h-13h
- **Dimanche :** repos

Tu crées ce modèle une fois, tu l'assignes à Marie, et c'est bon pour toute l'année !

---

### **2. Les Rotations (Rotation Groups)**

Pour les équipes qui alternent, comme les vigiles ou infirmières.

**Exemple d'équipe 2×8 (2 équipes qui alternent) :**

- **Semaine 1 :** Jean fait l'équipe du matin (6h-14h)
- **Semaine 2 :** Jean fait l'équipe de l'après-midi (14h-22h)
- **Semaine 3 :** retour à l'équipe du matin
- Et ça tourne en boucle

**Comment Toké gère ça :**

1. Tu crées 2 modèles : "Matin" et "Après-midi"
2. Tu les mets dans un groupe de rotation
3. Tu assignes Jean à ce groupe avec un "décalage" (offset)
4. Toké calcule automatiquement quel modèle appliquer chaque semaine

**Autre exemple - Équipe 3×8 :**

- 3 équipes : Matin, Après-midi, Nuit
- Chaque personne change d'équipe toutes les semaines
- Ahmed commence en équipe 1, Sophie en équipe 2, etc.

---

### **3. Les Exceptions (Overrides)**

Pour les situations temporaires.

**Scénarios typiques :**

**Cas 1 - Jour férié :**
Normalement tout le monde travaille lundi, mais c'est un jour férié. Tu crées une exception "Fermé" pour toute
l'entreprise ce jour-là.

**Cas 2 - Remplacement :**
Pierre est malade. Tu demandes à Sophie de faire son horaire (équipe de nuit) juste pour 3 jours. Tu crées une exception
pour Sophie du 5 au 7 mars.

**Cas 3 - Formation :**
Marie doit suivre une formation. Au lieu de 8h-18h, elle fait juste 8h-12h cette semaine.

---

## 🔍 Comment Toké Décide de l'Horaire du Jour

Chaque jour, pour chaque employé, Toké se pose ces questions **dans l'ordre** :

```
1. Y a-t-il une EXCEPTION aujourd'hui pour cet employé ?
   → OUI : on utilise cet horaire spécial
   → NON : on continue

2. L'employé est-il dans une ROTATION ?
   → OUI : on calcule où il en est dans le cycle et on applique le bon modèle
   → NON : on continue

3. L'employé a-t-il un MODÈLE PERSONNEL assigné ?
   → OUI : on utilise ce modèle
   → NON : on continue

4. On utilise l'HORAIRE PAR DÉFAUT de l'entreprise
```

---

## ⏰ La Vérification des Horaires

Une fois que Toké connaît l'horaire attendu, il surveille si l'employé le respecte.

### **Les Blocs de Travail**

Un horaire peut avoir plusieurs "blocs". Par exemple :

- **Bloc 1 :** 8h-12h (travail le matin)
- **Pause :** 12h-14h
- **Bloc 2 :** 14h-18h (travail l'après-midi)

### **La Tolérance**

Tu peux définir une marge. Par exemple :

- Tolérance de 15 minutes
- Si l'horaire dit "8h00" et que l'employé pointe à 8h12, c'est OK
- S'il pointe à 8h20, c'est un retard

---

## 🚨 La Détection d'Anomalies

Toké détecte automatiquement les problèmes :

### **Retard (LATE_ARRIVAL)**

**Situation :** L'horaire dit 8h, tolérance 15 min, l'employé pointe à 8h30
**Action Toké :** Crée une note automatique "Retard de 30 minutes"

### **Départ anticipé (EARLY_LEAVE)**

**Situation :** L'horaire dit jusqu'à 18h, l'employé part à 17h30
**Action Toké :** Note "Départ anticipé de 30 minutes"

### **Pause trop longue (PAUSE_TOO_LONG)**

**Situation :** Pause autorisée 1h (12h-13h), l'employé revient à 13h45
**Action Toké :** Note "Pause dépassée de 45 minutes"

### **Absence de retour de pause (PAUSE_NO_RETURN)**

**Situation :** L'employé lance sa pause à 12h mais n'indique jamais son retour
**Action Toké :** Alerte générée après un délai

### **Bloc manqué (MISSED_BLOCK)**

**Situation :** L'horaire indique un bloc 14h-18h, mais aucun pointage enregistré
**Action Toké :** Note "Absence sur le bloc après-midi"

---

## 📱 Le Mode Hors-Ligne (Offline-First)

C'est LA particularité de Toké pour l'Afrique.

### **Comment ça marche :**

1. **Téléchargement initial :**
    - L'employé ouvre l'app avec internet
    - Toké télécharge tous ses horaires pour les 30 prochains jours
    - Ça inclut : modèles, rotations, exceptions

2. **Utilisation sans internet :**
    - L'employé pointe normalement
    - Toké vérifie localement si c'est dans les horaires
    - Tout est enregistré sur le téléphone

3. **Synchronisation :**
    - Quand internet revient, tout remonte
    - Si des modifications ont été faites pendant ce temps, Toké les détecte

### **Exemple concret :**

Ahmed est vigile dans un site isolé sans réseau. Le lundi matin avant de partir, il ouvre l'app chez lui (avec WiFi).
Toute la semaine, il pointe normalement. Le vendredi soir en rentrant, tout se synchronise automatiquement.

---

## 🛡️ Les Protections Anti-Fraude

Pour éviter les tricheries :

### **1. Géolocalisation (GPS)**

- Chaque pointage enregistre la position
- Si l'employé doit être au bureau mais pointe depuis chez lui → alerte

### **2. Code QR**

- Un QR unique au site de travail
- L'employé doit scanner ce QR pour valider son pointage
- Impossible de pointer depuis ailleurs

### **3. Détection de mouvements impossibles**

**Exemple :**

- 8h00 : pointage au Site A
- 8h05 : pointage au Site B (à 50km)
- → Alerte : déplacement impossible en 5 minutes

### **4. Empreinte de l'appareil**

- Toké reconnaît le téléphone de l'employé
- Changement soudain d'appareil → vérification requise

---

## 📊 Scénarios Complets

### **Scénario 1 : Employé Normal (Modèle Simple)**

**Pierre - Vendeur dans un magasin**

- **Horaire :** Lundi-Samedi 9h-13h et 15h-19h
- **Lundi 4 décembre :**
    - 8h55 : Pierre pointe → OK (dans la tolérance)
    - 13h02 : Début pause → OK
    - 14h58 : Fin pause → OK
    - 19h10 : Fin journée → OK (heures sup détectées)

**Ce que voit le manager :**

- Journée normale
- +10 minutes d'heures supplémentaires

---

### **Scénario 2 : Équipe en Rotation**

**Équipe de sécurité - 3 vigiles, rotation 3×8**

**Configuration :**

- **Rotation A :** 6h-14h (matin)
- **Rotation B :** 14h-22h (après-midi)
- **Rotation C :** 22h-6h (nuit)
- Changement chaque semaine

**Semaine 1 :**

- Ahmed → Rotation A
- Sophie → Rotation B
- Jean → Rotation C

**Semaine 2 (rotation automatique) :**

- Ahmed → Rotation B
- Sophie → Rotation C
- Jean → Rotation A

Toké calcule tout automatiquement. Le manager ne fait RIEN !

---

### **Scénario 3 : Avec Exception**

**Marie - Normalement 8h-17h**

**Mardi 5 décembre :** Formation

- Le manager crée une exception : 5 déc uniquement, 9h-12h
- Marie pointe à 9h05 → OK
- Marie part à 12h10 → OK
- Toké ignore l'horaire normal et applique l'exception

**Mercredi 6 décembre :**

- Retour automatique à l'horaire normal 8h-17h

---

### **Scénario 4 : Problème Hors-Ligne**

**Contexte :** Sophie travaille dans une zone sans réseau toute la semaine

**Lundi (avec réseau) :**

- Sophie synchronise : télécharge horaire semaine 48

**Mardi (manager modifie son horaire) :**

- Le manager crée une exception pour Sophie jeudi
- Sophie n'a pas internet, ne reçoit pas la mise à jour

**Jeudi :**

- Sophie pointe selon son ancien horaire (8h-17h)
- Mais le nouveau dit 10h-19h

**Vendredi (retour réseau) :**

- Synchronisation détecte le conflit
- Toké génère une alerte pour le manager
- Le manager valide manuellement les heures de jeudi

---

## 🎓 Points Clés à Retenir

1. **Configuration une seule fois** : Tu ne refais pas les horaires chaque jour
2. **3 niveaux** : Modèle simple, Rotation, Exception
3. **Priorité** : Exception > Rotation > Modèle personnel > Défaut
4. **Automatique** : Toké calcule l'horaire attendu et vérifie automatiquement
5. **Hors-ligne** : Tout fonctionne même sans internet
6. **Anti-fraude** : GPS, QR, détections d'anomalies
7. **Tolérance** : Tu définis des marges pour ne pas être trop strict

---

## ❓ Questions Fréquentes

**Q : Et si je change un horaire en cours de mois ?**
R : Tu crées une exception pour la période concernée. L'ancien horaire reste pour le reste.

**Q : Comment gérer les jours fériés ?**
R : Exception de groupe pour toute l'entreprise sur cette date.

**Q : Un employé peut avoir plusieurs modèles ?**
R : Non, un seul à la fois. Mais tu peux changer via des exceptions.

**Q : Les rotations peuvent être de combien de temps ?**
R : Journalière, hebdomadaire, ou autre. Tu définis le cycle.

**Q : Que se passe-t-il si l'employé oublie de pointer ?**
R : Toké détecte "bloc manqué" et crée une alerte pour le manager.

---

Voilà ! Le système est conçu pour être simple à configurer mais puissant dans son fonctionnement automatique. L'idée :
le manager fait le minimum de travail, Toké s'occupe du reste ! 🚀