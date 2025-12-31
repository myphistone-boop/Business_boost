"""
Module de recherche automatique d'emails
Scrape les sites web et génère des emails probables
"""
import requests
from bs4 import BeautifulSoup
import re
from typing import List, Set
from urllib.parse import urlparse, urljoin
import dns.resolver
import time

from database import Database


class EmailFinder:
    """Trouve automatiquement les emails des prospects"""

    def __init__(self):
        self.db = Database()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

        # Regex pour détecter les emails
        self.email_regex = re.compile(r'([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)')

        # Emails à ignorer
        self.blacklist = [
            'example@', 'test@', 'noreply@', 'no-reply@', 'mailer@',
            'postmaster@', 'webmaster@', 'admin@', 'administrator@',
            '@example.com', '@test.com', '@domain.com', '@yoursite.com',
            'sentry.io', 'google.com', 'facebook.com', 'twitter.com',
            'instagram.com', 'linkedin.com'
        ]

    def is_valid_email(self, email: str) -> bool:
        """Vérifie si un email est valide et non blacklisté"""
        email = email.lower()

        # Vérifier la blacklist
        for blocked in self.blacklist:
            if blocked in email:
                return False

        # Vérifier le format
        valid_format = re.match(r'^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$', email)
        return bool(valid_format)

    def extract_emails_from_html(self, html: str, domain: str) -> List[str]:
        """Extrait les emails d'un HTML"""
        emails: Set[str] = set()
        matches = self.email_regex.findall(html)

        if matches:
            for email in matches:
                clean_email = email.lower().strip()

                if self.is_valid_email(clean_email):
                    # Priorité aux emails du même domaine
                    if domain in clean_email:
                        emails.add(clean_email)
                    else:
                        emails.add(clean_email)

        # Trier : emails du domaine en premier
        sorted_emails = sorted(emails, key=lambda e: (domain not in e, e))
        return sorted_emails

    def scrape_emails_from_website(self, url: str) -> List[str]:
        """
        Scrape les emails depuis un site web

        Args:
            url: URL du site à scraper

        Returns:
            Liste d'emails trouvés
        """
        emails: Set[str] = set()

        try:
            parsed_url = urlparse(url)
            domain = parsed_url.hostname.replace('www.', '') if parsed_url.hostname else ''

            print(f"🔍 Searching emails on {url}")

            # Étape 1: Page d'accueil
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Extraire emails de la page d'accueil
            home_emails = self.extract_emails_from_html(response.text, domain)
            emails.update(home_emails)

            # Étape 2: Chercher des liens vers pages de contact
            contact_links = []

            for link in soup.find_all('a', href=True):
                href = link.get('href', '')
                text = link.text.lower()

                if any(keyword in text or keyword in href.lower() for keyword in
                       ['contact', 'nous contacter', 'mentions', 'legal', 'about']):
                    full_url = urljoin(url, href)
                    if full_url.startswith('http'):
                        contact_links.append(full_url)

            # Limiter à 5 pages
            contact_links = list(set(contact_links))[:5]

            # Étape 3: Scraper les pages de contact
            for link in contact_links:
                try:
                    print(f"  → Checking {link}")
                    contact_response = self.session.get(link, timeout=8)
                    contact_emails = self.extract_emails_from_html(contact_response.text, domain)
                    emails.update(contact_emails)

                    time.sleep(0.5)  # Pause
                except:
                    pass

            found_emails = list(emails)

            if found_emails:
                print(f"  ✅ Found {len(found_emails)} email(s): {found_emails[0]}")
            else:
                print(f"  ❌ No email found")

            return found_emails

        except Exception as e:
            print(f"  ❌ Error scraping {url}: {e}")
            return []

    def generate_probable_emails(self, domain: str, company_name: str = None) -> List[str]:
        """Génère des emails probables pour un domaine"""
        emails = []

        # Nettoyer le domaine
        clean_domain = domain.replace('www.', '').lower()

        # Templates standards
        templates = [
            'contact',
            'info',
            'commercial',
            'hello',
            'bonjour',
            'accueil',
            'reception'
        ]

        for template in templates:
            emails.append(f"{template}@{clean_domain}")

        # Si on a le nom de l'entreprise
        if company_name:
            simple_name = re.sub(r'[^a-z0-9]', '', company_name.lower())[:15]
            if simple_name:
                emails.append(f"{simple_name}@{clean_domain}")
                emails.append(f"contact.{simple_name}@{clean_domain}")

        return emails

    def validate_email_domain(self, email: str) -> bool:
        """Valide si un domaine d'email a des serveurs mail (MX records)"""
        try:
            domain = email.split('@')[1]
            mx_records = dns.resolver.resolve(domain, 'MX')
            return len(mx_records) > 0
        except:
            return False

    def find_all_emails(self):
        """Trouve et enrichit les emails pour tous les prospects"""
        prospects = self.db.get_prospects('new')
        prospects_without_email = [p for p in prospects if not p.get('email') and p.get('website')]

        print(f"📧 Finding emails for {len(prospects_without_email)} prospects...\n")

        found = 0
        generated = 0

        for prospect in prospects_without_email:
            prospect_id = prospect['id']
            website = prospect['website']

            print(f"\n🔎 {prospect['company_name']}")
            print(f"   Website: {website}")

            # Étape 1: Scraper le site web
            scraped_emails = self.scrape_emails_from_website(website)

            if scraped_emails:
                email = scraped_emails[0]
                self.db.update_prospect_email(prospect_id, email)
                found += 1
                print(f"   ✅ Email found: {email}")

            else:
                # Étape 2: Générer des emails probables
                try:
                    parsed = urlparse(website)
                    domain = parsed.hostname.replace('www.', '') if parsed.hostname else ''

                    probable_emails = self.generate_probable_emails(domain, prospect['company_name'])

                    # Valider le domaine
                    if probable_emails and self.validate_email_domain(probable_emails[0]):
                        email = probable_emails[0]
                        self.db.update_prospect_email(prospect_id, email)
                        generated += 1
                        print(f"   🔮 Email generated: {email} (probable)")
                    else:
                        print(f"   ⚠️  No valid email server for domain")

                except:
                    print(f"   ❌ Could not generate email")

            # Pause
            time.sleep(2)

        print('\n' + '=' * 60)
        print('📊 EMAIL FINDING SUMMARY')
        print('=' * 60)
        print(f'✅ Found by scraping:        {found}')
        print(f'🔮 Generated (probable):     {generated}')
        print(f'📧 Total emails added:       {found + generated}')
        print(f'❌ Still without email:      {len(prospects_without_email) - found - generated}')
        print('=' * 60 + '\n')

    def close(self):
        """Ferme les ressources"""
        self.db.close()


if __name__ == '__main__':
    finder = EmailFinder()
    try:
        finder.find_all_emails()
    except KeyboardInterrupt:
        print('\n\n⚠️  Email finding interrupted by user')
    except Exception as e:
        print(f'\n\n❌ Error during email finding: {e}')
        import traceback
        traceback.print_exc()
    finally:
        finder.close()
        print('✅ Email finding completed')
