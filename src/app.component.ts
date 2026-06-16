import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from './services/app-state.service';
import { DataService } from './services/data.service';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { StatsViewComponent } from './components/stats-view/stats-view.component';
import { CalendarViewComponent } from './components/calendar/calendar-view.component';
import { BooksViewComponent } from './components/books-view/books-view.component';
import { ChartTooltipComponent } from './components/ui/chart-tooltip.component';
import { TimelineViewComponent } from './components/timeline-view/timeline-view.component';
import { HeatmapViewComponent } from './components/heatmap-view/heatmap-view.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FileUploadComponent,
    NavBarComponent,
    StatsViewComponent,
    CalendarViewComponent,
    BooksViewComponent,
    ChartTooltipComponent,
    TimelineViewComponent,
    HeatmapViewComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  state = inject(AppStateService);
  private dataService = inject(DataService);

  ngOnInit() {
    this.dataService.loadInitialData();
  }

  onFileSelected(file: File) {
    this.dataService.loadDataFromFile(file);
  }

  onLoadExample() {
    this.dataService.loadExampleData();
  }

  onCloseUploadModal() {
    if (this.state.hasData()) {
      this.state.setUploadModalVisibility(false);
    }
  }
}
