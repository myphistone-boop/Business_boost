import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { Database, Prospect } from './database';
import * as dotenv from 'dotenv';

dotenv.config();

export class ProspectScraper {
  private db: Database;
  private browser: Browser | null = null;

  constructor() {
    this.db = new Database();
  }

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('🚀 Browser launched');
  }

  /**
   * Scrape Google Maps pour trouver des entreprises locales
   */
  async scrapeGoogleMaps(sector: string, location: string, maxResults: number = 20): Promise<Prospect[]> {
    if (!this.browser) await this.init();

    const page = await this.browser!.newPage();
    const prospects: Prospect[] = [];

    try {
      const searchQuery = `${sector} ${location}`;
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

      console.log(`🔍 Searching: ${searchQuery}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Scroll pour charger plus de résultats
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          const scrollable = document.querySelector('[role="feed"]');
          if (scrollable) {
            scrollable.scrollTop = scrollable.scrollHeight;
          }
        });
        await page.waitForTimeout(2000);
      }

      // Extraire les informations des entreprises
      const businesses = await page.evaluate(() => {
        const results: any[] = [];
        const items = document.querySelectorAll('[role="article"]');

        items.forEach((item) => {
          const nameEl = item.querySelector('[class*="fontHeadlineSmall"]');
          const linkEl = item.querySelector('a[href*="https://"]');

          if (nameEl) {
            results.push({
              name: nameEl.textContent?.trim(),
              link: linkEl?.getAttribute('href')
            });
          }
        });

        return results;
      });

      console.log(`✅ Found ${businesses.length} businesses on Google Maps`);

      // Cliquer sur chaque entreprise pour obtenir plus de détails
      for (let i = 0; i < Math.min(businesses.length, maxResults); i++) {
        try {
          const business = businesses[i];

          // Rechercher le site web et autres infos
          const websiteSelector = 'a[data-item-id*="authority"]';
          const phoneSelector = 'button[data-item-id*="phone"]';

          await page.waitForTimeout(1000);

          let website = '';
          let phone = '';

          try {
            website = await page.$eval(websiteSelector, el => el.getAttribute('href') || '');
          } catch (e) {}

          try {
            phone = await page.$eval(phoneSelector, el => el.textContent?.trim() || '');
          } catch (e) {}

          const prospect: Prospect = {
            company_name: business.name,
            website: website || undefined,
            phone: phone || undefined,
            sector: sector,
            location: location,
            found_date: new Date().toISOString(),
            status: 'new'
          };

          prospects.push(prospect);

          // Sauvegarder dans la base de données
          await this.db.addProspect(prospect);

          console.log(`  📋 ${i + 1}. ${business.name} - ${website || 'No website'}`);
        } catch (err) {
          console.error(`Error processing business ${i}:`, err);
        }
      }

      await page.close();
    } catch (error) {
      console.error('Error scraping Google Maps:', error);
      await page.close();
    }

    return prospects;
  }

  /**
   * Scrape PagesJaunes pour trouver des entreprises
   */
  async scrapePagesJaunes(sector: string, location: string, maxResults: number = 20): Promise<Prospect[]> {
    const prospects: Prospect[] = [];

    try {
      const searchUrl = `https://www.pagesjaunes.fr/annuaire/chercherlespros?quoi=${encodeURIComponent(sector)}&ou=${encodeURIComponent(location)}`;

      console.log(`🔍 Searching PagesJaunes: ${sector} in ${location}`);

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      $('.bi-list li').each((index, element) => {
        if (index >= maxResults) return;

        const $el = $(element);
        const name = $el.find('.bi-denomination').text().trim();
        const website = $el.find('a[title="Voir le site"]').attr('href');
        const phone = $el.find('.number-contact').text().trim();
        const address = $el.find('.bi-address').text().trim();

        if (name) {
          const prospect: Prospect = {
            company_name: name,
            website: website || undefined,
            phone: phone || undefined,
            sector: sector,
            location: address || location,
            found_date: new Date().toISOString(),
            status: 'new'
          };

          prospects.push(prospect);
          this.db.addProspect(prospect);

          console.log(`  📋 ${index + 1}. ${name} - ${website || 'No website'}`);
        }
      });

      console.log(`✅ Found ${prospects.length} businesses on PagesJaunes`);
    } catch (error) {
      console.error('Error scraping PagesJaunes:', error);
    }

    return prospects;
  }

  /**
   * Recherche avancée : trouve des entreprises SANS site web ou avec un site obsolète
   */
  async findBusinessesWithoutWebsite(sector: string, location: string): Promise<Prospect[]> {
    console.log(`🎯 Searching businesses without website: ${sector} in ${location}`);

    // Combiner plusieurs sources
    const prospects = await this.scrapePagesJaunes(sector, location, 30);

    // Filtrer ceux sans site web
    const withoutWebsite = prospects.filter(p => !p.website);

    console.log(`🎯 Found ${withoutWebsite.length} businesses without website`);

    return withoutWebsite;
  }

  /**
   * Lance un scraping complet basé sur la configuration
   */
  async runFullScraping(): Promise<void> {
    const sectors = process.env.TARGET_SECTORS?.split(',') || ['restaurant', 'coiffeur', 'plombier'];
    const location = process.env.SEARCH_LOCATION || 'Paris';
    const maxPerSector = 10;

    console.log('🚀 Starting full scraping campaign...\n');

    for (const sector of sectors) {
      console.log(`\n📁 Sector: ${sector.trim()}`);
      await this.scrapePagesJaunes(sector.trim(), location, maxPerSector);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Pause entre les recherches
    }

    const stats = await this.db.getStats();
    console.log('\n📊 Scraping Complete!');
    console.log(`   Total prospects: ${stats.total_prospects}`);
    console.log(`   New prospects: ${stats.new_prospects}`);
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
  const scraper = new ProspectScraper();

  scraper.runFullScraping()
    .then(() => {
      console.log('✅ Scraping completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error during scraping:', error);
      process.exit(1);
    });
}
