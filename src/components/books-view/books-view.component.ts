import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { BookTableComponent } from '../book-table/book-table.component';

@Component({
  selector: 'app-books-view',
  imports: [CommonModule, BookTableComponent],
  templateUrl: './books-view.component.html',
  styleUrls: ['./books-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BooksViewComponent {
  state = inject(AppStateService);

  allBooks = computed(() => {
    const s = this.state.aggregatedStats();
    if (!s) return [];
    return s.books;
  });
}
