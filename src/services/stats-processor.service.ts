import { Injectable, inject } from '@angular/core';
import { DailyReadingStat, Book } from '../models/domain';
import { FormatService } from './format.service';

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
  pages?: number;
  bookId: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: Date;
  color?: string;
  secondaryValue?: number;
  pages?: number;
  segments?: ChartSegment[];
}

export interface AggregatedStats {
  byYear: ChartDataPoint[];
  byMonth: ChartDataPoint[];
  byWeekday: ChartDataPoint[];
  dailyHistory: ChartDataPoint[];
  books: Book[];
  totalSeconds: number;
  totalBooks: number;
}

interface AggregateBookEntry {
  dur: number;
  pages: number;
  book: Book;
}

@Injectable({
  providedIn: 'root'
})
export class StatsProcessorService {
  private formatService = inject(FormatService);

  process(stats: DailyReadingStat[]): AggregatedStats {
    const yearMap = new Map<number, number>();
    const monthMap = new Map<string, number>();
    const weekdayMap = new Map<number, number>();
    const dailyMap = new Map<number, { dur: number, pages: number; }>();

    const yearBookMap = new Map<number, Map<number, AggregateBookEntry>>();
    const monthBookMap = new Map<string, Map<number, AggregateBookEntry>>();

    const bookActiveDates = new Map<number, Set<string>>();

    const bookTotals = new Map<number, {
      sec: number,
      pg: number,
      start: Date,
      end: Date,
      book: Book;
    }>();

    const sortedStats = [...stats].sort((a, b) => a.date.getTime() - b.date.getTime());
    let cumulativeSeconds = 0;

    for (const stat of sortedStats) {
      const year = stat.date.getFullYear();
      const monthKey = `${year}-${String(stat.date.getMonth() + 1).padStart(2, '0')}`;
      const dayOfWeek = stat.date.getDay();
      const time = stat.date.getTime();

      this.updateMap(yearMap, year, stat.totalSeconds);
      this.updateMap(monthMap, monthKey, stat.totalSeconds);
      this.updateMap(weekdayMap, dayOfWeek, stat.totalSeconds);

      const daily = dailyMap.get(time) || { dur: 0, pages: 0 };
      daily.dur += stat.totalSeconds;
      daily.pages += stat.totalPages;
      dailyMap.set(time, daily);

      this.updateNestedBookMap(yearBookMap, year, stat);
      this.updateNestedBookMap(monthBookMap, monthKey, stat);

      const bid = stat.book.id;
      if (!bookTotals.has(bid)) {
        bookTotals.set(bid, {
          sec: 0,
          pg: 0,
          start: stat.firstStart,
          end: stat.lastEnd,
          book: stat.book
        });
        bookActiveDates.set(bid, new Set());
      }

      const bt = bookTotals.get(bid)!;
      bt.sec += stat.totalSeconds;
      bt.pg += stat.totalPages;
      if (stat.firstStart < bt.start) bt.start = stat.firstStart;
      if (stat.lastEnd > bt.end) bt.end = stat.lastEnd;

      bookActiveDates.get(bid)!.add(stat.date.toISOString().split('T')[0]);
    }

    const finalBooks: Book[] = [];
    bookTotals.forEach((val, id) => {
      const b = val.book;
      b.totalSeconds = val.sec;
      b.totalPages = val.pg;
      b.firstRead = val.start;
      b.lastRead = val.end;
      b.activeDays = bookActiveDates.get(id)?.size || 0;

      const diffTime = Math.abs(b.lastRead.getTime() - b.firstRead.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      b.spanDays = diffDays < 1 ? 1 : diffDays;
      b.speed = b.totalPages > 0 ? (b.totalSeconds / 60) / b.totalPages : 0;

      finalBooks.push(b);
    });

    finalBooks.sort((a, b) => b.totalSeconds - a.totalSeconds);

    const historyPoints: ChartDataPoint[] = [];
    const uniqueDates = Array.from(dailyMap.keys()).sort((a, b) => a - b);

    for (const time of uniqueDates) {
      const data = dailyMap.get(time)!;
      cumulativeSeconds += data.dur;
      historyPoints.push({
        label: this.formatService.formatDate(time),
        value: cumulativeSeconds / 3600,
        secondaryValue: data.dur / 3600,
        pages: data.pages,
        date: new Date(time)
      });
    }

    const byYear = Array.from(yearMap.entries())
      .map(([y, dur]) => ({
        label: y.toString(),
        value: dur / 3600,
        date: new Date(y, 0, 1),
        segments: this.buildSegments(yearBookMap.get(y)!)
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const byMonth = Array.from(monthMap.entries())
      .filter(([, dur]) => dur >= 180)
      .map(([m, dur]) => {
        const [y, mon] = m.split('-').map(Number);
        const date = new Date(y, mon - 1, 1);
        return {
          label: this.formatService.formatMonth(date),
          value: dur / 3600,
          date: date,
          segments: this.buildSegments(monthBookMap.get(m)!)
        };
      })
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byWeekday = [1, 2, 3, 4, 5, 6, 0].map(dayIndex => ({
      label: weekdays[dayIndex],
      value: (weekdayMap.get(dayIndex) || 0) / 3600
    }));

    return {
      byYear,
      byMonth,
      byWeekday,
      dailyHistory: historyPoints,
      books: finalBooks,
      totalSeconds: cumulativeSeconds,
      totalBooks: finalBooks.length
    };
  }


  private updateMap<K>(map: Map<K, number>, key: K, val: number) {
    map.set(key, (map.get(key) || 0) + val);
  }

  private updateNestedBookMap<K>(
    map: Map<K, Map<number, AggregateBookEntry>>,
    key: K,
    stat: DailyReadingStat
  ) {
    if (!map.has(key)) map.set(key, new Map());
    const inner = map.get(key)!;

    const entry = inner.get(stat.book.id) || { dur: 0, pages: 0, book: stat.book };
    entry.dur += stat.totalSeconds;
    entry.pages += stat.totalPages;
    inner.set(stat.book.id, entry);
  }

  private buildSegments(map: Map<number, AggregateBookEntry>): ChartSegment[] {
    const segs: ChartSegment[] = [];
    map.forEach((val) => {
      if (val.dur > 0) {
        segs.push({
          bookId: val.book.id,
          label: val.book.title,
          value: val.dur / 3600,
          pages: val.pages,
          color: val.book.color
        });
      }
    });
    return segs.sort((a, b) => b.value - a.value);
  }
}
