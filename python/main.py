"""
Point d'entrée principal du système de prospection
"""
import sys
from database import Database
from scraper import ProspectScraper
from email_finder import EmailFinder
from analyzer import WebsiteAnalyzer
from email_generator import EmailGenerator
from email_sender import EmailSender
from dashboard import run_dashboard


class ProspectingSystem:
    """Système de prospection automatique"""

    def __init__(self):
        self.db = Database()
        self.scraper = ProspectScraper()
        self.email_finder = EmailFinder()
        self.analyzer = WebsiteAnalyzer()
        self.email_generator = EmailGenerator()
        self.email_sender = EmailSender()

    def run_full_pipeline(self):
        """Lance le pipeline complet de prospection"""
        print('╔════════════════════════════════════════════════════════════╗')
        print('║     🚀 SYSTÈME DE PROSPECTION AUTOMATIQUE                 ║')
        print('║     Pipeline: Scraping → Emails → Analyse → Envoi         ║')
        print('╚════════════════════════════════════════════════════════════╝\n')

        try:
            # Étape 1: Scraping
            print('📍 ÉTAPE 1/5: Scraping des prospects...\n')
            self.scraper.run_full_scraping()

            print('\n' + '─' * 60 + '\n')

            # Étape 2: Recherche des emails
            print('📍 ÉTAPE 2/5: Recherche des emails...\n')
            self.email_finder.find_all_emails()

            print('\n' + '─' * 60 + '\n')

            # Étape 3: Analyse
            print('📍 ÉTAPE 3/5: Analyse des sites web...\n')
            self.analyzer.analyze_all_prospects()

            print('\n' + '─' * 60 + '\n')

            # Étape 4: Génération des emails
            print('📍 ÉTAPE 4/5: Génération des emails personnalisés...\n')
            self.email_generator.generate_all_emails()

            print('\n' + '─' * 60 + '\n')

            # Étape 5: Statistiques finales
            print('📍 ÉTAPE 5/5: Récapitulatif\n')
            stats = self.db.get_stats()
            prospects_with_email = self.db.count_prospects_with_email()

            print('╔════════════════════════════════════════════════════════════╗')
            print('║                    📊 STATISTIQUES                         ║')
            print('╠════════════════════════════════════════════════════════════╣')
            print(f'║  Total prospects trouvés:        {str(stats["total_prospects"]).ljust(23)}║')
            print(f'║  Prospects avec email:           {str(prospects_with_email).ljust(23)}║')
            print(f'║  Prospects analysés:             {str(stats["analyzed"]).ljust(23)}║')
            print(f'║  Emails générés:                 {str(stats["analyzed"]).ljust(23)}║')
            print('╚════════════════════════════════════════════════════════════╝\n')

            print('✅ Pipeline terminé avec succès!\n')
            print('📌 Prochaines étapes:')
            print('   1. Vérifiez vos prospects: python dashboard.py')
            print('   2. Configurez votre email SMTP dans .env')
            print('   3. Envoyez les emails: python email_sender.py\n')

        except Exception as error:
            print(f'❌ Erreur dans le pipeline: {error}')
            import traceback
            traceback.print_exc()
        finally:
            self.cleanup()

    def show_stats(self):
        """Affiche les statistiques"""
        stats = self.db.get_stats()

        print('\n╔════════════════════════════════════════════════════════════╗')
        print('║              📊 STATISTIQUES DE PROSPECTION                ║')
        print('╠════════════════════════════════════════════════════════════╣')
        print(f'║  Total prospects:                {str(stats["total_prospects"]).ljust(23)}║')
        print(f'║  Nouveaux:                       {str(stats["new_prospects"]).ljust(23)}║')
        print(f'║  Analysés:                       {str(stats["analyzed"]).ljust(23)}║')
        print(f'║  Contactés:                      {str(stats["contacted"]).ljust(23)}║')
        print(f'║  Réponses:                       {str(stats["replied"]).ljust(23)}║')
        print(f'║  Convertis:                      {str(stats["converted"]).ljust(23)}║')
        print('╠════════════════════════════════════════════════════════════╣')

        contacted = stats['contacted'] or 0
        converted = stats['converted'] or 0
        replied = stats['replied'] or 0

        conversion_rate = (converted / contacted * 100) if contacted > 0 else 0
        reply_rate = (replied / contacted * 100) if contacted > 0 else 0

        print(f'║  Taux de réponse:                {reply_rate:.1f}%'.ljust(64) + '║')
        print(f'║  Taux de conversion:             {conversion_rate:.1f}%'.ljust(64) + '║')
        print('╚════════════════════════════════════════════════════════════╝\n')

        self.cleanup()

    def show_menu(self):
        """Affiche le menu"""
        print('\n╔════════════════════════════════════════════════════════════╗')
        print('║     🎯 SYSTÈME DE PROSPECTION AUTOMATIQUE                 ║')
        print('╠════════════════════════════════════════════════════════════╣')
        print('║  Commandes disponibles:                                   ║')
        print('║                                                            ║')
        print('║  python scraper.py           → Scraper des prospects      ║')
        print('║  python email_finder.py      → Trouver les emails         ║')
        print('║  python analyzer.py          → Analyser les sites web     ║')
        print('║  python email_generator.py   → Générer les emails         ║')
        print('║  python email_sender.py      → Envoyer les emails         ║')
        print('║  python dashboard.py         → Lancer le dashboard        ║')
        print('║  python main.py pipeline     → Pipeline complet           ║')
        print('╚════════════════════════════════════════════════════════════╝\n')

    def cleanup(self):
        """Nettoie les ressources"""
        self.db.close()
        self.scraper.close()
        self.email_finder.close()
        self.analyzer.close()
        self.email_generator.close()
        self.email_sender.close()


if __name__ == '__main__':
    system = ProspectingSystem()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == 'pipeline':
            system.run_full_pipeline()
        elif command == 'stats':
            system.show_stats()
        elif command == 'dashboard':
            run_dashboard()
        else:
            system.show_menu()
    else:
        system.show_menu()
