import { Injectable, signal } from '@angular/core';

declare var initSqlJs: any;
declare var SQL_WASM_PATH: string | undefined;

export interface ProtoDailyStat {
  bookId: number;
  bookTitle: string;
  totalSeconds: number;
  totalPages: number;
  firstStartTs: number;
  lastEndTs: number;
  dateStr: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: any = null;

  isReady = signal<boolean>(false);

  async loadDatabaseFromFile(userDbFile: File): Promise<void> {
    this.closeDb();
    this.isReady.set(false);

    try {
      const wasmPath = (typeof SQL_WASM_PATH !== 'undefined') ? SQL_WASM_PATH : 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/';
      const SQL = await initSqlJs({ locateFile: (file: string) => `${wasmPath}${file}` });

      const buffer = await userDbFile.arrayBuffer();
      this.db = new SQL.Database(new Uint8Array(buffer));
      this.isReady.set(true);
    } catch (e: any) {
      console.error('Failed to load DB from file', e);
      throw new Error(`Failed to load database. Is it a valid 'statistics.sqlite3' file?`);
    }
  }

  getDailyStats(): ProtoDailyStat[] {
    if (!this.db) {
       throw new Error('Database is not loaded.');
    }

    try {
      const query = `
        SELECT
          b.id,
          b.title,
          SUM(CASE WHEN p.duration > 180 THEN 180 ELSE p.duration END) as total_duration,
          COUNT(DISTINCT p.page) as total_pages,
          MIN(p.start_time) as first_start_ts,
          MAX(p.start_time + p.duration) as last_end_ts,
          date(p.start_time, 'unixepoch', 'localtime', '-4 hours') as logical_date_str
        FROM page_stat_data AS p
        JOIN book AS b ON p.id_book = b.id
        WHERE p.duration >= 10
        GROUP BY logical_date_str, b.id
        ORDER BY logical_date_str ASC
      `;

      const result = this.db.exec(query);
      if (!result || !result.length) return [];

      const rows = result[0].values;
      const rawStats: ProtoDailyStat[] = rows.map((row: [number, string, number, number, number, number, string]) => {
        const [id, title, seconds, totalPages, startTs, endTs, dateStr] = row;
        return {
          bookId: id,
          bookTitle: title,
          totalSeconds: seconds,
          totalPages: totalPages,
          firstStartTs: startTs,
          lastEndTs: endTs,
          dateStr: dateStr
        };
      });

      return rawStats;

    } catch (e: any) {
      console.error('Query error:', e);
      throw new Error('Query failed. The database might have an unexpected schema.');
    }
  }

  reset() {
    this.closeDb();
    this.isReady.set(false);
  }

  private closeDb() {
    if (this.db) {
      try { this.db.close(); } catch (ignore) { }
      this.db = null;
    }
  }
}
