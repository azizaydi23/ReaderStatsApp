import { Injectable, inject } from '@angular/core';
import { DatabaseService, ProtoDailyStat } from './database.service';
import { StorageService } from './storage.service';
import { AppStateService } from './app-state.service';
import { CalendarProcessorService } from './calendar-processor.service';
import { StatsProcessorService } from './stats-processor.service';
import { DailyReadingStat, Book } from '../models/domain';
import { getExampleData } from '../data/example-data';
import { stringToColor } from '../utils/color.utils';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private dbService = inject(DatabaseService);
  private storageService = inject(StorageService);
  private state = inject(AppStateService);
  private calendarProcessor = inject(CalendarProcessorService);
  private statsProcessor = inject(StatsProcessorService);

  loadInitialData(): void {
    const savedData = this.storageService.loadData();

    if (savedData && savedData.stats.length > 0) {
      console.log('Found saved stats, loading directly.');
      this.processAndSetData(savedData.stats);
    } else {
      console.log('No saved stats found, prompting upload.');
      this.state.setUploadModalVisibility(true);
    }
  }

  async loadDataFromFile(file: File): Promise<void> {
    this.state.setError(null);
    try {
      await this.dbService.loadDatabaseFromFile(file);

      const rawStats = this.dbService.getDailyStats();
      if (rawStats.length > 0) {
        const stats = this.buildDomainModels(rawStats);
        this.storageService.saveData(stats);
        this.processAndSetData(stats);
      }
    } catch (e: any) {
      console.error('Data loading failed', e);
      this.state.setError(e.message);
    }
  }

  loadExampleData(): void {
    this.state.setError(null);
    const rawStats = getExampleData();
    const stats = this.buildDomainModels(rawStats);
    this.processAndSetData(stats);
  }

  private processAndSetData(stats: DailyReadingStat[]): void {
    const processedStats = this.statsProcessor.process(stats);
    const processedCalendar = this.calendarProcessor.process(stats);
    this.state.setData(stats, processedCalendar, processedStats);
    this.state.setUploadModalVisibility(false);
  }

  private buildDomainModels(rawStats: ProtoDailyStat[]): DailyReadingStat[] {
    const stats: DailyReadingStat[] = [];
    const bookIdentityMap = new Map<number, Book>();

    for (const raw of rawStats) {
      const [y, m, d] = raw.dateStr.split('-').map(Number);
      const bookId = raw.bookId;

      let book = bookIdentityMap.get(bookId);
      if (!book) {
        book = {
          id: bookId,
          title: raw.bookTitle,
          color: stringToColor(raw.bookTitle),

          totalSeconds: 0,
          totalPages: 0,
          firstRead: new Date(),
          lastRead: new Date(),
          activeDays: 0,
          spanDays: 0,
          speed: 0
        };
        bookIdentityMap.set(bookId, book);
      }

      stats.push({
        book: book,
        totalSeconds: raw.totalSeconds,
        totalPages: raw.totalPages,
        firstStart: new Date(raw.firstStartTs * 1000),
        lastEnd: new Date(raw.lastEndTs * 1000),
        date: new Date(y, m - 1, d)
      });
    }
    return stats;
  }
}
