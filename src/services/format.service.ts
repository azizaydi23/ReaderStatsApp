import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class FormatService {

  constructor(@Inject(LOCALE_ID) private locale: string) { }

  formatDate(date: Date | string | number): string {
    return formatDate(date, 'MMM d, y', this.locale);
  }

  formatDateShort(date: Date | string | number): string {
    return formatDate(date, 'MMM d', this.locale);
  }

  formatMonth(date: Date | string | number): string {
    return formatDate(date, 'MMM yy', this.locale);
  }

  formatMonthLong(date: Date | string | number): string {
    return formatDate(date, 'MMMM y', this.locale);
  }

  formatTime(date: Date | string | number): string {
    return formatDate(date, 'HH:mm', this.locale);
  }

  private formatNumStr(val: number, digits: string): string {
    let minInt = 1, minFrac = 0, maxFrac = 0;
    const parts = digits.match(/(\d+)\.(\d+)-(\d+)/);
    if (parts) {
      minInt = parseInt(parts[1], 10);
      minFrac = parseInt(parts[2], 10);
      maxFrac = parseInt(parts[3], 10);
    }

    const options: Intl.NumberFormatOptions = {
      minimumIntegerDigits: minInt,
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
      useGrouping: true
    };

    return new Intl.NumberFormat('en-US', options)
      .formatToParts(val)
      .map(part => (part.type === 'group' ? ' ' : part.value))
      .join('');
  }

  formatMin(totalSeconds: number): string {
    const minutes = Math.round(totalSeconds / 60);
    return `${this.formatNumStr(minutes, '1.0-0')}m`;
  }

  formatHour(totalSeconds: number): string {
    const hours = totalSeconds / 3600;
    return `${this.formatNumStr(hours, '1.1-1')}h`;
  }

  formatDurationDetail(totalSeconds: number): string {
    return `${this.formatMin(totalSeconds)} <span style="opacity:0.7; font-weight:400;">(${this.formatHour(totalSeconds)})</span>`;
  }

  formatPages(pages: number): string {
    return `${this.formatNumStr(pages, '1.0-0')} p`;
  }

  formatSpeed(pagesPerMinute: number): string {
    return this.formatNumStr(pagesPerMinute, '1.1-1');
  }

  formatPercent(value: number): string {
    return `${this.formatNumStr(value * 100, '1.0-0')}%`;
  }

  formatNumber(val: number, digits: string = '1.0-0'): string {
    return this.formatNumStr(val, digits);
  }
}
