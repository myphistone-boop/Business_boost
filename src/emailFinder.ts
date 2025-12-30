import puppeteer, { Browser } from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Database, Prospect } from './database';

export class EmailFinder {
  private db: Database;
  private browser: Browser | null = null;

  // Regex pour détecter les emails
  private emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;

  // Emails à ignorer (génériques, spam, exemples)
  private blacklist = [
    'example@',
    'test@',
    'noreply@',
    'no-reply@',
    'mailer@',
    'postmaster@',
    'webmaster@',
    'admin@',
    'administrator@',
    '@example.com',
    '@test.com',
    '@domain.com',
    '@yoursite.com',
    '@votresite.fr',
    'sentry.io',
    'google.com',
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'linkedin.com'
  ];

  constructor() {
    this.db = new Database();
  }

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('🚀 Email finder browser launched');
  }

  /**
   * Vérifie si un email est valide et non blacklisté
   */
  private isValidEmail(email: string): boolean {
    email = email.toLowerCase();

    // Vérifier la blacklist
    for (const blocked of this.blacklist) {
      if (email.includes(blocked)) {
        return false;
      }
    }

    // Vérifier le format
    const validFormat = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/;
    return validFormat.test(email);
  }

  /**
   * Extrait les emails d'un texte HTML
   */
  private extractEmailsFromHTML(html: string, domain: string): string[] {
    const emails: Set<string> = new Set();
    const matches = html.match(this.emailRegex);

    if (matches) {
      for (const email of matches) {
        const cleanEmail = email.toLowerCase().trim();

        if (this.isValidEmail(cleanEmail)) {
          // Priorité aux emails du même domaine que le site
          if (cleanEmail.includes(domain)) {
            emails.add(cleanEmail);
          } else {
            emails.add(cleanEmail);
          }
        }
      }
    }

    return Array.from(emails);
  }

  /**
   * Scrape les emails depuis un site web
   */
  async scrapeEmailsFromWebsite(url: string): Promise<string[]> {
    const emails: Set<string> = new Set();

    try {
      // Extraire le domaine
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');

      console.log(`🔍 Searching emails on ${url}`);

      // Étape 1 : Récupérer la page d'accueil
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // Extraire les emails de la page d'accueil
      const homeEmails = this.extractEmailsFromHTML(response.data, domain);
      homeEmails.forEach(e => emails.add(e));

      // Étape 2 : Chercher des liens vers pages de contact
      const contactLinks: string[] = [];

      $('a').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().toLowerCase();

        if (href && (
          text.includes('contact') ||
          text.includes('nous contacter') ||
          href.includes('contact') ||
          href.includes('mentions') ||
          href.includes('legal')
        )) {
          // Construire l'URL complète
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = `${urlObj.protocol}//${urlObj.host}${href}`;
          } else if (!href.startsWith('http')) {
            fullUrl = `${urlObj.protocol}//${urlObj.host}/${href}`;
          }

          contactLinks.push(fullUrl);
        }
      });

      // Limiter à 5 pages maximum
      const uniqueLinks = [...new Set(contactLinks)].slice(0, 5);

      // Étape 3 : Scraper les pages de contact
      for (const link of uniqueLinks) {
        try {
          console.log(`  → Checking ${link}`);
          const contactResponse = await axios.get(link, {
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          const contactEmails = this.extractEmailsFromHTML(contactResponse.data, domain);
          contactEmails.forEach(e => emails.add(e));

          // Pause pour ne pas surcharger
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          // Ignorer les erreurs de pages individuelles
        }
      }

      const foundEmails = Array.from(emails);

      // Trier : emails du domaine en premier
      foundEmails.sort((a, b) => {
        const aDomain = a.includes(domain);
        const bDomain = b.includes(domain);
        if (aDomain && !bDomain) return -1;
        if (!aDomain && bDomain) return 1;
        return 0;
      });

      if (foundEmails.length > 0) {
        console.log(`  ✅ Found ${foundEmails.length} email(s): ${foundEmails[0]}`);
      } else {
        console.log(`  ❌ No email found`);
      }

      return foundEmails;

    } catch (error: any) {
      console.log(`  ❌ Error scraping ${url}: ${error.message}`);
      return [];
    }
  }

  /**
   * Génère des emails probables pour un domaine
   */
  generateProbableEmails(domain: string, companyName?: string): string[] {
    const emails: string[] = [];

    // Nettoyer le domaine
    const cleanDomain = domain.replace('www.', '').toLowerCase();

    // Templates standards
    const templates = [
      'contact',
      'info',
      'commercial',
      'hello',
      'bonjour',
      'accueil',
      'reception'
    ];

    templates.forEach(template => {
      emails.push(`${template}@${cleanDomain}`);
    });

    // Si on a le nom de l'entreprise, créer des variantes
    if (companyName) {
      const simpleName = companyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15);

      if (simpleName) {
        emails.push(`${simpleName}@${cleanDomain}`);
        emails.push(`contact.${simpleName}@${cleanDomain}`);
      }
    }

    return emails;
  }

  /**
   * Valide si un email existe (vérification MX basique)
   */
  async validateEmail(email: string): Promise<boolean> {
    try {
      const domain = email.split('@')[1];

      // Vérifier si le domaine a des enregistrements MX (serveurs mail)
      const dns = require('dns').promises;
      const mxRecords = await dns.resolveMx(domain);

      return mxRecords && mxRecords.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Trouve et enrichit les emails pour tous les prospects
   */
  async findAllEmails(): Promise<void> {
    const prospects = await this.db.getProspects('new');
    const prospectsWithoutEmail = prospects.filter(p => !p.email && p.website);

    console.log(`📧 Finding emails for ${prospectsWithoutEmail.length} prospects...\n`);

    let found = 0;
    let generated = 0;

    for (const prospect of prospectsWithoutEmail) {
      if (!prospect.id || !prospect.website) continue;

      console.log(`\n🔎 ${prospect.company_name}`);
      console.log(`   Website: ${prospect.website}`);

      // Étape 1 : Scraper le site web
      const scrapedEmails = await this.scrapeEmailsFromWebsite(prospect.website);

      if (scrapedEmails.length > 0) {
        // Email trouvé par scraping !
        const email = scrapedEmails[0]; // Prendre le premier (le plus pertinent)

        await this.updateProspectEmail(prospect.id, email, 'scraped');
        found++;

        console.log(`   ✅ Email found: ${email}`);
      } else {
        // Étape 2 : Générer des emails probables
        try {
          const urlObj = new URL(prospect.website);
          const domain = urlObj.hostname.replace('www.', '');

          const probableEmails = this.generateProbableEmails(domain, prospect.company_name);

          // Valider le domaine (vérifier que le domaine a bien un serveur mail)
          const domainValid = await this.validateEmail(probableEmails[0]);

          if (domainValid && probableEmails.length > 0) {
            const email = probableEmails[0]; // contact@domaine.fr

            await this.updateProspectEmail(prospect.id, email, 'generated');
            generated++;

            console.log(`   🔮 Email generated: ${email} (probable)`);
          } else {
            console.log(`   ⚠️  No valid email server for domain`);
          }
        } catch (err) {
          console.log(`   ❌ Could not generate email`);
        }
      }

      // Pause entre les prospects
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 EMAIL FINDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Found by scraping:        ${found}`);
    console.log(`🔮 Generated (probable):     ${generated}`);
    console.log(`📧 Total emails added:       ${found + generated}`);
    console.log(`❌ Still without email:      ${prospectsWithoutEmail.length - found - generated}`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Met à jour l'email d'un prospect dans la base
   */
  private async updateProspectEmail(prospectId: number, email: string, source: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db['db'].run(
        'UPDATE prospects SET email = ? WHERE id = ?',
        [email, prospectId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    this.db.close();
  }
}

// Exécution directe du script
if (require.main === module) {
  const finder = new EmailFinder();

  finder.findAllEmails()
    .then(async () => {
      await finder.close();
      console.log('✅ Email finding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error finding emails:', error);
      process.exit(1);
    });
}
