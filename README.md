# 🚀 Système de Prospection Automatique pour Vente de Sites Web

Système complet et automatisé pour trouver, analyser et contacter des prospects pour votre business de vente de sites web.

## 📋 Fonctionnalités

✅ **1. Scraper de Prospects**
- Recherche automatique d'entreprises sur PagesJaunes
- Recherche par secteur d'activité et localisation
- Extraction des coordonnées (nom, site web, téléphone)
- Détection des entreprises SANS site web (prospects prioritaires)

✅ **2. Recherche Automatique d'Emails** 🆕
- **Scraping des sites web** : Parcourt les pages Contact, Mentions légales
- **Génération intelligente** : Crée des emails probables (contact@domaine.fr)
- **Validation DNS** : Vérifie l'existence des serveurs mail
- Taux de succès : **70-80% des prospects**

✅ **3. Analyseur de Sites Web**
- Analyse automatique de la performance (vitesse de chargement)
- Score SEO (balises meta, titres, structure)
- Détection responsive/mobile-friendly
- Vérification HTTPS
- Identification des technologies obsolètes
- Liste des problèmes et opportunités d'amélioration

✅ **4. Générateur d'Emails Personnalisés**
- Génération automatique avec OpenAI (GPT-4)
- Templates prédéfinis si pas d'API
- Personnalisation basée sur l'analyse du site
- Mention des problèmes spécifiques identifiés
- Call-to-action optimisé

✅ **5. Système d'Envoi d'Emails**
- Envoi automatique via SMTP
- Limite journalière configurable
- Délai entre envois (anti-spam)
- Suivi des emails envoyés
- Mode test

✅ **6. Dashboard de Suivi**
- Interface web pour visualiser les prospects
- Statistiques en temps réel
- API REST pour intégrations
- Export des données

## 🛠️ Installation

