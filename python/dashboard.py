"""
Dashboard web avec Flask pour visualiser les prospects
"""
from flask import Flask, render_template_string, jsonify
from database import Database


app = Flask(__name__)
db = Database()


DASHBOARD_HTML = '''
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
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 { color: #667eea; margin-bottom: 10px; }
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
            overflow-x: auto;
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
                <div class="stat-number">{{ stats.total_prospects }}</div>
                <div class="stat-label">Total Prospects</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ stats.new_prospects }}</div>
                <div class="stat-label">Nouveaux</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ stats.analyzed }}</div>
                <div class="stat-label">Analysés</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ stats.contacted }}</div>
                <div class="stat-label">Contactés</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ stats.replied }}</div>
                <div class="stat-label">Réponses</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ stats.converted }}</div>
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
                        <th>Email</th>
                        <th>Statut</th>
                    </tr>
                </thead>
                <tbody>
                    {% for p in prospects %}
                    <tr>
                        <td><strong>{{ p.company_name }}</strong></td>
                        <td>{{ p.sector }}</td>
                        <td>
                            {% if p.website %}
                                <a href="{{ p.website }}" target="_blank">Visiter</a>
                            {% else %}
                                ❌ Aucun
                            {% endif %}
                        </td>
                        <td>{{ p.email if p.email else '❌' }}</td>
                        <td><span class="status status-{{ p.status }}">{{ p.status }}</span></td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
'''


@app.route('/')
def index():
    """Page d'accueil du dashboard"""
    stats = db.get_stats()
    prospects = db.get_prospects()[:50]  # 50 premiers

    return render_template_string(DASHBOARD_HTML, stats=stats, prospects=prospects)


@app.route('/api/stats')
def api_stats():
    """API: Statistiques"""
    return jsonify(db.get_stats())


@app.route('/api/prospects')
def api_prospects():
    """API: Liste des prospects"""
    status = request.args.get('status')
    prospects = db.get_prospects(status)
    return jsonify(prospects)


@app.route('/api/prospect/<int:prospect_id>')
def api_prospect(prospect_id):
    """API: Détails d'un prospect"""
    prospects = db.get_prospects()
    prospect = next((p for p in prospects if p['id'] == prospect_id), None)

    if not prospect:
        return jsonify({'error': 'Prospect not found'}), 404

    analysis = db.get_analysis(prospect_id)

    return jsonify({
        'prospect': prospect,
        'analysis': analysis
    })


def run_dashboard(port=3000):
    """Lance le dashboard"""
    print('=' * 60)
    print('🚀 Dashboard is running!')
    print('=' * 60)
    print(f'\n📊 Open in browser: http://localhost:{port}')
    print('\nAPI Endpoints:')
    print(f'  - GET  /                        Dashboard')
    print(f'  - GET  /api/stats               Statistiques')
    print(f'  - GET  /api/prospects           Liste prospects')
    print(f'  - GET  /api/prospect/<id>       Détails prospect')
    print('\n' + '=' * 60 + '\n')

    app.run(host='0.0.0.0', port=port, debug=False)


if __name__ == '__main__':
    try:
        run_dashboard()
    except KeyboardInterrupt:
        print('\n\n👋 Shutting down dashboard...')
        db.close()
