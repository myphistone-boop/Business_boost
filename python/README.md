# 🐍 Système de Prospection Automatique (Python)

Système complet de prospection automatique pour vente de sites web - **Version Python**.

## ✨ Pourquoi Python ?

Cette version est identique fonctionnellement à la version Node.js, mais en Python :
- ✅ Pas besoin de Node.js
- ✅ Python natif sur Windows
- ✅ Léger et performant
- ✅ Bibliothèques puissantes (BeautifulSoup, Requests, Flask)

## 📋 Fonctionnalités

1. **Scraper de Prospects** - PagesJaunes
2. **Recherche Automatique d'Emails** - Scraping + Génération
3. **Analyseur de Sites Web** - Performance + SEO
4. **Générateur d'Emails Personnalisés** - OpenAI ou Templates
5. **Système d'Envoi Automatique** - SMTP
6. **Dashboard Web** - Flask

## 🛠️ Installation

### Prérequis
- Python 3.8+ ([Télécharger](https://www.python.org/downloads/))

### Étapes

```powershell
# 1. Aller dans le dossier Python
cd python

# 2. Créer un environnement virtuel (recommandé)
python -m venv venv

# 3. Activer l'environnement virtuel
# Sur Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Sur Windows CMD:
.\venv\Scripts\activate.bat

# 4. Installer les dépendances
pip install -r requirements.txt

# 5. Configurer l'environnement
copy .env.example .env
# Puis éditez .env avec vos informations
```

### Configuration Gmail

1. Allez sur https://myaccount.google.com/apppasswords
2. Créez un mot de passe d'application
3. Ajoutez-le dans `.env` → `SMTP_PASSWORD`

## 🚀 Utilisation

### Pipeline Complet Automatique

```powershell
python main.py pipeline
```

### Étape par Étape

```powershell
# 1. Scraper des prospects
python scraper.py

# 2. Trouver les emails
python email_finder.py

# 3. Analyser les sites
python analyzer.py

# 4. Générer les emails
python email_generator.py

# 5. Envoyer les emails
python email_sender.py

# 6. Dashboard (dans un autre terminal)
python dashboard.py
# Ouvrez http://localhost:3000
```

### Commandes Utiles

```powershell
# Voir les statistiques
python main.py stats

# Tester l'envoi d'email
python email_sender.py test votre@email.com

# Afficher le menu
python main.py
```

## 📁 Structure

```
python/
├── database.py           # Gestion SQLite
├── scraper.py            # Scraping PagesJaunes
├── email_finder.py       # Recherche d'emails
├── analyzer.py           # Analyse de sites
├── email_generator.py    # Génération d'emails
├── email_sender.py       # Envoi SMTP
├── dashboard.py          # Dashboard Flask
├── main.py              # Point d'entrée
├── requirements.txt      # Dépendances Python
├── .env.example         # Configuration exemple
└── README.md            # Ce fichier
```

## 📊 Résultats Attendus

Sur 100 prospects scrapés :
- 70-80 avec email trouvé (scraping + génération)
- Taux d'ouverture : 20-30%
- Taux de réponse : 5-10%
- Taux de conversion : 1-3%

## 🔧 Dépannage

### "pip not found"
```powershell
python -m pip install --upgrade pip
```

### "Module not found"
```powershell
pip install -r requirements.txt
```

### Erreur SMTP
- Vérifiez votre mot de passe d'application Gmail
- Vérifiez que la validation en 2 étapes est activée

### Scraping ne trouve rien
- PagesJaunes peut bloquer trop de requêtes
- Essayez différents secteurs
- Augmentez les délais

## 🎯 Avantages Python vs Node.js

| Critère | Python ✅ | Node.js |
|---------|----------|---------|
| Installation | Natif Windows | Nécessite installation |
| Facilité | Simple | Moyen |
| Performance Scraping | Excellent | Excellent |
| Bibliothèques | BeautifulSoup | Cheerio/Puppeteer |
| Dashboard | Flask (léger) | Express |

## 💡 Conseils

1. **Commencez petit** : 10-20 emails/jour
2. **Testez d'abord** : `python email_sender.py test`
3. **Surveillez les stats** : `python main.py stats`
4. **Personnalisez** : Ajoutez OpenAI pour des emails ultra-personnalisés

## 📈 Optimisations Possibles

- Ajouter Selenium pour scraping JavaScript
- Implémenter un système de queue
- Ajouter des relances automatiques
- Intégrer un CRM

## 📄 Licence

MIT - Utilisez librement pour votre business !

---

**🚀 Bonne prospection avec Python !**
