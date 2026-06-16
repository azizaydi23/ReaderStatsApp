import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { BookTableComponent } from '../book-table/book-table.component';
import { CalendarGridComponent } from './calendar-grid.component';

@Component({
  selector: 'app-calendar-view',
  imports: [CommonModule, CalendarGridComponent, BookTableComponent],
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarViewComponent {
  state = inject(AppStateService);

  onNavigate(delta: number) {
    this.state.navigate(delta);
  }

  onJumpStart() {
    this.state.jumpToStart();
  }

  onJumpEnd() {
    this.state.jumpToEnd();
  }

  onYearChange(event: Event) {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.state.jumpToYear(val);
  }

  onMonthChange(event: Event) {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.state.jumpToMonth(val);
  }

  onToggleGlobal(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.state.toggleGlobalStats(checked);
  }

  onBack() {
    this.state.goBack();
  }
}
