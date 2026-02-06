# Charte Graphique Web - Toké (TypeScript/VueJS)

## 🎨 COULEURS

### Couleurs Principales
**Primary Blue:** `#004AAD`
**Secondary Yellow:** `#FFDE59`

### Couleurs Complémentaires
```
Success:   #28A745
Warning:   #FF8800
Error:     #DC3545  
Info:      #17A2B8

Text Primary:     #212529
Text Secondary:   #6C757D
Text Muted:       #ADB5BD
Text Disabled:    #CED4DA

Background:       #FFFFFF
Background Alt:   #F8F9FA
Card Background:  #FFFFFF
Sidebar:          #F8F9FA

Border Light:     #E9ECEF
Border Medium:    #DEE2E6
Border Dark:      #ADB5BD
```

**⚠️ CONTRASTE WCAG AAA - MISE EN GARDE:**
- Primary #004AAD sur blanc = 10.4:1 ✅ EXCELLENT
- Yellow #FFDE59 sur blanc = 1.8:1 ❌ INTERDIT pour du texte
- Yellow #FFDE59 sur Primary #004AAD = 5.8:1 ✅ BON
- Text Primary #212529 sur blanc = 16.8:1 ✅ EXCELLENT
- Text Secondary #6C757D sur blanc = 4.6:1 ✅ BON
- Text Muted #ADB5BD sur blanc = 2.8:1 ❌ Uniquement pour décoratif

**RÈGLES STRICTES:**
- JAMAIS de texte yellow sur fond blanc/clair
- Text Muted UNIQUEMENT pour éléments non-critiques
- Primary blue pour navigation et actions principales uniquement

---

## 🔤 TYPOGRAPHIE

### Police Principale
**Inter** (Google Fonts: 400, 500, 600, 700)
- Excellente lisibilité écran
- Support français complet
- Performance optimisée

### Hiérarchie Desktop
```
H1: 48px / Bold / line-height: 56px
H2: 40px / Bold / line-height: 48px
H3: 32px / SemiBold / line-height: 40px
H4: 24px / SemiBold / line-height: 32px
H5: 20px / Medium / line-height: 28px
H6: 18px / Medium / line-height: 24px

Body XL: 20px / Regular / line-height: 32px
Body Large: 18px / Regular / line-height: 28px
Body: 16px / Regular / line-height: 24px
Body Small: 14px / Regular / line-height: 20px
Caption: 12px / Medium / line-height: 16px

Button Large: 18px / SemiBold
Button: 16px / SemiBold  
Button Small: 14px / SemiBold
```

### Responsive (Mobile)
```
H1: 36px / H2: 28px / H3: 24px
Body: 16px minimum
Caption: 12px minimum
```

**⚠️ MISE EN GARDE ACCESSIBILITÉ:**
- MINIMUM ABSOLU: 12px (Caption/labels uniquement)
- CONTENU PRINCIPAL: Minimum 16px sur desktop, 16px sur mobile
- Line-height minimum: 1.4x la taille de police
- JAMAIS de texte en dessous de 12px

---

## 🖥️ COMPOSANTS

### Boutons
```
Primary Button:
- Background: #004AAD
- Text: #FFFFFF  
- Height: 48px
- Padding: 12px 24px
- Border-radius: 8px

Secondary Button:
- Background: transparent
- Border: 2px solid #004AAD
- Text: #004AAD
- Height: 48px
- Padding: 10px 22px

CTA Button:
- Background: #FFDE59
- Text: #004AAD
- Height: 52px  
- Padding: 16px 32px
- Border-radius: 12px
```

**⚠️ CONTRASTE VALIDÉ:**
- Primary: Blanc sur bleu = 10.4:1 ✅ EXCELLENT
- Secondary: Bleu sur transparent = vérifier selon le fond
- CTA: Bleu sur yellow = 5.8:1 ✅ BON

### Navigation
```
Header Height: 72px
Logo Height: 40px
Menu Items: 16px Medium, color #6C757D
Active Menu: #004AAD avec indicateur #FFDE59
Background: #FFFFFF
Border: 1px solid #E9ECEF
```

### Cartes
```
Background: #FFFFFF  
Border: 1px solid #E9ECEF
Border-radius: 12px
Padding: 24px (desktop) / 16px (mobile)
Shadow: 0 2px 8px rgba(0,0,0,0.08)
```

### Formulaires
```
Input Height: 48px
Input Border: 1px solid #CED4DA
Input Focus: Border #004AAD
Label: 14px Medium, color #495057
Placeholder: 16px Regular, color #ADB5BD
```

**⚠️ MISE EN GARDE UX:**
- Zone cliquable MINIMUM: 44px x 44px
- Espacement entre éléments interactifs: 8px minimum
- États focus TOUJOURS visibles
- Placeholder JAMAIS comme label

---

## 📐 ESPACEMENT & GRILLE

### Système 8px
```
XS: 4px
SM: 8px
MD: 16px  
LG: 24px
XL: 32px
2XL: 48px
3XL: 64px
4XL: 96px
```

### Container & Breakpoints
```
Mobile: < 768px (padding: 16px)
Tablet: 768px - 1024px (padding: 24px)  
Desktop: 1024px - 1440px (padding: 32px)
Large: > 1440px (max-width: 1200px, centré)
```

**⚠️ RÈGLE STRICTE:**
- UNIQUEMENT ces valeurs d'espacement
- Container max-width: 1200px pour lisibilité optimale
- Mobile-first approach OBLIGATOIRE

---

## 📊 ÉTATS & DONNÉES

### Tableaux
```
Header Background: #F8F9FA
Header Text: 14px SemiBold, color #495057
Row Height: 56px
Border: 1px solid #E9ECEF
Hover: Background #F8F9FA
```

### Formulaires - États
```
Normal: Border #CED4DA
Focus: Border #004AAD + shadow rgba(0,74,173,0.25)  
Error: Border #DC3545
Success: Border #28A745
Disabled: Background #F8F9FA, color #ADB5BD
```

**⚠️ CONTRASTE ÉTATS:**
- Error text #DC3545 sur blanc = 5.9:1 ✅ BON
- Success text #28A745 sur blanc = 3.4:1 ⚠️ Limite (texte large uniquement)
- Disabled text #ADB5BD sur blanc = 2.8:1 ❌ Non-critique uniquement

---

## ⚠️ INTERDICTIONS ABSOLUES

❌ **JAMAIS yellow #FFDE59 comme fond principal**
❌ **JAMAIS texte yellow sur fond blanc/clair**
❌ **JAMAIS texte #ADB5BD pour contenu critique**
❌ **JAMAIS de texte en dessous de 12px**
❌ **JAMAIS d'espacement hors système 8px**
❌ **JAMAIS d'éléments cliquables < 44px**
❌ **JAMAIS de container > 1200px de large**

## ✅ VALIDATIONS OBLIGATOIRES

✅ **Contraste minimum 4.5:1 pour texte normal**
✅ **Contraste minimum 3:1 pour texte large (18px+)**
✅ **Zone cliquable minimum 44px x 44px**
✅ **Test responsive sur 320px, 768px, 1024px**
✅ **Navigation clavier fonctionnelle**
✅ **Focus visible sur tous éléments interactifs**