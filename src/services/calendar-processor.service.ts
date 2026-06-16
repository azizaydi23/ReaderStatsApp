import { Injectable, inject } from '@angular/core';
import { DailyReadingStat, Book } from '../models/domain';
import { FormatService } from './format.service';

export interface BookStat {
  book: Book;
  totalSeconds: number;
  displayMinutes: number;
  totalPages: number;
  firstStart: Date;
  lastEnd: Date;
}

export type CellType = 'empty' | 'day' | 'week-total' | 'padding-day';

export interface CalendarCell {
  type: CellType;
  dayNum?: number;
  totalMinutes?: number;
  fullWeekMinutes?: number;
  books?: BookStat[];
  isSunday?: boolean;
  intensity?: number;
  localIntensity?: number;
  fullWeekIntensity?: number;
}

export interface MonthData {
  name: string;
  totalMinutes: number;
  totalHours: string;
  intensity: number;
  localIntensity?: number;
  gridCells: CalendarCell[];
}

export interface YearData {
  year: number;
  months: MonthData[];
}

@Injectable({
  providedIn: 'root'
})
export class CalendarProcessorService {
  private formatService = inject(FormatService);

  process(stats: DailyReadingStat[]): YearData[] {
    if (!stats.length) return [];

    const weekTotals = this.computeWeekTotals(stats);
    const dataTree = this.buildDataTree(stats);

    const result: YearData[] = [];
    const sortedYears = Array.from(dataTree.keys()).sort((a, b) => a - b);

    const allDays: CalendarCell[] = [];
    const allWeeks: CalendarCell[] = [];
    const allMonths: MonthData[] = [];

    for (const year of sortedYears) {
      const monthsData: MonthData[] = [];

      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const startOfMonth = new Date(year, monthIndex, 1);
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const startDayOffset = startOfMonth.getDay();
        const monStartOffset = startDayOffset === 0 ? 6 : startDayOffset - 1;

        const gridCells: CalendarCell[] = [];

        let monthTotalSec = 0;
        let currentWeekTotalSec = 0;
        let maxDayMinsInMonth = 0;
        let maxWeekMinsInMonth = 0;

        if (monStartOffset > 0) {
          const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
          for (let i = 0; i < monStartOffset; i++) {
            const dayNum = prevMonthLastDay - monStartOffset + 1 + i;
            const cell = this.createDayCell('padding-day', year, monthIndex - 1, dayNum, dataTree);
            gridCells.push(cell);
          }
        }

        for (let day = 1; day <= daysInMonth; day++) {
          const cell = this.createDayCell('day', year, monthIndex, day, dataTree);

          const sec = cell.books?.reduce((sum, b) => sum + b.totalSeconds, 0) || 0;
          monthTotalSec += sec;
          currentWeekTotalSec += sec;

          maxDayMinsInMonth = Math.max(maxDayMinsInMonth, cell.totalMinutes!);
          gridCells.push(cell);
          if (sec > 0) allDays.push(cell);

          const isSunday = new Date(year, monthIndex, day).getDay() === 0;
          if (isSunday) {
            const weekCell = this.createWeekCell(new Date(year, monthIndex, day), currentWeekTotalSec, weekTotals);
            gridCells.push(weekCell);

            const wVal = weekCell.fullWeekMinutes ?? weekCell.totalMinutes ?? 0;
            if (wVal > 0) allWeeks.push(weekCell);
            maxWeekMinsInMonth = Math.max(maxWeekMinsInMonth, wVal);

            currentWeekTotalSec = 0;
          }
        }

        const lastDayObj = new Date(year, monthIndex, daysInMonth);
        let lastDayIndex = lastDayObj.getDay();
        lastDayIndex = lastDayIndex === 0 ? 6 : lastDayIndex - 1;

        if (lastDayIndex < 6) {
          const daysRemaining = 6 - lastDayIndex;
          for (let i = 1; i <= daysRemaining; i++) {
            const cell = this.createDayCell('padding-day', year, monthIndex + 1, i, dataTree);
            gridCells.push(cell);
          }

          const weekCell = this.createWeekCell(lastDayObj, currentWeekTotalSec, weekTotals);
          gridCells.push(weekCell);

          const wVal = weekCell.fullWeekMinutes ?? weekCell.totalMinutes ?? 0;
          if (wVal > 0) allWeeks.push(weekCell);
          maxWeekMinsInMonth = Math.max(maxWeekMinsInMonth, wVal);
        }

        this.applyLocalIntensity(gridCells, maxDayMinsInMonth, maxWeekMinsInMonth);

        const monthData: MonthData = {
          name: this.formatService.formatMonthLong(startOfMonth),
          totalMinutes: Math.round(monthTotalSec / 60),
          totalHours: (monthTotalSec / 3600).toFixed(1),
          intensity: 0,
          localIntensity: 0,
          gridCells: gridCells
        };
        monthsData.push(monthData);
        allMonths.push(monthData);
      }

      const maxMonthInYear = Math.max(...monthsData.map(m => m.totalMinutes));
      monthsData.forEach(m => {
        m.localIntensity = this.calculateRelativeIntensity(m.totalMinutes, maxMonthInYear);
      });

      result.push({ year, months: monthsData });
    }

