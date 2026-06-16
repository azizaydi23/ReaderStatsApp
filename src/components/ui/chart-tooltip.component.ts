import { Component, inject, computed, ElementRef, viewChild, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { ChartTooltipService } from '../../services/chart-tooltip.service';

@Component({
  selector: 'app-chart-tooltip',
  imports: [CommonModule],
  templateUrl: './chart-tooltip.component.html',
  styleUrls: ['./chart-tooltip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartTooltipComponent {
  tooltipService = inject(ChartTooltipService);
  private sanitizer = inject(DomSanitizer);

  tooltipRef = viewChild.required<ElementRef<HTMLElement>>('tooltipRef');

  pos = signal({ x: -1000, y: -1000 });

  constructor() {
    effect(() => {
      const state = this.tooltipService.state();
      const el = this.tooltipRef().nativeElement;

      if (state.visible && el) {
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const padding = 12;

        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;

        let x = state.mouseX + padding;
        let y = state.mouseY + padding;

        if (x + width > viewportWidth) {
          x = state.mouseX - width - padding;
        }

        if (y + height > viewportHeight) {
          y = state.mouseY - height - padding;
        }

        x = Math.max(4, x);
        y = Math.max(4, y);

        this.pos.set({ x, y });
      }
    });
  }

  safeContent = computed(() => {
    const content = this.tooltipService.state().content;
    return this.sanitizer.bypassSecurityTrustHtml(content);
  });
}
