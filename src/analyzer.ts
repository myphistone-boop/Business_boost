import puppeteer, { Browser } from 'puppeteer';
import lighthouse from 'lighthouse';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Database, Prospect, WebsiteAnalysis } from './database';

export interface AnalysisResult {
  has_website: boolean;
  performance_score: number;
  seo_score: number;
  mobile_friendly: boolean;
  https_enabled: boolean;
  load_time: number;
  issues: string[];
  opportunities: string[];
}

export class WebsiteAnalyzer {
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
    console.log('🚀 Analyzer browser launched');
  }

  /**
   * Analyse complète d'un site web
   */
  async analyzeWebsite(url: string): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      has_website: false,
      performance_score: 0,
      seo_score: 0,
      mobile_friendly: false,
      https_enabled: false,
      load_time: 0,
      issues: [],
      opportunities: []
    };

    try {
      // Vérifier si l'URL est accessible
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const loadTime = Date.now() - startTime;

      result.has_website = true;
      result.load_time = loadTime;
      result.https_enabled = url.startsWith('https://');

      // Analyser le HTML
      const $ = cheerio.load(response.data);

      // Vérifications SEO basiques
      const hasTitle = $('title').length > 0;
      const hasMetaDescription = $('meta[name="description"]').length > 0;
      const hasH1 = $('h1').length > 0;
      const hasImagesWithoutAlt = $('img:not([alt])').length > 0;

      // Calculer le score SEO basique
      let seoScore = 0;
      if (hasTitle) seoScore += 25;
      if (hasMetaDescription) seoScore += 25;
      if (hasH1) seoScore += 20;
      if (result.https_enabled) seoScore += 15;
      if (!hasImagesWithoutAlt) seoScore += 15;

      result.seo_score = seoScore;

      // Vérification du viewport (mobile-friendly)
      const hasViewport = $('meta[name="viewport"]').length > 0;
      result.mobile_friendly = hasViewport;

      // Identifier les problèmes
      if (!hasTitle) result.issues.push('Pas de balise <title>');
      if (!hasMetaDescription) result.issues.push('Pas de meta description');
      if (!hasH1) result.issues.push('Pas de balise <h1>');
      if (!result.https_enabled) result.issues.push('Pas de HTTPS (non sécurisé)');
      if (!hasViewport) result.issues.push('Pas responsive/mobile-friendly');
      if (loadTime > 3000) result.issues.push(`Temps de chargement lent (${loadTime}ms)`);
      if (hasImagesWithoutAlt) result.issues.push(`${hasImagesWithoutAlt} images sans attribut alt`);

      // Vérifier si le design est obsolète
      const hasModernFramework = response.data.includes('react') ||
                                 response.data.includes('vue') ||
                                 response.data.includes('angular') ||
                                 response.data.includes('bootstrap');

      if (!hasModernFramework) {
        result.issues.push('Design potentiellement obsolète (pas de framework moderne détecté)');
      }

      // Score de performance basique
      let perfScore = 100;
      if (loadTime > 1000) perfScore -= 20;
      if (loadTime > 3000) perfScore -= 30;
      if (loadTime > 5000) perfScore -= 30;

      result.performance_score = Math.max(0, perfScore);

      // Opportunités d'amélioration
      if (result.performance_score < 70) {
        result.opportunities.push('Optimiser la vitesse de chargement');
      }
      if (result.seo_score < 70) {
        result.opportunities.push('Améliorer le référencement SEO');
      }
      if (!result.mobile_friendly) {
        result.opportunities.push('Rendre le site responsive (mobile-friendly)');
      }
      if (!result.https_enabled) {
        result.opportunities.push('Migrer vers HTTPS pour la sécurité');
      }
      if (!hasModernFramework) {
        result.opportunities.push('Moderniser le design et la technologie');
      }

      console.log(`✅ Analysis complete for ${url}`);
      console.log(`   Performance: ${result.performance_score}/100`);
      console.log(`   SEO: ${result.seo_score}/100`);
      console.log(`   Issues found: ${result.issues.length}`);

    } catch (error: any) {
      console.log(`❌ Cannot access ${url}: ${error.message}`);
      result.has_website = false;
      result.issues.push('Site web inaccessible ou inexistant');
      result.opportunities.push('Créer un site web professionnel');
    }

    return result;
  }

  /**
   * Analyse avancée avec Lighthouse (optionnel, plus lent)
   */
  async analyzeLighthouse(url: string): Promise<any> {
    if (!this.browser) await this.init();

    try {
      const { lhr } = await lighthouse(url, {
        port: new URL(this.browser!.wsEndpoint()).port as any,
        output: 'json',
        logLevel: 'error',
      });

      return {
        performance: lhr.categories.performance.score * 100,
        seo: lhr.categories.seo.score * 100,
        accessibility: lhr.categories.accessibility.score * 100,
        bestPractices: lhr.categories['best-practices'].score * 100,
      };
    } catch (error) {
      console.error('Lighthouse analysis failed:', error);
      return null;
    }
  }

  /**
   * Analyser tous les prospects qui ont un site web
   */
  async analyzeAllProspects(): Promise<void> {
    const prospects = await this.db.getProspects('new');

    console.log(`📊 Analyzing ${prospects.length} prospects...\n`);

    let analyzed = 0;

    for (const prospect of prospects) {
      if (prospect.id && prospect.website) {
        console.log(`\n🔍 Analyzing: ${prospect.company_name}`);
        console.log(`   Website: ${prospect.website}`);

        const analysis = await this.analyzeWebsite(prospect.website);

        // Sauvegarder l'analyse
        const websiteAnalysis: WebsiteAnalysis = {
          prospect_id: prospect.id,
          has_website: analysis.has_website,
          performance_score: analysis.performance_score,
          seo_score: analysis.seo_score,
          mobile_friendly: analysis.mobile_friendly,
          https_enabled: analysis.https_enabled,
          load_time: analysis.load_time,
          issues_found: JSON.stringify(analysis.issues),
          opportunities: JSON.stringify(analysis.opportunities),
          analysis_date: new Date().toISOString()
        };

        await this.db.addWebsiteAnalysis(websiteAnalysis);
        await this.db.updateProspectStatus(prospect.id, 'analyzed');

        analyzed++;

        // Pause pour ne pas surcharger les serveurs
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else if (prospect.id && !prospect.website) {
        // Prospect sans site web
        console.log(`\n🔍 ${prospect.company_name}: NO WEBSITE`);

        const websiteAnalysis: WebsiteAnalysis = {
          prospect_id: prospect.id,
          has_website: false,
          issues_found: JSON.stringify(['Aucun site web']),
          opportunities: JSON.stringify(['Créer un site web professionnel pour augmenter la visibilité']),
          analysis_date: new Date().toISOString()
        };

        await this.db.addWebsiteAnalysis(websiteAnalysis);
        await this.db.updateProspectStatus(prospect.id, 'analyzed');

        analyzed++;
      }
    }

    console.log(`\n✅ Analysis complete! ${analyzed} prospects analyzed`);
  }

  /**
   * Obtenir les meilleurs prospects (sites avec le plus de problèmes)
   */
  async getBestProspects(limit: number = 20): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db['db'].all(`
        SELECT
          p.*,
          wa.performance_score,
          wa.seo_score,
          wa.issues_found,
          wa.opportunities
        FROM prospects p
        JOIN website_analysis wa ON p.id = wa.prospect_id
        WHERE p.status = 'analyzed'
          AND (wa.has_website = 0
               OR wa.performance_score < 60
               OR wa.seo_score < 60
               OR wa.mobile_friendly = 0
               OR wa.https_enabled = 0)
        ORDER BY
          CASE WHEN wa.has_website = 0 THEN 1 ELSE 2 END,
          (wa.performance_score + wa.seo_score) ASC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
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
  const analyzer = new WebsiteAnalyzer();

  analyzer.analyzeAllProspects()
    .then(async () => {
      console.log('\n📊 Top prospects to contact:');
      const bestProspects = await analyzer.getBestProspects(10);
      bestProspects.forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.company_name}`);
        console.log(`   Website: ${p.website || 'NONE'}`);
        console.log(`   Performance: ${p.performance_score || 0}/100`);
        console.log(`   SEO: ${p.seo_score || 0}/100`);
      });

      await analyzer.close();
      console.log('\n✅ Analysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error during analysis:', error);
      process.exit(1);
    });
}