    this.applyGlobalIntensities(allDays, allWeeks, allMonths);

    return result;
  }

  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private calculateRelativeIntensity(value: number, max: number): number {
    if (value <= 0 || max <= 0) return 0;
    return Math.min(255, Math.floor((value / max) * 255));
  }

  private computeWeekTotals(stats: DailyReadingStat[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const stat of stats) {
      const mondayTs = this.getMonday(stat.date).getTime();
      map.set(mondayTs, (map.get(mondayTs) || 0) + stat.totalSeconds);
    }
    return map;
  }

  private buildDataTree(stats: DailyReadingStat[]) {
    const tree = new Map<number, Map<string, Map<number, BookStat[]>>>();

    for (const stat of stats) {
      const year = stat.date.getFullYear();
      const monthKey = `${year}-${String(stat.date.getMonth() + 1).padStart(2, '0')}`;
      const day = stat.date.getDate();

      if (!tree.has(year)) tree.set(year, new Map());
      const ym = tree.get(year)!;
      if (!ym.has(monthKey)) ym.set(monthKey, new Map());
      const dm = ym.get(monthKey)!;
      if (!dm.has(day)) dm.set(day, []);

      dm.get(day)!.push({
        book: stat.book,
        totalSeconds: stat.totalSeconds,
        displayMinutes: Math.round(stat.totalSeconds / 60),
        totalPages: stat.totalPages,
        firstStart: stat.firstStart,
        lastEnd: stat.lastEnd
      });
    }
    return tree;
  }

  private createDayCell(type: CellType, year: number, monthIndex: number, dayNum: number, tree: Map<any, any>): CalendarCell {
    const d = new Date(year, monthIndex, dayNum);
    const y = d.getFullYear();
    const mKey = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const day = d.getDate();

    let books: BookStat[] = [];
    if (tree.has(y) && tree.get(y).has(mKey) && tree.get(y).get(mKey).has(day)) {
      books = tree.get(y).get(mKey).get(day);
      books.sort((a, b) => b.totalSeconds - a.totalSeconds);
    }

    const totalSec = books.reduce((acc, b) => acc + b.totalSeconds, 0);

    return {
      type,
      dayNum,
      books,
      totalMinutes: Math.round(totalSec / 60),
      intensity: 0,
      localIntensity: 0
    };
  }

  private createWeekCell(currentDate: Date, partialWeekSec: number, totalsMap: Map<number, number>): CalendarCell {
    const mondayTs = this.getMonday(currentDate).getTime();
    const globalTotalSec = totalsMap.get(mondayTs) || 0;

    const partialMins = Math.round(partialWeekSec / 60);
    const globalMins = Math.round(globalTotalSec / 60);
    const isSplit = globalTotalSec > partialWeekSec + 60;

    return {
      type: 'week-total',
      totalMinutes: partialMins,
      fullWeekMinutes: isSplit ? globalMins : undefined,
      intensity: 0,
      fullWeekIntensity: 0
    };
  }

  private applyLocalIntensity(cells: CalendarCell[], maxDay: number, maxWeek: number) {
    cells.forEach(cell => {
      if (cell.type === 'day' || cell.type === 'padding-day') {
        cell.localIntensity = this.calculateRelativeIntensity(cell.totalMinutes || 0, maxDay);
      } else if (cell.type === 'week-total') {
        const val = cell.fullWeekMinutes ?? cell.totalMinutes ?? 0;
        cell.localIntensity = this.calculateRelativeIntensity(val, maxWeek);
      }
    });
  }

  private applyGlobalIntensities(days: CalendarCell[], weeks: CalendarCell[], months: MonthData[]) {
    const maxDay = days.length ? Math.max(...days.map(d => d.totalMinutes || 0)) : 0;
    const maxWeek = weeks.length ? Math.max(...weeks.map(w => w.fullWeekMinutes ?? w.totalMinutes ?? 0)) : 0;
    const maxMonth = months.length ? Math.max(...months.map(m => m.totalMinutes)) : 0;

    days.forEach(d => d.intensity = this.calculateRelativeIntensity(d.totalMinutes || 0, maxDay));

    weeks.forEach(w => {
      const val = w.fullWeekMinutes ?? w.totalMinutes ?? 0;
      w.intensity = this.calculateRelativeIntensity(val, maxWeek);
      if (w.fullWeekMinutes !== undefined) {
        w.fullWeekIntensity = this.calculateRelativeIntensity(w.fullWeekMinutes, maxWeek);
      }
    });

    months.forEach(m => m.intensity = this.calculateRelativeIntensity(m.totalMinutes, maxMonth));
  }
}
