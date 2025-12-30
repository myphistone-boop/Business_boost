import nodemailer, { Transporter } from 'nodemailer';
import { Database } from './database';
import * as dotenv from 'dotenv';

dotenv.config();

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export class EmailSender {
  private transporter: Transporter | null = null;
  private db: Database;
  private config: EmailConfig;

  constructor() {
    this.db = new Database();

    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
      fromEmail: process.env.FROM_EMAIL || '',
      fromName: process.env.FROM_NAME || 'Web Agency',
    };

    this.initTransporter();
  }

  private initTransporter(): void {
    if (!this.config.user || !this.config.password) {
      console.log('⚠️  Email credentials not configured');
      console.log('   Add SMTP_USER and SMTP_PASSWORD to .env file');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: false, // true pour 465, false pour les autres ports
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
    });

    console.log('✅ Email transporter initialized');
  }

  /**
   * Vérifie la configuration email
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.log('❌ Email transporter not configured');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection successful');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }

  /**
   * Envoie un email à un prospect
   */
  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    if (!this.transporter) {
      console.log('❌ Cannot send email: transporter not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: to,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>'), // Conversion simple en HTML
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}`);
      console.log(`   Message ID: ${info.messageId}`);

      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Envoie des emails à tous les prospects avec un email généré
   */
  async sendAllEmails(dailyLimit: number = 50): Promise<void> {
    const prospects = await this.db.getProspects('analyzed');

    console.log(`📧 Preparing to send emails to prospects...\n`);

    if (!this.transporter) {
      console.log('❌ Email not configured. Please configure SMTP settings in .env');
      return;
    }

    // Vérifier la connexion
    const connected = await this.testConnection();
    if (!connected) {
      console.log('❌ Cannot connect to email server');
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const prospect of prospects) {
      if (sent >= dailyLimit) {
        console.log(`\n⚠️  Daily limit reached (${dailyLimit} emails)`);
        break;
      }

      if (!prospect.id || !prospect.email) {
        console.log(`⏭️  Skipping ${prospect.company_name}: no email`);
        continue;
      }

      // Récupérer l'email généré précédemment
      const emailLog = await this.getEmailLog(prospect.id);

      if (!emailLog) {
        console.log(`⏭️  Skipping ${prospect.company_name}: no email generated`);
        continue;
      }

      console.log(`\n📧 Sending to: ${prospect.company_name} (${prospect.email})`);

      const success = await this.sendEmail(
        prospect.email,
        emailLog.subject,
        emailLog.body
      );

      if (success) {
        sent++;
        await this.db.updateProspectStatus(prospect.id, 'contacted');

        // Pause entre les envois pour éviter d'être marqué comme spam
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 EMAIL CAMPAIGN SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully sent: ${sent}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total prospects: ${prospects.length}`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Envoie un email de test
   */
  async sendTestEmail(testEmail: string): Promise<void> {
    console.log(`📧 Sending test email to ${testEmail}...\n`);

    const subject = 'Test - Système de prospection automatique';
    const body = `Bonjour,

Ceci est un email de test de votre système de prospection automatique.

Si vous recevez cet email, votre configuration SMTP est correcte ! ✅

Vous pouvez maintenant :
1. Scraper des prospects (npm run scrape)
2. Analyser leurs sites web (npm run analyze)
3. Générer des emails personnalisés (npm run generate-emails)
4. Envoyer les emails (npm run send-emails)

Bonne prospection !

---
${process.env.YOUR_COMPANY_NAME || 'Votre Entreprise'}`;

    const success = await this.sendEmail(testEmail, subject, body);

    if (success) {
      console.log('✅ Test email sent successfully!');
      console.log('   Check your inbox (and spam folder)');
    } else {
      console.log('❌ Failed to send test email');
      console.log('   Check your SMTP configuration in .env');
    }
  }

  /**
   * Récupère l'email log pour un prospect
   */
  private async getEmailLog(prospectId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db['db'].get(
        'SELECT * FROM email_logs WHERE prospect_id = ? ORDER BY id DESC LIMIT 1',
        [prospectId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Campagne d'envoi progressive avec suivi
   */
  async runCampaign(options: {
    dailyLimit?: number;
    batchSize?: number;
    delayBetweenBatches?: number;
  } = {}): Promise<void> {
    const {
      dailyLimit = 50,
      batchSize = 10,
      delayBetweenBatches = 300000 // 5 minutes
    } = options;

    console.log('🚀 Starting email campaign...');
    console.log(`   Daily limit: ${dailyLimit} emails`);
    console.log(`   Batch size: ${batchSize} emails`);
    console.log(`   Delay between batches: ${delayBetweenBatches / 60000} minutes\n`);

    await this.sendAllEmails(dailyLimit);

    console.log('✅ Campaign completed!');
  }

  close(): void {
    this.db.close();
  }
}

// Exécution directe du script
if (require.main === module) {
  const args = process.argv.slice(2);
  const sender = new EmailSender();

  if (args[0] === 'test') {
    // Envoyer un email de test
    const testEmail = args[1] || process.env.SMTP_USER;
    if (!testEmail) {
      console.log('❌ Please provide a test email: npm run send-emails test your@email.com');
      process.exit(1);
    }

    sender.sendTestEmail(testEmail)
      .then(() => {
        sender.close();
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
      });
  } else {
    // Lancer la campagne normale
    sender.runCampaign()
      .then(() => {
        sender.close();
        console.log('✅ Email sending completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error sending emails:', error);
        process.exit(1);
      });
  }
}
