"""
Module de génération d'emails personnalisés
Utilise OpenAI ou des templates prédéfinis
"""
import json
import os
from typing import Dict
from dotenv import load_dotenv

from database import Database, EmailLog

load_dotenv()

# Import OpenAI si disponible
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class EmailGenerator:
    """Génère des emails personnalisés pour les prospects"""

    def __init__(self):
        self.db = Database()
        self.openai_client = None

        # Initialiser OpenAI si disponible et clé configurée
        if OPENAI_AVAILABLE and os.getenv('OPENAI_API_KEY'):
            try:
                self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
                print("✅ OpenAI API initialized")
            except:
                print("⚠️  OpenAI API key invalid, using templates")

    def generate_with_ai(self, prospect: Dict, analysis: Dict) -> Dict[str, str]:
        """Génère un email avec OpenAI"""
        if not self.openai_client:
            return self.generate_template(prospect, analysis)

        try:
            issues = json.loads(analysis.get('issues_found', '[]'))
            opportunities = json.loads(analysis.get('opportunities', '[]'))

            prompt = f"""
Tu es un expert en prospection commerciale pour une agence de création de sites web.

Génère un email de prospection personnalisé et professionnel pour:
- Entreprise: {prospect['company_name']}
- Secteur: {prospect['sector']}
- Site web actuel: {prospect.get('website', 'AUCUN')}

Analyse du site:
- A un site web: {'Oui' if analysis.get('has_website') else 'Non'}
- Score Performance: {analysis.get('performance_score', 'N/A')}/100
- Score SEO: {analysis.get('seo_score', 'N/A')}/100
- Mobile-friendly: {'Oui' if analysis.get('mobile_friendly') else 'Non'}
- HTTPS: {'Oui' if analysis.get('https_enabled') else 'Non'}

Problèmes identifiés: {', '.join(issues) if issues else 'Aucun site web'}

L'email doit:
1. Être court (maximum 150 mots)
2. Être personnalisé et professionnel
3. Mentionner 2-3 problèmes spécifiques
4. Proposer une solution concrète
5. Terminer par un call-to-action clair
6. Créer de la valeur avant de vendre

Retourne UNIQUEMENT un JSON avec:
{{
  "subject": "Sujet accrocheur",
  "body": "Corps de l'email"
}}
"""

            response = self.openai_client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {
                        'role': 'system',
                        'content': 'Tu es un expert en copywriting B2B.'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                temperature=0.7,
                response_format={'type': 'json_object'}
            )

            content = response.choices[0].message.content
            email_data = json.loads(content)

            return {
                'subject': email_data['subject'],
                'body': email_data['body']
            }

        except Exception as e:
            print(f"Error with OpenAI: {e}")
            return self.generate_template(prospect, analysis)

    def generate_template(self, prospect: Dict, analysis: Dict) -> Dict[str, str]:
        """Génère un email basé sur des templates"""
        issues = json.loads(analysis.get('issues_found', '[]'))
        company_name = os.getenv('YOUR_COMPANY_NAME', 'Votre Entreprise')
        your_name = os.getenv('FROM_NAME', 'Votre Nom')
        your_phone = os.getenv('YOUR_PHONE', 'Téléphone')

        if not analysis.get('has_website'):
            # Template pour entreprises SANS site web
            subject = f"{prospect['company_name']} : Votre présence en ligne"

            body = f"""Bonjour,

Je suis tombé sur {prospect['company_name']} et j'ai remarqué que vous n'avez pas encore de site web.

Dans le secteur {prospect['sector']}, 78% des clients recherchent en ligne avant de faire un choix. Vous perdez potentiellement des clients chaque jour.

Nous aidons des entreprises comme la vôtre à :
✓ Être visible sur Google
✓ Attirer de nouveaux clients 24/7
✓ Se démarquer de la concurrence

Nous offrons un premier site web professionnel à partir de 890€, avec :
- Design moderne et responsive
- Optimisation Google (SEO)
- Formation incluse

Seriez-vous disponible pour un échange rapide de 15 minutes cette semaine ?

Cordialement,
{your_name}
{company_name}
{your_phone}"""

        elif analysis.get('performance_score', 100) < 60 or analysis.get('seo_score', 100) < 60:
            # Template pour sites avec problèmes
            subject = f"{prospect['company_name']} : Améliorer votre site web"

            main_issues = '\n'.join([f'• {issue}' for issue in issues[:3]])

            body = f"""Bonjour,

J'ai analysé le site de {prospect['company_name']} et j'ai identifié quelques opportunités d'amélioration :

{main_issues}

Ces problèmes peuvent vous faire perdre des clients potentiels et nuire à votre référencement Google.

Nous avons aidé de nombreuses entreprises à :
✓ Augmenter leur trafic de +150%
✓ Améliorer leur conversion visiteur → client
✓ Apparaître en première page Google

Seriez-vous intéressé par un audit gratuit complet de votre site ?

Je peux vous proposer un appel de 15 minutes pour discuter des quick-wins possibles.

Cordialement,
{your_name}
{company_name}
{your_phone}"""

        else:
            # Template générique
            subject = f"Optimisation web pour {prospect['company_name']}"

            body = f"""Bonjour,

Je me permets de vous contacter car je travaille avec des entreprises dans le secteur {prospect['sector']} pour optimiser leur présence en ligne.

J'ai remarqué quelques opportunités d'amélioration sur votre site web qui pourraient vous apporter plus de clients.

Seriez-vous disponible pour un échange rapide de 15 minutes ?

Cordialement,
{your_name}
{company_name}"""

        return {'subject': subject, 'body': body}

    def generate_all_emails(self):
        """Génère des emails pour tous les prospects analysés"""
        prospects = self.db.get_prospects('analyzed')

        print(f"📧 Generating emails for {len(prospects)} prospects...\n")

        for prospect in prospects:
            prospect_id = prospect['id']
            analysis = self.db.get_analysis(prospect_id)

            if not analysis:
                continue

            print(f"\n✍️  Generating email for: {prospect['company_name']}")

            if self.openai_client:
                email_content = self.generate_with_ai(prospect, analysis)
                print('   ✨ Generated with AI')
            else:
                email_content = self.generate_template(prospect, analysis)
                print('   📝 Generated with template')

            print(f"   Subject: {email_content['subject']}")

            # Sauvegarder l'email
            email_log = EmailLog(
                prospect_id=prospect_id,
                subject=email_content['subject'],
                body=email_content['body']
            )

            self.db.add_email_log(email_log)

            # Pause si on utilise l'API
            if self.openai_client:
                import time
                time.sleep(1)

        print('\n✅ Email generation complete!')

    def close(self):
        """Ferme les ressources"""
        self.db.close()


if __name__ == '__main__':
    generator = EmailGenerator()
    try:
        generator.generate_all_emails()
    except KeyboardInterrupt:
        print('\n\n⚠️  Email generation interrupted by user')
    except Exception as e:
        print(f'\n\n❌ Error generating emails: {e}')
        import traceback
        traceback.print_exc()
    finally:
        generator.close()
        print('✅ Email generation completed')
