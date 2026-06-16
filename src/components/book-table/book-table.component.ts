import { Component, input, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Book } from '../../models/domain';
import { AppStateService } from '../../services/app-state.service';
import { GaugeBarComponent } from '../gauge-bar/gauge-bar.component';
import { AppDatePipe, AppPagesPipe, DurationHourPipe, AppSpeedPipe } from '../../pipes/app-format.pipes';

type SortDirection = 'asc' | 'desc';
type SortColumn = 'title' | keyof Book;

@Component({
  selector: 'app-book-table',
  imports: [CommonModule, GaugeBarComponent, AppDatePipe, AppPagesPipe, DurationHourPipe, AppSpeedPipe],
  templateUrl: './book-table.component.html',
  styleUrls: ['./book-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookTableComponent {
  books = input.required<Book[]>();

  private state = inject(AppStateService);

  searchTerm = signal<string>('');
  sortColumn = signal<SortColumn>('totalSeconds');
  sortDirection = signal<SortDirection>('desc');

  filteredBooks = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.books();
    if (!term) return list;
    return list.filter(b => b.title.toLowerCase().includes(term));
  });

  sortedBooks = computed(() => {
    const list = [...this.filteredBooks()];
    const col = this.sortColumn();
    const asc = this.sortDirection() === 'asc';

    const getValue = (item: Book) => {
      return item[col];
    };

    return list.sort((a, b) => {
      const valA = getValue(a);
      const valB = getValue(b);

      if (valA === valB) return 0;
      return (valA < valB ? -1 : 1) * (asc ? 1 : -1);
    });
  });

  maxDuration = computed(() => {
    const list = this.filteredBooks();
    if (!list.length) return 0;
    return Math.max(...list.map(b => b.totalSeconds));
  });

  updateSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  toggleSort(col: SortColumn) {
    if (this.sortColumn() === col) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      if (col === 'title') {
        this.sortDirection.set('asc');
      } else {
        this.sortDirection.set('desc');
      }
    }
  }

  onDateClick(date: Date) {
    this.state.navigateToDate(date);
  }
}
