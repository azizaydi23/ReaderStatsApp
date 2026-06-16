import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartDataPoint, ChartSegment } from '../../services/stats-processor.service';
import { BarChartComponent } from '../charts/bar-chart.component';
import { ComboChartComponent } from '../charts/combo-chart.component';
import { AppStateService } from '../../services/app-state.service';
import { DurationHourPipe } from '../../pipes/app-format.pipes';

@Component({
  selector: 'app-stats-view',
  imports: [
    CommonModule,
    BarChartComponent,
    ComboChartComponent,
    DurationHourPipe
  ],
  templateUrl: './stats-view.component.html',
  styleUrls: ['./stats-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsViewComponent {
  state = inject(AppStateService);

  highlightedBookId = signal<number | null>(null);

  stats = computed(() => this.state.aggregatedStats());

  onBarClick(point: ChartDataPoint) {
    if (point.date) {
      this.state.navigateToDate(point.date);
    }
  }

  onBookSegmentHover(segment: ChartSegment | null) {
    this.highlightedBookId.set(segment ? segment.bookId : null);
  }
}
