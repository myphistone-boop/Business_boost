"""
Module d'envoi d'emails automatique
Utilise SMTP pour envoyer les emails
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import time

from database import Database

load_dotenv()


class EmailSender:
    """Gère l'envoi automatique d'emails"""

    def __init__(self):
        self.db = Database()

        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('SMTP_USER', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', '')
        self.from_name = os.getenv('FROM_NAME', '')

        if not self.smtp_user or not self.smtp_password:
            print('⚠️  Email credentials not configured')
            print('   Add SMTP_USER and SMTP_PASSWORD to .env file')

    def test_connection(self) -> bool:
        """Teste la connexion SMTP"""
        if not self.smtp_user or not self.smtp_password:
            print('❌ Email not configured')
            return False

        try:
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.quit()

            print('✅ SMTP connection successful')
            return True

        except Exception as e:
            print(f'❌ SMTP connection failed: {e}')
            return False

    def send_email(self, to: str, subject: str, body: str) -> bool:
        """
        Envoie un email

        Args:
            to: Destinataire
            subject: Sujet
            body: Corps de l'email

        Returns:
            True si l'envoi réussit
        """
        if not self.smtp_user or not self.smtp_password:
            print('❌ Cannot send email: SMTP not configured')
            return False

        try:
            # Créer le message
            msg = MIMEMultipart('alternative')
            msg['From'] = f'"{self.from_name}" <{self.from_email}>'
            msg['To'] = to
            msg['Subject'] = subject

            # Ajouter le corps (texte et HTML)
            text_part = MIMEText(body, 'plain')
            html_part = MIMEText(body.replace('\n', '<br>'), 'html')

            msg.attach(text_part)
            msg.attach(html_part)

            # Envoyer
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
            server.quit()

            print(f'✅ Email sent to {to}')
            return True

        except Exception as e:
            print(f'❌ Failed to send email to {to}: {e}')
            return False

    def send_test_email(self, test_email: str):
        """Envoie un email de test"""
        print(f'📧 Sending test email to {test_email}...\n')

        subject = 'Test - Système de prospection automatique'
        body = f"""Bonjour,

Ceci est un email de test de votre système de prospection automatique.

Si vous recevez cet email, votre configuration SMTP est correcte ! ✅

Vous pouvez maintenant :
1. Scraper des prospects (python scraper.py)
2. Trouver leurs emails (python email_finder.py)
3. Analyser leurs sites web (python analyzer.py)
4. Générer des emails personnalisés (python email_generator.py)
5. Envoyer les emails (python email_sender.py)

Bonne prospection !

---
{os.getenv('YOUR_COMPANY_NAME', 'Votre Entreprise')}"""

        success = self.send_email(test_email, subject, body)

        if success:
            print('✅ Test email sent successfully!')
            print('   Check your inbox (and spam folder)')
        else:
            print('❌ Failed to send test email')
            print('   Check your SMTP configuration in .env')

    def send_all_emails(self, daily_limit: int = 50):
        """Envoie tous les emails en attente"""
        prospects = self.db.get_prospects('analyzed')

        print(f'📧 Preparing to send emails to prospects...\n')

        if not self.smtp_user or not self.smtp_password:
            print('❌ Email not configured. Please configure SMTP settings in .env')
            return

        # Vérifier la connexion
        if not self.test_connection():
            print('❌ Cannot connect to email server')
            return

        sent = 0
        failed = 0

        for prospect in prospects:
            if sent >= daily_limit:
                print(f'\n⚠️  Daily limit reached ({daily_limit} emails)')
                break

            prospect_id = prospect['id']
            email = prospect.get('email')

            if not email:
                print(f"⏭️  Skipping {prospect['company_name']}: no email")
                continue

            # Récupérer l'email généré
            email_log = self._get_email_log(prospect_id)

            if not email_log:
                print(f"⏭️  Skipping {prospect['company_name']}: no email generated")
                continue

            print(f"\n📧 Sending to: {prospect['company_name']} ({email})")

            success = self.send_email(
                email,
                email_log['subject'],
                email_log['body']
            )

            if success:
                sent += 1
                self.db.update_prospect_status(prospect_id, 'contacted')

                # Pause entre les envois
                time.sleep(3)
            else:
                failed += 1

        print('\n' + '=' * 60)
        print('📊 EMAIL CAMPAIGN SUMMARY')
        print('=' * 60)
        print(f'✅ Successfully sent: {sent}')
        print(f'❌ Failed: {failed}')
        print(f'📝 Total prospects: {len(prospects)}')
        print('=' * 60 + '\n')

    def _get_email_log(self, prospect_id: int):
        """Récupère le dernier email log pour un prospect"""
        cursor = self.db.conn.cursor()
        cursor.execute(
            'SELECT * FROM email_logs WHERE prospect_id = ? ORDER BY id DESC LIMIT 1',
            (prospect_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def close(self):
        """Ferme les ressources"""
        self.db.close()


if __name__ == '__main__':
    import sys

    sender = EmailSender()

    try:
        if len(sys.argv) > 1 and sys.argv[1] == 'test':
            # Mode test
            test_email = sys.argv[2] if len(sys.argv) > 2 else sender.smtp_user
            if not test_email:
                print('❌ Please provide a test email: python email_sender.py test your@email.com')
                sys.exit(1)

            sender.send_test_email(test_email)

        else:
            # Mode campagne normale
            sender.send_all_emails()

    except KeyboardInterrupt:
        print('\n\n⚠️  Email sending interrupted by user')
    except Exception as e:
        print(f'\n\n❌ Error sending emails: {e}')
        import traceback
        traceback.print_exc()
    finally:
        sender.close()
        print('✅ Email sending completed')
