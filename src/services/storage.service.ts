import { Injectable } from '@angular/core';
import { Book, DailyReadingStat } from '../models/domain';

interface StorageBook {
  id: number;
  t: string;
  c: string;

  ts: number;
  tp: number;
  fr: number;
  lr: number;
  ad: number;
  sd: number;
  sp: number;
}

interface StorageStat {
  bid: number;
  s: number;
  p: number;
  st: number;
  en: number;
  d: string;
}

interface StorageSchema {
  v: number;
  b: StorageBook[];
  s: StorageStat[];
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'koreader_stats_v4';

  saveData(stats: DailyReadingStat[]) {
    try {
      const uniqueBooks = new Set<Book>();
      stats.forEach(s => uniqueBooks.add(s.book));

      const bookDTOs: StorageBook[] = Array.from(uniqueBooks).map(b => ({
        id: b.id,
        t: b.title,
        c: b.color,
        ts: b.totalSeconds,
        tp: b.totalPages,
        fr: b.firstRead.getTime(),
        lr: b.lastRead.getTime(),
        ad: b.activeDays,
        sd: b.spanDays,
        sp: b.speed
      }));

      const statDTOs: StorageStat[] = stats.map(s => ({
        bid: s.book.id,
        s: s.totalSeconds,
        p: s.totalPages,
        st: s.firstStart.getTime(),
        en: s.lastEnd.getTime(),
        d: s.date.toISOString().split('T')[0]
      }));

      const payload: StorageSchema = {
        v: 4,
        b: bookDTOs,
        s: statDTOs
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Storage quota exceeded', e);
    }
  }

  loadData(): { stats: DailyReadingStat[], books: Book[]; } | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored) as StorageSchema;
      if (!data.b || !data.s) return null;

      const books: Book[] = data.b.map(dto => ({
        id: dto.id,
        title: dto.t,
        color: dto.c,
        totalSeconds: dto.ts,
        totalPages: dto.tp,
        firstRead: new Date(dto.fr),
        lastRead: new Date(dto.lr),
        activeDays: dto.ad,
        spanDays: dto.sd,
        speed: dto.sp
      }));

      const bookMap = new Map<number, Book>(books.map(b => [b.id, b]));

      const stats: DailyReadingStat[] = data.s.map(dto => ({
        book: bookMap.get(dto.bid)!,
        totalSeconds: dto.s,
        totalPages: dto.p,
        firstStart: new Date(dto.st),
        lastEnd: new Date(dto.en),
        date: new Date(dto.d)
      }));

      return { stats, books };
    } catch (e) {
      console.error('Error loading data', e);
      return null;
    }
  }

  clearData() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
