#!/usr/bin/env node

import { ProspectScraper } from './scraper';
import { WebsiteAnalyzer } from './analyzer';
import { EmailGenerator } from './emailGenerator';
import { EmailSender } from './emailSender';
import { EmailFinder } from './emailFinder';
import { Dashboard } from './dashboard';
import { Database } from './database';
import * as dotenv from 'dotenv';

dotenv.config();

class ProspectingSystem {
  private scraper: ProspectScraper;
  private analyzer: WebsiteAnalyzer;
  private emailFinder: EmailFinder;
  private emailGenerator: EmailGenerator;
  private emailSender: EmailSender;
  private dashboard: Dashboard;
  private db: Database;

  constructor() {
    this.scraper = new ProspectScraper();
    this.analyzer = new WebsiteAnalyzer();
    this.emailFinder = new EmailFinder();
    this.emailGenerator = new EmailGenerator();
    this.emailSender = new EmailSender();
    this.dashboard = new Dashboard();
    this.db = new Database();
  }

  /**
   * Lance un pipeline complet de prospection
   */
  async runFullPipeline(): Promise<void> {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     🚀 SYSTÈME DE PROSPECTION AUTOMATIQUE                 ║');
    console.log('║     Pipeline: Scraping → Emails → Analyse → Envoi         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
      // Étape 1: Scraping
      console.log('📍 ÉTAPE 1/5: Scraping des prospects...\n');
      await this.scraper.runFullScraping();

      console.log('\n' + '─'.repeat(60) + '\n');

      // Étape 2: Recherche des emails
      console.log('📍 ÉTAPE 2/5: Recherche des emails...\n');
      await this.emailFinder.findAllEmails();

      console.log('\n' + '─'.repeat(60) + '\n');

      // Étape 3: Analyse
      console.log('📍 ÉTAPE 3/5: Analyse des sites web...\n');
      await this.analyzer.analyzeAllProspects();

      console.log('\n' + '─'.repeat(60) + '\n');

      // Étape 4: Génération des emails
      console.log('📍 ÉTAPE 4/5: Génération des emails personnalisés...\n');
      await this.emailGenerator.generateAllEmails();

      console.log('\n' + '─'.repeat(60) + '\n');

      // Étape 5: Statistiques finales
      console.log('📍 ÉTAPE 5/5: Récapitulatif\n');
      const stats = await this.db.getStats();

      // Compter les prospects avec email
      const prospectsWithEmail = await this.countProspectsWithEmail();

      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    📊 STATISTIQUES                         ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║  Total prospects trouvés:        ${String(stats.total_prospects).padEnd(23)}║`);
      console.log(`║  Prospects avec email:           ${String(prospectsWithEmail).padEnd(23)}║`);
      console.log(`║  Prospects analysés:             ${String(stats.analyzed).padEnd(23)}║`);
      console.log(`║  Emails générés:                 ${String(stats.analyzed).padEnd(23)}║`);
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      console.log('✅ Pipeline terminé avec succès!\n');
      console.log('📌 Prochaines étapes:');
      console.log('   1. Vérifiez vos prospects: npm run dashboard');
      console.log('   2. Configurez votre email SMTP dans .env');
      console.log('   3. Envoyez les emails: npm run send-emails\n');

    } catch (error) {
      console.error('❌ Erreur dans le pipeline:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Compte le nombre de prospects avec email
   */
  private async countProspectsWithEmail(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db['db'].get(
        'SELECT COUNT(*) as count FROM prospects WHERE email IS NOT NULL AND email != ""',
        (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
  }

  /**
   * Lance uniquement le dashboard
   */
  async runDashboard(): Promise<void> {
    console.log('🚀 Lancement du dashboard...\n');
    await this.dashboard.start();
  }

  /**
   * Affiche les statistiques en console
   */
  async showStats(): Promise<void> {
    const stats = await this.db.getStats();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              📊 STATISTIQUES DE PROSPECTION                ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total prospects:                ${String(stats.total_prospects).padEnd(23)}║`);
    console.log(`║  Nouveaux:                       ${String(stats.new_prospects).padEnd(23)}║`);
    console.log(`║  Analysés:                       ${String(stats.analyzed).padEnd(23)}║`);
    console.log(`║  Contactés:                      ${String(stats.contacted).padEnd(23)}║`);
    console.log(`║  Réponses:                       ${String(stats.replied).padEnd(23)}║`);
    console.log(`║  Convertis:                      ${String(stats.converted).padEnd(23)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');

    const conversionRate = stats.contacted > 0
      ? ((stats.converted / stats.contacted) * 100).toFixed(1)
      : '0.0';
    const replyRate = stats.contacted > 0
      ? ((stats.replied / stats.contacted) * 100).toFixed(1)
      : '0.0';

    console.log(`║  Taux de réponse:                ${replyRate}%${' '.repeat(21 - replyRate.length)}║`);
    console.log(`║  Taux de conversion:             ${conversionRate}%${' '.repeat(21 - conversionRate.length)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    this.cleanup();
  }

  /**
   * Affiche le menu interactif
   */
  showMenu(): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     🎯 SYSTÈME DE PROSPECTION AUTOMATIQUE                 ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Commandes disponibles:                                   ║');
    console.log('║                                                            ║');
    console.log('║  npm run scrape          → Scraper des prospects          ║');
    console.log('║  npm run find-emails     → Trouver les emails             ║');
    console.log('║  npm run analyze         → Analyser les sites web         ║');
    console.log('║  npm run generate-emails → Générer les emails             ║');
    console.log('║  npm run send-emails     → Envoyer les emails             ║');
    console.log('║  npm run dashboard       → Lancer le dashboard            ║');
    console.log('║  npm start               → Pipeline complet               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  }

  private async cleanup(): Promise<void> {
    await this.scraper.close();
    await this.emailFinder.close();
    await this.analyzer.close();
    this.emailGenerator.close();
    this.emailSender.close();
    this.db.close();
  }
}

// Point d'entrée principal
if (require.main === module) {
  const system = new ProspectingSystem();
  const command = process.argv[2];

  switch (command) {
    case 'pipeline':
      system.runFullPipeline()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error('❌ Erreur:', error);
          process.exit(1);
        });
      break;

    case 'dashboard':
      system.runDashboard();
      break;

    case 'stats':
      system.showStats()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error('❌ Erreur:', error);
          process.exit(1);
        });
      break;

    default:
      system.showMenu();
      process.exit(0);
  }
}

export default ProspectingSystem;
