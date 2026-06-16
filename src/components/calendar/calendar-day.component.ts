import { Component, input, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarCell, BookStat } from '../../services/calendar-processor.service';
import { GaugeBarComponent } from '../gauge-bar/gauge-bar.component';
import { AppStateService } from '../../services/app-state.service';
import { ChartTooltipService } from '../../services/chart-tooltip.service';
import { FormatService } from '../../services/format.service';
import { DurationMinPipe, DurationHourPipe } from '../../pipes/app-format.pipes';

@Component({
  selector: 'app-calendar-day',
  imports: [CommonModule, GaugeBarComponent, DurationMinPipe, DurationHourPipe],
  templateUrl: './calendar-day.component.html',
  styleUrls: ['./calendar-day.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarDayComponent {
  cell = input.required<CalendarCell>();
  state = inject(AppStateService);
  tooltipService = inject(ChartTooltipService);
  formatService = inject(FormatService);

  hasBooks = computed(() => {
    const c = this.cell();
    return c.books && c.books.length > 0;
  });

  shouldShowMinutes = computed(() => {
    const c = this.cell();
    return c.totalMinutes !== undefined && (c.totalMinutes > 0 || (c.books && c.books.length > 0));
  });

  onBookHover(event: MouseEvent, bookStat: BookStat) {
    const start = this.formatService.formatTime(bookStat.firstStart);
    const end = this.formatService.formatTime(bookStat.lastEnd);

    const timeRange = `${start} - ${end}`;

    const html = this.tooltipService.generateHtml(bookStat.book.title, bookStat.book.color, [
      { label: 'Time', value: timeRange, type: 'text' },
      { label: 'Duration', value: bookStat.totalSeconds, type: 'duration' },
      { label: 'Pages', value: bookStat.totalPages, type: 'pages' }
    ]);

    this.tooltipService.show(event, html);
  }

  onBookLeave() {
    this.tooltipService.hide();
  }
}
