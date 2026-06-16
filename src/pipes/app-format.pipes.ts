import { Pipe, PipeTransform, inject } from '@angular/core';
import { FormatService } from '../services/format.service';

@Pipe({
  name: 'appDate',
  standalone: true
})
export class AppDatePipe implements PipeTransform {
  private s = inject(FormatService);
  transform(value: Date | string | number): string {
    return this.s.formatDate(value);
  }
}

@Pipe({
  name: 'durationMin',
  standalone: true
})
export class DurationMinPipe implements PipeTransform {
  private s = inject(FormatService);
  transform(value: number): string {
    return this.s.formatMin(value);
  }
}

@Pipe({
  name: 'durationHour',
  standalone: true
})
export class DurationHourPipe implements PipeTransform {
  private s = inject(FormatService);
  transform(value: number): string {
    return this.s.formatHour(value);
  }
}

@Pipe({
  name: 'appPages',
  standalone: true
})
export class AppPagesPipe implements PipeTransform {
  private s = inject(FormatService);
  transform(value: number): string {
    return this.s.formatPages(value);
  }
}

@Pipe({
  name: 'appSpeed',
  standalone: true
})
export class AppSpeedPipe implements PipeTransform {
  private s = inject(FormatService);
  transform(value: number): string {
    return this.s.formatSpeed(value);
  }
}

@Pipe({
  name: 'appPercent',
  standalone: true
})
export class AppPercentPipe implements PipeTransform {
  private s = inject(FormatService);
  transform(value: number): string {
    return this.s.formatPercent(value);
  }
}
