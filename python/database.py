"""
Module de gestion de la base de données SQLite
"""
import sqlite3
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass


@dataclass
class Prospect:
    company_name: str
    sector: str
    location: str
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    found_date: str = None
    status: str = 'new'
    id: Optional[int] = None

    def __post_init__(self):
        if not self.found_date:
            self.found_date = datetime.now().isoformat()


@dataclass
class WebsiteAnalysis:
    prospect_id: int
    has_website: bool
    issues_found: str
    opportunities: str
    analysis_date: str = None
    performance_score: Optional[float] = None
    seo_score: Optional[float] = None
    mobile_friendly: Optional[bool] = None
    https_enabled: Optional[bool] = None
    load_time: Optional[float] = None
    id: Optional[int] = None

    def __post_init__(self):
        if not self.analysis_date:
            self.analysis_date = datetime.now().isoformat()


@dataclass
class EmailLog:
    prospect_id: int
    subject: str
    body: str
    sent_date: str = None
    opened: bool = False
    clicked: bool = False
    replied: bool = False
    id: Optional[int] = None

    def __post_init__(self):
        if not self.sent_date:
            self.sent_date = datetime.now().isoformat()


class Database:
    """Gestionnaire de base de données SQLite pour les prospects"""

    def __init__(self, db_path: str = 'prospects.db'):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_tables()

    def _init_tables(self):
        """Initialise les tables de la base de données"""
        cursor = self.conn.cursor()

        # Table des prospects
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prospects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_name TEXT NOT NULL,
                website TEXT,
                email TEXT,
                phone TEXT,
                sector TEXT,
                location TEXT,
                found_date TEXT,
                status TEXT DEFAULT 'new'
            )
        ''')

        # Table des analyses de sites
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS website_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prospect_id INTEGER,
                has_website BOOLEAN,
                performance_score REAL,
                seo_score REAL,
                mobile_friendly BOOLEAN,
                https_enabled BOOLEAN,
                load_time REAL,
                issues_found TEXT,
                opportunities TEXT,
                analysis_date TEXT,
                FOREIGN KEY (prospect_id) REFERENCES prospects(id)
            )
        ''')

        # Table des emails envoyés
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS email_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prospect_id INTEGER,
                subject TEXT,
                body TEXT,
                sent_date TEXT,
                opened BOOLEAN DEFAULT 0,
                clicked BOOLEAN DEFAULT 0,
                replied BOOLEAN DEFAULT 0,
                FOREIGN KEY (prospect_id) REFERENCES prospects(id)
            )
        ''')

        self.conn.commit()
        print('✅ Database tables initialized')

    def add_prospect(self, prospect: Prospect) -> int:
        """Ajoute un prospect à la base de données"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO prospects (company_name, website, email, phone, sector, location, found_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            prospect.company_name,
            prospect.website,
            prospect.email,
            prospect.phone,
            prospect.sector,
            prospect.location,
            prospect.found_date,
            prospect.status
        ))
        self.conn.commit()
        return cursor.lastrowid

    def add_website_analysis(self, analysis: WebsiteAnalysis) -> int:
        """Ajoute une analyse de site web"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO website_analysis
            (prospect_id, has_website, performance_score, seo_score, mobile_friendly,
             https_enabled, load_time, issues_found, opportunities, analysis_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            analysis.prospect_id,
            analysis.has_website,
            analysis.performance_score,
            analysis.seo_score,
            analysis.mobile_friendly,
            analysis.https_enabled,
            analysis.load_time,
            analysis.issues_found,
            analysis.opportunities,
            analysis.analysis_date
        ))
        self.conn.commit()
        return cursor.lastrowid

    def add_email_log(self, email_log: EmailLog) -> int:
        """Ajoute un log d'email envoyé"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO email_logs (prospect_id, subject, body, sent_date)
            VALUES (?, ?, ?, ?)
        ''', (
            email_log.prospect_id,
            email_log.subject,
            email_log.body,
            email_log.sent_date
        ))
        self.conn.commit()
        return cursor.lastrowid

    def get_prospects(self, status: Optional[str] = None) -> List[Dict]:
        """Récupère les prospects (optionnellement filtrés par statut)"""
        cursor = self.conn.cursor()

        if status:
            cursor.execute('SELECT * FROM prospects WHERE status = ?', (status,))
        else:
            cursor.execute('SELECT * FROM prospects')

        return [dict(row) for row in cursor.fetchall()]

    def update_prospect_status(self, prospect_id: int, status: str):
        """Met à jour le statut d'un prospect"""
        cursor = self.conn.cursor()
        cursor.execute('UPDATE prospects SET status = ? WHERE id = ?', (status, prospect_id))
        self.conn.commit()

    def update_prospect_email(self, prospect_id: int, email: str):
        """Met à jour l'email d'un prospect"""
        cursor = self.conn.cursor()
        cursor.execute('UPDATE prospects SET email = ? WHERE id = ?', (email, prospect_id))
        self.conn.commit()

    def get_analysis(self, prospect_id: int) -> Optional[Dict]:
        """Récupère l'analyse d'un prospect"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM website_analysis WHERE prospect_id = ?', (prospect_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_stats(self) -> Dict[str, int]:
        """Récupère les statistiques globales"""
        cursor = self.conn.cursor()

        cursor.execute('''
            SELECT
                COUNT(*) as total_prospects,
                SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_prospects,
                SUM(CASE WHEN status = 'analyzed' THEN 1 ELSE 0 END) as analyzed,
                SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
                SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
                SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted
            FROM prospects
        ''')

        row = cursor.fetchone()
        return dict(row) if row else {}

    def count_prospects_with_email(self) -> int:
        """Compte le nombre de prospects avec un email"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT COUNT(*) as count FROM prospects WHERE email IS NOT NULL AND email != ""')
        return cursor.fetchone()['count']

    def close(self):
        """Ferme la connexion à la base de données"""
        self.conn.close()


if __name__ == '__main__':
    # Test
    db = Database()
    print("Database initialized successfully!")
    db.close()
