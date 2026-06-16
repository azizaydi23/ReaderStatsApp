import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { CalendarHeatmapComponent } from '../charts/calendar-heatmap.component';

@Component({
  selector: 'app-heatmap-view',
  imports: [CommonModule, CalendarHeatmapComponent],
  templateUrl: './heatmap-view.component.html',
  styleUrls: ['./heatmap-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeatmapViewComponent {
  state = inject(AppStateService);

  dailyHistory = computed(() => {
    const stats = this.state.aggregatedStats();
    return stats ? stats.dailyHistory : [];
  });

  onDateClick(date: Date) {
    this.state.navigateToDate(date);
  }
}
