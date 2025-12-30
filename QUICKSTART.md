# ⚡ Guide de Démarrage Rapide (5 minutes)

## 🎯 Objectif
Avoir votre premier email de prospection envoyé en moins de 10 minutes.

## 📝 Checklist

### 1. Installation (2 min)
```bash
# Installer les dépendances
npm install

# Copier la configuration
cp .env.example .env
```

### 2. Configuration Minimale (2 min)

Éditez `.env` avec **au minimum** :

```env
# Email (utilisez votre Gmail)
SMTP_USER=votre.email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # Mot de passe d'application Gmail
FROM_EMAIL=votre.email@gmail.com
FROM_NAME=Jean Dupont

# Votre entreprise
YOUR_COMPANY_NAME=Mon Agence Web
YOUR_PHONE=06 XX XX XX XX
```

**Comment obtenir le mot de passe Gmail ?**
1. Allez sur https://myaccount.google.com/apppasswords
2. Créez un mot de passe pour "Mail"
3. Copiez-le dans `SMTP_PASSWORD`

### 3. Test (1 min)

```bash
# Compiler le TypeScript
npm run build

# Tester l'envoi d'email
npm run send-emails test votre.email@gmail.com
```

Vous devriez recevoir un email de test ! ✅

### 4. Votre Première Campagne (5 min)

```bash
# Étape 1 : Trouver des prospects
npm run scrape

# Étape 2 : Trouver leurs emails 🆕
npm run find-emails
# Scrape les sites + génère des emails probables

# Étape 3 : Analyser leurs sites
npm run analyze

# Étape 4 : Générer les emails
npm run generate-emails

# Étape 5 : Voir le dashboard
npm run dashboard
# Ouvrez http://localhost:3000
```

### 5. Envoyer les Premiers Emails (1 min)

**Important : Commencez petit !**

Éditez `src/emailSender.ts` ligne 127 :
```typescript
async runCampaign(options: {
  dailyLimit?: number;  // Changez cette valeur
```

Puis :
```bash
npm run send-emails
```

## 🎉 C'est Parti !

Vous avez maintenant :
- ✅ Des prospects dans votre base de données
- ✅ Leurs sites analysés
- ✅ Des emails personnalisés générés
- ✅ Vos premiers emails envoyés

## 📊 Voir les Résultats

```bash
# Dashboard web
npm run dashboard
# → http://localhost:3000

# Statistiques en console
npm run dev stats
```

## 🚀 Pour Aller Plus Loin

### Ajouter l'IA (emails ultra-personnalisés)

1. Créez un compte sur https://platform.openai.com/
2. Ajoutez $5 de crédit
3. Créez une API key
4. Ajoutez dans `.env` :
```env
OPENAI_API_KEY=sk-votre-clé-ici
```

### Automatiser l'Envoi Quotidien

**Option 1 : Cron (Linux/Mac)**
```bash
# Ouvrir crontab
crontab -e

# Ajouter cette ligne (envoi tous les jours à 9h)
0 9 * * * cd /path/to/Business_boost && npm run send-emails
```

**Option 2 : Windows Task Scheduler**
1. Ouvrir "Planificateur de tâches"
2. Créer une tâche qui lance `npm run send-emails`
3. Planifier l'exécution quotidienne

**Option 3 : Script npm**
Créez un script qui tourne en continu :
```bash
npm run dev pipeline
```

## 💡 Conseils Rapides

### Meilleurs Secteurs pour Débuter
```env
TARGET_SECTORS=restaurant,coiffeur,plombier
```

### Éviter le Spam
- Jour 1-3 : Max 10 emails/jour
- Jour 4-7 : Max 30 emails/jour
- Après : 50-100 emails/jour

### Améliorer le Taux de Réponse
1. Personnalisez le template dans `src/emailGenerator.ts`
2. Mentionnez 2-3 problèmes SPÉCIFIQUES du site
3. Offrez un audit GRATUIT
4. Soyez bref (max 150 mots)

## ❓ Problèmes Courants

### "Error: Invalid login"
→ Vérifiez votre mot de passe d'application Gmail

### "No prospects found"
→ Changez le secteur ou la location dans `.env`

### Les emails ne sont pas personnalisés
→ Ajoutez `OPENAI_API_KEY` pour l'IA

## 📞 Besoin d'Aide ?

Consultez le README.md complet pour plus de détails !

---

**🎯 Objectif : 10 emails envoyés aujourd'hui !**
