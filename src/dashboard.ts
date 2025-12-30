import express, { Request, Response } from 'express';
import { Database } from './database';

export class Dashboard {
  private app: express.Application;
  private db: Database;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.db = new Database();
    this.port = port;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Page d'accueil avec statistiques
    this.app.get('/', async (req: Request, res: Response) => {
      const stats = await this.db.getStats();
      const prospects = await this.db.getProspects();

      const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Prospection Automatique</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 {
            color: #667eea;
            margin-bottom: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .prospects-table {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        tr:hover {
            background: #f8f9ff;
        }
        .status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .status-new { background: #e3f2fd; color: #1976d2; }
        .status-analyzed { background: #fff3e0; color: #f57c00; }
        .status-contacted { background: #f3e5f5; color: #7b1fa2; }
        .status-replied { background: #e8f5e9; color: #388e3c; }
        .status-converted { background: #c8e6c9; color: #2e7d32; }
        .score {
            font-weight: bold;
            padding: 3px 8px;
            border-radius: 5px;
        }
        .score-low { background: #ffebee; color: #c62828; }
        .score-medium { background: #fff3e0; color: #ef6c00; }
        .score-high { background: #e8f5e9; color: #2e7d32; }
        .actions {
            margin-top: 20px;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 10px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            margin: 5px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #5568d3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Dashboard de Prospection</h1>
            <p>Système automatisé de prospection pour vente de sites web</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${stats.total_prospects || 0}</div>
                <div class="stat-label">Total Prospects</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.new_prospects || 0}</div>
                <div class="stat-label">Nouveaux</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.analyzed || 0}</div>
                <div class="stat-label">Analysés</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.contacted || 0}</div>
                <div class="stat-label">Contactés</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.replied || 0}</div>
                <div class="stat-label">Réponses</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.converted || 0}</div>
                <div class="stat-label">Convertis</div>
            </div>
        </div>

        <div class="prospects-table">
            <h2 style="margin-bottom: 20px;">📋 Derniers Prospects</h2>
            <table>
                <thead>
                    <tr>
                        <th>Entreprise</th>
                        <th>Secteur</th>
                        <th>Site Web</th>
                        <th>Statut</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${prospects.slice(0, 50).map(p => `
                        <tr>
                            <td><strong>${p.company_name}</strong></td>
                            <td>${p.sector}</td>
                            <td>${p.website ? `<a href="${p.website}" target="_blank">Visiter</a>` : '❌ Aucun'}</td>
                            <td><span class="status status-${p.status}">${p.status}</span></td>
                            <td>${new Date(p.found_date).toLocaleDateString('fr-FR')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="actions">
            <h3 style="margin-bottom: 15px;">🚀 Actions Rapides</h3>
            <a href="/api/stats" class="btn">📊 Statistiques JSON</a>
            <a href="/api/prospects" class="btn">📋 Export Prospects</a>
            <a href="/api/best-prospects" class="btn">🎯 Meilleurs Prospects</a>
        </div>
    </div>
</body>
</html>
      `;

      res.send(html);
    });

    // API: Statistiques
    this.app.get('/api/stats', async (req: Request, res: Response) => {
      const stats = await this.db.getStats();
      res.json(stats);
    });

    // API: Liste des prospects
    this.app.get('/api/prospects', async (req: Request, res: Response) => {
      const status = req.query.status as string | undefined;
      const prospects = await this.db.getProspects(status);
      res.json(prospects);
    });

    // API: Meilleurs prospects (sites avec problèmes)
    this.app.get('/api/best-prospects', async (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 20;

      const prospects = await new Promise((resolve, reject) => {
        this.db['db'].all(`
          SELECT
            p.*,
            wa.performance_score,
            wa.seo_score,
            wa.has_website,
            wa.issues_found,
            wa.opportunities
          FROM prospects p
          LEFT JOIN website_analysis wa ON p.id = wa.prospect_id
          WHERE p.status IN ('analyzed', 'new')
          ORDER BY
            CASE WHEN wa.has_website = 0 THEN 1 ELSE 2 END,
            (COALESCE(wa.performance_score, 0) + COALESCE(wa.seo_score, 0)) ASC
          LIMIT ?
        `, [limit], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      res.json(prospects);
    });

    // API: Détails d'un prospect
    this.app.get('/api/prospect/:id', async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const prospects = await this.db.getProspects();
      const prospect = prospects.find(p => p.id === id);

      if (!prospect) {
        res.status(404).json({ error: 'Prospect not found' });
        return;
      }

      const analysis = await this.db.getAnalysis(id);

      res.json({
        prospect,
        analysis
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log('='.repeat(60));
        console.log('🚀 Dashboard is running!');
        console.log('='.repeat(60));
        console.log(`\n📊 Open in browser: http://localhost:${this.port}`);
        console.log('\nAPI Endpoints:');
        console.log(`  - GET  /                        Dashboard`);
        console.log(`  - GET  /api/stats               Statistiques`);
        console.log(`  - GET  /api/prospects           Liste prospects`);
        console.log(`  - GET  /api/best-prospects      Meilleurs prospects`);
        console.log(`  - GET  /api/prospect/:id        Détails prospect`);
        console.log('\n' + '='.repeat(60) + '\n');
        resolve();
      });
    });
  }

  close(): void {
    this.db.close();
  }
}

// Exécution directe du script
if (require.main === module) {
  const dashboard = new Dashboard(3000);

  dashboard.start().catch((error) => {
    console.error('❌ Error starting dashboard:', error);
    process.exit(1);
  });

  // Gestion de l'arrêt propre
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down dashboard...');
    dashboard.close();
    process.exit(0);
  });
}
