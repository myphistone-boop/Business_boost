"""
Module de scraping de prospects depuis PagesJaunes
"""
import requests
from bs4 import BeautifulSoup
import time
from typing import List
import os
from dotenv import load_dotenv

from database import Database, Prospect

load_dotenv()


class ProspectScraper:
    """Scraper pour trouver des prospects sur PagesJaunes"""

    def __init__(self):
        self.db = Database()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def scrape_pages_jaunes(self, sector: str, location: str, max_results: int = 20) -> List[Prospect]:
        """
        Scrape PagesJaunes pour un secteur et une localisation donnés

        Args:
            sector: Secteur d'activité (ex: "restaurant", "coiffeur")
            location: Localisation (ex: "Paris", "Lyon")
            max_results: Nombre maximum de résultats

        Returns:
            Liste des prospects trouvés
        """
        prospects = []

        try:
            url = f"https://www.pagesjaunes.fr/annuaire/chercherlespros?quoi={sector}&ou={location}"

            print(f"🔍 Searching PagesJaunes: {sector} in {location}")
            print(f"   URL: {url}")

            response = self.session.get(url, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Trouver les résultats
            results = soup.find_all('div', class_='bi-bloc')[:max_results]

            if not results:
                print(f"  ⚠️  No results found. Page structure may have changed.")
                return prospects

            for idx, result in enumerate(results):
                try:
                    # Extraire le nom
                    name_elem = result.find('a', class_='denomination-links')
                    if not name_elem:
                        name_elem = result.find('h2')

                    company_name = name_elem.text.strip() if name_elem else None

                    if not company_name:
                        continue

                    # Extraire le site web
                    website_elem = result.find('a', {'title': 'Voir le site'})
                    website = website_elem.get('href') if website_elem else None

                    # Extraire le téléphone
                    phone_elem = result.find('span', class_='number')
                    phone = phone_elem.text.strip() if phone_elem else None

                    # Extraire l'adresse
                    address_elem = result.find('span', class_='adresse')
                    address = address_elem.text.strip() if address_elem else location

                    prospect = Prospect(
                        company_name=company_name,
                        website=website,
                        phone=phone,
                        sector=sector,
                        location=address,
                        status='new'
                    )

                    prospects.append(prospect)

                    # Sauvegarder dans la DB
                    self.db.add_prospect(prospect)

                    status = "✅" if website else "❌"
                    print(f"  {idx + 1}. {status} {company_name}")
                    if website:
                        print(f"      🌐 {website}")

                except Exception as e:
                    print(f"  ⚠️  Error processing result {idx}: {e}")
                    continue

            print(f"✅ Found {len(prospects)} businesses on PagesJaunes\n")

        except requests.RequestException as e:
            print(f"❌ Error scraping PagesJaunes: {e}")

        return prospects

    def find_businesses_without_website(self, sector: str, location: str) -> List[Prospect]:
        """Trouve spécifiquement les entreprises SANS site web"""
        print(f"🎯 Searching businesses without website: {sector} in {location}")

        prospects = self.scrape_pages_jaunes(sector, location, 30)
        without_website = [p for p in prospects if not p.website]

        print(f"🎯 Found {len(without_website)} businesses without website")

        return without_website

    def run_full_scraping(self):
        """Lance un scraping complet basé sur la configuration"""
        sectors = os.getenv('TARGET_SECTORS', 'restaurant,coiffeur,plombier').split(',')
        location = os.getenv('SEARCH_LOCATION', 'Paris')
        max_per_sector = 10

        print('🚀 Starting full scraping campaign...\n')

        total_found = 0

        for sector in sectors:
            sector = sector.strip()
            print(f"\n📁 Sector: {sector}")
            print("=" * 60)

            prospects = self.scrape_pages_jaunes(sector, location, max_per_sector)
            total_found += len(prospects)

            # Pause entre les secteurs
            time.sleep(2)

        stats = self.db.get_stats()
        print('\n' + '=' * 60)
        print('📊 Scraping Complete!')
        print('=' * 60)
        print(f'   Total prospects: {stats["total_prospects"]}')
        print(f'   New prospects: {stats["new_prospects"]}')
        print('=' * 60 + '\n')

    def close(self):
        """Ferme les ressources"""
        self.db.close()


if __name__ == '__main__':
    scraper = ProspectScraper()
    try:
        scraper.run_full_scraping()
    except KeyboardInterrupt:
        print('\n\n⚠️  Scraping interrupted by user')
    except Exception as e:
        print(f'\n\n❌ Error during scraping: {e}')
        import traceback
        traceback.print_exc()
    finally:
        scraper.close()
        print('✅ Scraping completed')
