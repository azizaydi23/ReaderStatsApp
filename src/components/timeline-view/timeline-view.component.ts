import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { GanttChartComponent } from '../charts/gantt-chart.component';

@Component({
  selector: 'app-timeline-view',
  imports: [CommonModule, GanttChartComponent],
  templateUrl: './timeline-view.component.html',
  styleUrls: ['./timeline-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineViewComponent {
  state = inject(AppStateService);

  allBooks = computed(() => {
    const s = this.state.aggregatedStats();
    if (!s) return [];
    return s.books;
  });

  rawStats = computed(() => {
    return this.state.rawStats();
  });
}
