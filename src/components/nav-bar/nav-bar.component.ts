import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService, AppTab } from '../../services/app-state.service';

@Component({
  selector: 'app-nav-bar',
  imports: [CommonModule],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavBarComponent {
  state = inject(AppStateService);

  onTabClick(tab: AppTab) {
    this.state.setTab(tab);
  }

  onReset() {
    this.state.setUploadModalVisibility(true);
  }
}
