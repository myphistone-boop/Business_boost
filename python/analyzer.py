"""
Module d'analyse de sites web
Analyse performance, SEO, mobile-friendly, etc.
"""
import requests
from bs4 import BeautifulSoup
import time
from typing import Dict, List
import json

from database import Database, WebsiteAnalysis


class WebsiteAnalyzer:
    """Analyse les sites web des prospects"""

    def __init__(self):
        self.db = Database()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def analyze_website(self, url: str) -> Dict:
        """
        Analyse complète d'un site web

        Returns:
            Dict avec les résultats d'analyse
        """
        result = {
            'has_website': False,
            'performance_score': 0,
            'seo_score': 0,
            'mobile_friendly': False,
            'https_enabled': False,
            'load_time': 0,
            'issues': [],
            'opportunities': []
        }

        try:
            # Mesurer le temps de chargement
            start_time = time.time()
            response = self.session.get(url, timeout=10)
            load_time = (time.time() - start_time) * 1000  # ms

            result['has_website'] = True
            result['load_time'] = load_time
            result['https_enabled'] = url.startswith('https://')

            # Parser le HTML
            soup = BeautifulSoup(response.content, 'html.parser')

            # Vérifications SEO basiques
            has_title = soup.find('title') is not None
            has_meta_description = soup.find('meta', attrs={'name': 'description'}) is not None
            has_h1 = soup.find('h1') is not None
            images_without_alt = len(soup.find_all('img', alt=False))

            # Calculer le score SEO
            seo_score = 0
            if has_title:
                seo_score += 25
            if has_meta_description:
                seo_score += 25
            if has_h1:
                seo_score += 20
            if result['https_enabled']:
                seo_score += 15
            if images_without_alt == 0:
                seo_score += 15

            result['seo_score'] = seo_score

            # Vérification mobile-friendly (viewport)
            has_viewport = soup.find('meta', attrs={'name': 'viewport'}) is not None
            result['mobile_friendly'] = has_viewport

            # Identifier les problèmes
            if not has_title:
                result['issues'].append('Pas de balise <title>')
            if not has_meta_description:
                result['issues'].append('Pas de meta description')
            if not has_h1:
                result['issues'].append('Pas de balise <h1>')
            if not result['https_enabled']:
                result['issues'].append('Pas de HTTPS (non sécurisé)')
            if not has_viewport:
                result['issues'].append('Pas responsive/mobile-friendly')
            if load_time > 3000:
                result['issues'].append(f'Temps de chargement lent ({int(load_time)}ms)')
            if images_without_alt > 0:
                result['issues'].append(f'{images_without_alt} images sans attribut alt')

            # Vérifier si le design est obsolète
            html_text = response.text.lower()
            has_modern_framework = any(fw in html_text for fw in
                                       ['react', 'vue', 'angular', 'bootstrap', 'tailwind'])

            if not has_modern_framework:
                result['issues'].append('Design potentiellement obsolète')

            # Score de performance
            perf_score = 100
            if load_time > 1000:
                perf_score -= 20
            if load_time > 3000:
                perf_score -= 30
            if load_time > 5000:
                perf_score -= 30

            result['performance_score'] = max(0, perf_score)

            # Opportunités
            if result['performance_score'] < 70:
                result['opportunities'].append('Optimiser la vitesse de chargement')
            if result['seo_score'] < 70:
                result['opportunities'].append('Améliorer le référencement SEO')
            if not result['mobile_friendly']:
                result['opportunities'].append('Rendre le site responsive')
            if not result['https_enabled']:
                result['opportunities'].append('Migrer vers HTTPS')
            if not has_modern_framework:
                result['opportunities'].append('Moderniser le design')

            print(f"✅ Analysis complete for {url}")
            print(f"   Performance: {result['performance_score']}/100")
            print(f"   SEO: {result['seo_score']}/100")
            print(f"   Issues found: {len(result['issues'])}")

        except Exception as e:
            print(f"❌ Cannot access {url}: {e}")
            result['has_website'] = False
            result['issues'].append('Site web inaccessible ou inexistant')
            result['opportunities'].append('Créer un site web professionnel')

        return result

    def analyze_all_prospects(self):
        """Analyse tous les prospects"""
        prospects = self.db.get_prospects('new')

        print(f"📊 Analyzing {len(prospects)} prospects...\n")

        analyzed = 0

        for prospect in prospects:
            prospect_id = prospect['id']
            website = prospect.get('website')

            print(f"\n🔍 Analyzing: {prospect['company_name']}")

            if website:
                print(f"   Website: {website}")

                analysis_result = self.analyze_website(website)

                # Sauvegarder l'analyse
                analysis = WebsiteAnalysis(
                    prospect_id=prospect_id,
                    has_website=analysis_result['has_website'],
                    performance_score=analysis_result['performance_score'],
                    seo_score=analysis_result['seo_score'],
                    mobile_friendly=analysis_result['mobile_friendly'],
                    https_enabled=analysis_result['https_enabled'],
                    load_time=analysis_result['load_time'],
                    issues_found=json.dumps(analysis_result['issues']),
                    opportunities=json.dumps(analysis_result['opportunities'])
                )

                self.db.add_website_analysis(analysis)
                self.db.update_prospect_status(prospect_id, 'analyzed')

                analyzed += 1

                # Pause
                time.sleep(2)

            else:
                print(f"   NO WEBSITE")

                # Prospect sans site web
                analysis = WebsiteAnalysis(
                    prospect_id=prospect_id,
                    has_website=False,
                    issues_found=json.dumps(['Aucun site web']),
                    opportunities=json.dumps(['Créer un site web professionnel'])
                )

                self.db.add_website_analysis(analysis)
                self.db.update_prospect_status(prospect_id, 'analyzed')

                analyzed += 1

        print(f"\n✅ Analysis complete! {analyzed} prospects analyzed")

    def close(self):
        """Ferme les ressources"""
        self.db.close()


if __name__ == '__main__':
    analyzer = WebsiteAnalyzer()
    try:
        analyzer.analyze_all_prospects()
    except KeyboardInterrupt:
        print('\n\n⚠️  Analysis interrupted by user')
    except Exception as e:
        print(f'\n\n❌ Error during analysis: {e}')
        import traceback
        traceback.print_exc()
    finally:
        analyzer.close()
        print('✅ Analysis completed')
