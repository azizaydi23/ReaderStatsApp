import { Injectable, signal, computed } from '@angular/core';
import { YearData } from './calendar-processor.service';
import { AggregatedStats } from './stats-processor.service';
import { DailyReadingStat, Book } from '../models/domain';

export interface ViewState {
  year: number;
  monthIndex: number;
}

export type AppTab = 'calendar' | 'stats' | 'books' | 'timeline' | 'heatmap';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  readonly rawStats = signal<DailyReadingStat[]>([]);
  readonly yearsData = signal<YearData[]>([]);
  readonly aggregatedStats = signal<AggregatedStats | null>(null);

  readonly activeTab = signal<AppTab>('calendar');
  readonly showGlobalStats = signal<boolean>(false);
  readonly showUploadModal = signal<boolean>(false);
  readonly viewState = signal<ViewState | null>(null);
  readonly error = signal<string | null>(null);

  private historyStack: ViewState[] = [];
  readonly canGoBack = signal<boolean>(false);

  readonly hasData = computed(() => this.yearsData().length > 0);

  readonly currentYearData = computed(() => {
    const state = this.viewState();
    const years = this.yearsData();
    if (!state || !years.length) return null;
    return years.find(y => y.year === state.year) || null;
  });

  readonly currentMonthData = computed(() => {
    const yearData = this.currentYearData();
    const state = this.viewState();
    if (!yearData || !state) return null;
    return yearData.months[state.monthIndex] || null;
  });

  readonly currentMonthBooks = computed<Book[]>(() => {
    const state = this.viewState();
    const raw = this.rawStats();
    const globalStats = this.aggregatedStats();

    if (!state || !raw.length || !globalStats) return [];

    const targetYear = state.year;
    const targetMonthIndex = state.monthIndex;

    const monthlyStats = raw.filter(s => {
      return s.date.getFullYear() === targetYear && s.date.getMonth() === targetMonthIndex;
    });

    if (monthlyStats.length === 0) return [];

    const bookMap = new Map<string, { seconds: number, pages: number, activeDays: Set<number>, book: Book; }>();

    for (const s of monthlyStats) {
      const title = s.book.title;
      if (!bookMap.has(title)) {
        bookMap.set(title, { seconds: 0, pages: 0, activeDays: new Set(), book: s.book });
      }
      const entry = bookMap.get(title)!;
      entry.seconds += s.totalSeconds;
      entry.pages += s.totalPages;
      entry.activeDays.add(s.date.getTime());
    }

    const globalBooks = new Map(globalStats.books.map(b => [b.title, b]));

    const results: Book[] = [];

    bookMap.forEach((val, title) => {
      const global = globalBooks.get(title);
      const firstRead = global ? global.firstRead : new Date(targetYear, targetMonthIndex, 1);
      const lastRead = global ? global.lastRead : new Date(targetYear, targetMonthIndex + 1, 0);
      const spanDays = global ? global.spanDays : 1;

      let speed = 0;
      if (val.pages > 0) {
        speed = (val.seconds / 60) / val.pages;
      }

      results.push({
        id: val.book.id,
        title: val.book.title,
        color: val.book.color,
        totalSeconds: val.seconds,
        totalPages: val.pages,
        firstRead: firstRead,
        lastRead: lastRead,
        activeDays: val.activeDays.size,
        spanDays: spanDays,
        speed: speed
      });
    });

    return results.sort((a, b) => b.totalSeconds - a.totalSeconds);
  });

  readonly hasPrev = computed(() => {
    const years = this.yearsData();
    const state = this.viewState();
    if (!years.length || !state) return false;

    const firstYear = years[0];
    if (state.year === firstYear.year && state.monthIndex === 0) return false;
    return true;
  });

  readonly hasNext = computed(() => {
    const years = this.yearsData();
    const state = this.viewState();
    if (!years.length || !state) return false;

    const lastYear = years[years.length - 1];
    if (state.year === lastYear.year && state.monthIndex === 11) return false;
    return true;
  });


  setData(raw: DailyReadingStat[], years: YearData[], stats: AggregatedStats) {
    this.rawStats.set(raw);
    this.yearsData.set(years);
    this.aggregatedStats.set(stats);

    this.historyStack = [];
    this.canGoBack.set(false);

    if (years.length > 0) {
      this._jumpToEndInternal(false);
    }
  }

  setTab(tab: AppTab) {
    this.activeTab.set(tab);
  }

  toggleGlobalStats(val: boolean) {
    this.showGlobalStats.set(val);
  }

  setUploadModalVisibility(visible: boolean) {
    this.showUploadModal.set(visible);
  }

  setError(message: string | null) {
    this.error.set(message);
  }

  private updateView(year: number, monthIndex: number) {
    const current = this.viewState();
    if (current && current.year === year && current.monthIndex === monthIndex) {
      return;
    }
    if (current) {
      this.historyStack.push({ year: current.year, monthIndex: current.monthIndex });
      if (this.historyStack.length > 50) {
        this.historyStack.shift();
      }
      this.canGoBack.set(true);
    }
    this.viewState.set({ year, monthIndex });
  }

  navigate(delta: number) {
    const state = this.viewState();
    const years = this.yearsData();
    if (!state || !years.length) return;

    const currentYearIndex = years.findIndex(y => y.year === state.year);
    if (currentYearIndex === -1) return;

    const newMonthIndex = state.monthIndex + delta;

    if (newMonthIndex >= 0 && newMonthIndex <= 11) {
      this.updateView(state.year, newMonthIndex);
      return;
    }

    if (delta > 0) {
      const nextYearIndex = currentYearIndex + 1;
      if (nextYearIndex < years.length) {
        this.updateView(years[nextYearIndex].year, 0);
      }
    } else {
      const prevYearIndex = currentYearIndex - 1;
      if (prevYearIndex >= 0) {
        this.updateView(years[prevYearIndex].year, 11);
      }
    }
  }

  jumpToYear(year: number) {
    this.updateView(year, 0);
  }

  jumpToMonth(monthIndex: number) {
    const state = this.viewState();
    if (state) {
      this.updateView(state.year, monthIndex);
    }
  }

  jumpToStart() {
    const years = this.yearsData();
    if (!years.length) return;

    const firstYear = years[0];
    let targetMonthIndex = 0;

    for (let i = 0; i < 12; i++) {
      if (firstYear.months[i].totalMinutes > 0) {
        targetMonthIndex = i;
        break;
      }
    }
    this.updateView(firstYear.year, targetMonthIndex);
  }

  jumpToEnd() {
    this._jumpToEndInternal(true);
  }

  private _jumpToEndInternal(recordHistory: boolean) {
    const years = this.yearsData();
    if (!years.length) return;
    const lastYear = years[years.length - 1];

    let targetMonthIndex = 0;
    for (let i = 11; i >= 0; i--) {
      if (lastYear.months[i].totalMinutes > 0) {
        targetMonthIndex = i;
        break;
      }
    }

    if (recordHistory) {
      this.updateView(lastYear.year, targetMonthIndex);
    } else {
      this.viewState.set({ year: lastYear.year, monthIndex: targetMonthIndex });
    }
  }

  navigateToDate(date: Date) {
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const hasYear = this.yearsData().some(y => y.year === year);

    if (hasYear) {
      this.updateView(year, monthIndex);
      this.activeTab.set('calendar');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goBack() {
    if (this.historyStack.length === 0) return;

    const prev = this.historyStack.pop();
    if (prev) {
      this.viewState.set(prev);
      this.canGoBack.set(this.historyStack.length > 0);
    }
  }
}
