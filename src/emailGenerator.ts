import OpenAI from 'openai';
import { Database, Prospect } from './database';
import * as dotenv from 'dotenv';

dotenv.config();

export interface EmailContent {
  subject: string;
  body: string;
}

export class EmailGenerator {
  private openai: OpenAI | null = null;
  private db: Database;

  constructor() {
    this.db = new Database();

    // Initialiser OpenAI seulement si la clé API est fournie
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Génère un email personnalisé avec OpenAI
   */
  async generateWithAI(prospect: Prospect, analysis: any): Promise<EmailContent> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured. Add OPENAI_API_KEY to .env file');
    }

    const issues = analysis.issues_found ? JSON.parse(analysis.issues_found) : [];
    const opportunities = analysis.opportunities ? JSON.parse(analysis.opportunities) : [];

    const prompt = `
Tu es un expert en prospection commerciale pour une agence de création de sites web.

Génère un email de prospection personnalisé et professionnel pour:
- Entreprise: ${prospect.company_name}
- Secteur: ${prospect.sector}
- Site web actuel: ${prospect.website || 'AUCUN'}

Analyse du site:
- A un site web: ${analysis.has_website ? 'Oui' : 'Non'}
- Score Performance: ${analysis.performance_score || 'N/A'}/100
- Score SEO: ${analysis.seo_score || 'N/A'}/100
- Mobile-friendly: ${analysis.mobile_friendly ? 'Oui' : 'Non'}
- HTTPS: ${analysis.https_enabled ? 'Oui' : 'Non'}

Problèmes identifiés: ${issues.join(', ') || 'Aucun site web'}

Opportunités: ${opportunities.join(', ')}

L'email doit:
1. Être court (maximum 150 mots)
2. Être personnalisé et professionnel
3. Mentionner 2-3 problèmes spécifiques identifiés
4. Proposer une solution concrète
5. Terminer par un call-to-action clair (appel découverte gratuit de 15 min)
6. Ne pas être trop commercial ou insistant
7. Créer de la valeur avant de vendre

Retourne UNIQUEMENT un JSON avec:
{
  "subject": "Sujet de l'email (max 60 caractères, accrocheur)",
  "body": "Corps de l'email"
}
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en copywriting et prospection B2B. Tu génères des emails de prospection personnalisés et efficaces.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0].message.content;
      if (!response) throw new Error('No response from OpenAI');

      const emailContent = JSON.parse(response);

      return {
        subject: emailContent.subject,
        body: emailContent.body
      };
    } catch (error) {
      console.error('Error generating email with AI:', error);
      // Fallback vers un template si l'API échoue
      return this.generateTemplate(prospect, analysis);
    }
  }

  /**
   * Génère un email basé sur des templates (sans AI)
   */
  generateTemplate(prospect: Prospect, analysis: any): EmailContent {
    const issues = analysis.issues_found ? JSON.parse(analysis.issues_found) : [];
    const opportunities = analysis.opportunities ? JSON.parse(analysis.opportunities) : [];

    let subject = '';
    let body = '';

    if (!analysis.has_website) {
      // Template pour entreprises SANS site web
      subject = `${prospect.company_name} : Votre présence en ligne`;

      body = `Bonjour,

Je suis tombé sur ${prospect.company_name} et j'ai remarqué que vous n'avez pas encore de site web.

Dans le secteur ${prospect.sector}, 78% des clients recherchent en ligne avant de faire un choix. Vous perdez potentiellement des clients chaque jour.

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
${process.env.FROM_NAME || 'Votre Nom'}
${process.env.YOUR_COMPANY_NAME || 'Votre Entreprise'}
${process.env.YOUR_PHONE || 'Téléphone'}`;

    } else if (analysis.performance_score < 60 || analysis.seo_score < 60) {
      // Template pour sites avec problèmes
      subject = `${prospect.company_name} : Améliorer votre site web`;

      const mainIssues = issues.slice(0, 3).map((issue: string) => `• ${issue}`).join('\n');

      body = `Bonjour,

J'ai analysé le site de ${prospect.company_name} et j'ai identifié quelques opportunités d'amélioration :

${mainIssues}

Ces problèmes peuvent vous faire perdre des clients potentiels et nuire à votre référencement Google.

Nous avons aidé ${prospect.sector === 'restaurant' ? 'plusieurs restaurants' : 'de nombreuses entreprises'} à :
✓ Augmenter leur trafic de +150%
✓ Améliorer leur conversion visiteur → client
✓ Apparaître en première page Google

Seriez-vous intéressé par un audit gratuit complet de votre site ?

Je peux vous proposer un appel de 15 minutes pour discuter des quick-wins possibles.

Cordialement,
${process.env.FROM_NAME || 'Votre Nom'}
${process.env.YOUR_COMPANY_NAME || 'Votre Entreprise'}
${process.env.YOUR_PHONE || 'Téléphone'}`;

    } else {
      // Template générique
      subject = `Optimisation web pour ${prospect.company_name}`;

      body = `Bonjour,

Je me permets de vous contacter car je travaille avec des entreprises dans le secteur ${prospect.sector} pour optimiser leur présence en ligne.

J'ai remarqué quelques opportunités d'amélioration sur votre site web qui pourraient vous apporter plus de clients.

Seriez-vous disponible pour un échange rapide de 15 minutes ?

Cordialement,
${process.env.FROM_NAME || 'Votre Nom'}
${process.env.YOUR_COMPANY_NAME || 'Votre Entreprise'}`;
    }

    return { subject, body };
  }

  /**
   * Génère des emails pour tous les prospects analysés
   */
  async generateAllEmails(): Promise<void> {
    const prospects = await this.db.getProspects('analyzed');

    console.log(`📧 Generating emails for ${prospects.length} prospects...\n`);

    for (const prospect of prospects) {
      if (!prospect.id) continue;

      const analysis = await this.db.getAnalysis(prospect.id);
      if (!analysis) continue;

      console.log(`\n✍️  Generating email for: ${prospect.company_name}`);

      let emailContent: EmailContent;

      if (this.openai) {
        // Utiliser l'IA si disponible
        emailContent = await this.generateWithAI(prospect, analysis);
        console.log('   ✨ Generated with AI');
      } else {
        // Sinon utiliser les templates
        emailContent = this.generateTemplate(prospect, analysis);
        console.log('   📝 Generated with template');
      }

      console.log(`   Subject: ${emailContent.subject}`);

      // Sauvegarder l'email (pas encore envoyé)
      await this.db.addEmailLog({
        prospect_id: prospect.id,
        subject: emailContent.subject,
        body: emailContent.body,
        sent_date: new Date().toISOString()
      });

      // Pause pour respecter les rate limits de l'API
      if (this.openai) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n✅ Email generation complete!');
  }

  /**
   * Prévisualiser un email pour un prospect
   */
  async previewEmail(prospectId: number): Promise<void> {
    const prospects = await this.db.getProspects();
    const prospect = prospects.find(p => p.id === prospectId);

    if (!prospect || !prospect.id) {
      console.log('❌ Prospect not found');
      return;
    }

    const analysis = await this.db.getAnalysis(prospect.id);
    if (!analysis) {
      console.log('❌ No analysis found for this prospect');
      return;
    }

    const email = this.openai
      ? await this.generateWithAI(prospect, analysis)
      : this.generateTemplate(prospect, analysis);

    console.log('\n' + '='.repeat(60));
    console.log(`PREVIEW EMAIL FOR: ${prospect.company_name}`);
    console.log('='.repeat(60));
    console.log(`\nTO: ${prospect.email || 'email@example.com'}`);
    console.log(`SUBJECT: ${email.subject}`);
    console.log('\n' + '-'.repeat(60));
    console.log(email.body);
    console.log('='.repeat(60) + '\n');
  }

  close(): void {
    this.db.close();
  }
}

// Exécution directe du script
if (require.main === module) {
  const generator = new EmailGenerator();

  generator.generateAllEmails()
    .then(() => {
      generator.close();
      console.log('✅ Email generation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error generating emails:', error);
      process.exit(1);
    });
}