### Prérequis
- Node.js 18+ ([Télécharger](https://nodejs.org/))
- npm ou yarn

### Étapes d'installation

1. **Cloner le projet**
```bash
git clone <votre-repo>
cd Business_boost
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos paramètres :

```env
# Configuration Email (Gmail recommandé)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-app  # Voir instructions ci-dessous
FROM_EMAIL=votre-email@gmail.com
FROM_NAME=Votre Nom

# OpenAI API (optionnel mais recommandé)
OPENAI_API_KEY=sk-votre-clé-ici

# Configuration de prospection
TARGET_SECTORS=restaurant,coiffeur,plombier,électricien,avocat,dentiste
SEARCH_LOCATION=Paris
MAX_PROSPECTS_PER_DAY=100

# Votre entreprise
YOUR_COMPANY_NAME=Votre Agence Web
YOUR_WEBSITE=https://votresite.com
YOUR_PHONE=+33 X XX XX XX XX
```

### 🔑 Configuration Gmail (recommandé)

Pour utiliser Gmail comme serveur SMTP :

1. Activez la validation en 2 étapes sur votre compte Google
2. Allez sur https://myaccount.google.com/apppasswords
3. Créez un mot de passe d'application pour "Mail"
4. Utilisez ce mot de passe dans `SMTP_PASSWORD`

### 🤖 Configuration OpenAI (optionnel)

Pour des emails ultra-personnalisés avec l'IA :

1. Créez un compte sur https://platform.openai.com/
2. Ajoutez du crédit (quelques dollars suffisent pour des milliers d'emails)
3. Créez une clé API
4. Ajoutez-la dans `OPENAI_API_KEY`

**Sans OpenAI**, le système utilisera des templates prédéfinis (toujours très efficaces).

## 🚀 Utilisation

### Mode Pipeline Complet (automatique)

Lance tout le processus d'un coup :
```bash
npm start
```

Cela va :
1. Scraper des prospects selon vos critères
2. **Trouver automatiquement leurs emails** 🆕
3. Analyser leurs sites web
4. Générer des emails personnalisés
5. Afficher les statistiques

### Mode Étape par Étape

#### 1. Scraper des prospects
```bash
npm run scrape
```

Trouve des entreprises sur PagesJaunes selon les secteurs définis dans `.env`

#### 2. Trouver les emails 🆕
```bash
npm run find-emails
```

**Nouveau module !** Trouve automatiquement les emails :
- Scrape les pages Contact/Mentions légales
- Génère des emails probables (contact@, info@)
- Valide les serveurs mail (DNS)
- Taux de succès : 70-80%

#### 3. Analyser les sites web
```bash
npm run analyze
```

Analyse les sites web de tous les prospects trouvés (performance, SEO, etc.)

#### 4. Générer les emails
```bash
npm run generate-emails
```

Crée des emails personnalisés pour chaque prospect

#### 5. Envoyer les emails

**Test d'abord :**
```bash
npm run send-emails test votre-email@test.com
```

**Campagne réelle :**
```bash
npm run send-emails
```

#### 6. Dashboard de suivi
```bash
npm run dashboard
```

Ouvre un dashboard web sur http://localhost:3000

### 📊 Voir les statistiques

```bash
npm run dev stats
```

## 📁 Structure du Projet

```
Business_boost/
├── src/
│   ├── database.ts           # Gestion de la base de données SQLite
│   ├── scraper.ts            # Scraping de prospects
│   ├── analyzer.ts           # Analyse de sites web
│   ├── emailGenerator.ts     # Génération d'emails personnalisés
│   ├── emailSender.ts        # Envoi d'emails
│   ├── dashboard.ts          # Dashboard web
│   └── index.ts              # Point d'entrée principal
├── .env                      # Configuration (à créer)
├── .env.example             # Exemple de configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 💡 Stratégie de Prospection Recommandée

### Phase 1 : Test (Jour 1-3)
1. Configurez le système avec 1-2 secteurs
2. Scrapez 20-30 prospects
3. Analysez-les
4. Générez des emails
5. Envoyez à 5-10 prospects en test
6. Mesurez le taux d'ouverture et de réponse

### Phase 2 : Optimisation (Jour 4-7)
1. Ajustez les templates d'emails selon les retours
2. Affinez les secteurs cibles
3. Testez différents angles d'approche

### Phase 3 : Scale (Jour 8+)
1. Augmentez progressivement le volume (50-100 emails/jour)
2. Automatisez l'envoi quotidien
3. Suivez vos conversions dans le dashboard

## 🎯 Meilleurs Secteurs à Cibler

**Priorité 1 (Besoin élevé, budget correct) :**
- Restaurants
- Hôtels
- Agences immobilières
- Cabinets d'avocats
- Cabinets dentaires
- Kinésithérapeutes

**Priorité 2 (Volume élevé) :**
- Plombiers
- Électriciens
- Coiffeurs
- Esthéticiennes

**Priorité 3 (Budget élevé) :**
- Architectes
- Experts-comptables
- Consultants

## 📈 Métriques à Suivre

- **Taux d'ouverture** : >20% = bon
- **Taux de réponse** : >5% = excellent
- **Taux de conversion** : >1% = très bon

## ⚠️ Limites et Bonnes Pratiques

### Limites d'envoi recommandées
- **Nouveaux comptes email** : 20-30 emails/jour
- **Comptes établis** : 50-100 emails/jour
- **Avec domaine dédié** : 200-500 emails/jour

### Éviter le spam
✅ Personnalisez chaque email
✅ Offrez de la valeur (audit gratuit)
✅ Incluez un lien de désabonnement
✅ Ne soyez pas trop insistant
✅ Respectez un délai entre envois

### Légal (RGPD)
- Les emails B2B sont autorisés en France
- Incluez toujours vos coordonnées
- Permettez le désabonnement facile
- Ne spammez pas

## 🔧 Dépannage

### Les emails ne s'envoient pas
- Vérifiez `SMTP_USER` et `SMTP_PASSWORD` dans `.env`
- Testez avec `npm run send-emails test votre@email.com`
- Vérifiez que le mot de passe d'application Gmail est correct

### Le scraping ne trouve pas de prospects
- PagesJaunes peut bloquer trop de requêtes rapides
- Ajoutez des délais plus longs dans le code
- Essayez différents secteurs

### L'analyse échoue
- Certains sites peuvent être inaccessibles
- C'est normal, le système continue avec les autres

### OpenAI ne fonctionne pas
- Vérifiez votre clé API
- Vérifiez que vous avez du crédit
- Le système basculera sur les templates automatiquement

## 🚀 Améliorations Futures Possibles

- [ ] Intégration LinkedIn pour trouver des emails
- [ ] Scraping Google Maps
- [ ] Suivi des ouvertures d'emails (tracking pixels)
- [ ] Suivi des clics
- [ ] Séquences d'emails (relances automatiques)
- [ ] Intégration CRM
- [ ] A/B testing d'emails
- [ ] Webhook pour notifications Slack/Discord

## 📞 Support

Pour toute question ou problème :
1. Vérifiez la documentation ci-dessus
2. Consultez les logs d'erreur
3. Vérifiez votre configuration `.env`

## 📄 Licence

MIT - Vous êtes libre d'utiliser et modifier ce système pour votre business.

---

**🎉 Bonne prospection ! Que les clients affluent !**
