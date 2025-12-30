import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export interface Prospect {
  id?: number;
  company_name: string;
  website?: string;
  email?: string;
  phone?: string;
  sector: string;
  location: string;
  found_date: string;
  status: 'new' | 'analyzed' | 'contacted' | 'replied' | 'converted' | 'rejected';
}

export interface WebsiteAnalysis {
  id?: number;
  prospect_id: number;
  has_website: boolean;
  performance_score?: number;
  seo_score?: number;
  mobile_friendly?: boolean;
  https_enabled?: boolean;
  load_time?: number;
  issues_found: string;
  opportunities: string;
  analysis_date: string;
}

export interface EmailLog {
  id?: number;
  prospect_id: number;
  subject: string;
  body: string;
  sent_date: string;
  opened?: boolean;
  clicked?: boolean;
  replied?: boolean;
}

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = './prospects.db') {
    this.db = new sqlite3.Database(dbPath);
    this.initTables();
  }

  private initTables(): void {
    this.db.serialize(() => {
      // Table des prospects
      this.db.run(`
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
      `);

      // Table des analyses de sites
      this.db.run(`
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
      `);

      // Table des emails envoyés
      this.db.run(`
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
      `);

      console.log('✅ Database tables initialized');
    });
  }

  async addProspect(prospect: Prospect): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO prospects (company_name, website, email, phone, sector, location, found_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        prospect.company_name,
        prospect.website || null,
        prospect.email || null,
        prospect.phone || null,
        prospect.sector,
        prospect.location,
        prospect.found_date,
        prospect.status || 'new',
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );

      stmt.finalize();
    });
  }

  async addWebsiteAnalysis(analysis: WebsiteAnalysis): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO website_analysis
        (prospect_id, has_website, performance_score, seo_score, mobile_friendly,
         https_enabled, load_time, issues_found, opportunities, analysis_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        analysis.prospect_id,
        analysis.has_website,
        analysis.performance_score || null,
        analysis.seo_score || null,
        analysis.mobile_friendly || null,
        analysis.https_enabled || null,
        analysis.load_time || null,
        analysis.issues_found,
        analysis.opportunities,
        analysis.analysis_date,
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );

      stmt.finalize();
    });
  }

  async addEmailLog(emailLog: EmailLog): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO email_logs (prospect_id, subject, body, sent_date)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        emailLog.prospect_id,
        emailLog.subject,
        emailLog.body,
        emailLog.sent_date,
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );

      stmt.finalize();
    });
  }

  async getProspects(status?: string): Promise<Prospect[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM prospects';
      if (status) query += ` WHERE status = ?`;

      this.db.all(query, status ? [status] : [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Prospect[]);
      });
    });
  }

  async updateProspectStatus(prospectId: number, status: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE prospects SET status = ? WHERE id = ?',
        [status, prospectId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getAnalysis(prospectId: number): Promise<WebsiteAnalysis | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM website_analysis WHERE prospect_id = ?',
        [prospectId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as WebsiteAnalysis || null);
        }
      );
    });
  }

  async getStats(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT
          COUNT(*) as total_prospects,
          SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_prospects,
          SUM(CASE WHEN status = 'analyzed' THEN 1 ELSE 0 END) as analyzed,
          SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
          SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
          SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted
        FROM prospects
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]);
      });
    });
  }

  close(): void {
    this.db.close();
  }
}
