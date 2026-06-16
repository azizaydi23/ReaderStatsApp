import { Component, input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { GaugeBarComponent } from '../gauge-bar/gauge-bar.component';
import { CalendarDayComponent } from './calendar-day.component';
import { MonthData } from '../../services/calendar-processor.service';
import { DurationMinPipe, DurationHourPipe } from '../../pipes/app-format.pipes';

@Component({
  selector: 'app-calendar-grid',
  imports: [CommonModule, GaugeBarComponent, CalendarDayComponent, DurationMinPipe, DurationHourPipe],
  templateUrl: './calendar-grid.component.html',
  styleUrls: ['./calendar-grid.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarGridComponent {
  month = input.required<MonthData>();
  state = inject(AppStateService);
}
