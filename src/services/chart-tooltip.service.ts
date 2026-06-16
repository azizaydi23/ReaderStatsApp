import { Injectable, signal, inject } from '@angular/core';
import { FormatService } from './format.service';

export interface TooltipState {
  visible: boolean;
  mouseX: number;
  mouseY: number;
  content: string;
}

export interface TooltipItem {
  label?: string;
  value: number | string;
  type?: 'text' | 'duration' | 'pages';
}

@Injectable({
  providedIn: 'root'
})
export class ChartTooltipService {
  private formatService = inject(FormatService);

  state = signal<TooltipState>({
    visible: false,
    mouseX: 0,
    mouseY: 0,
    content: ''
  });

  show(event: MouseEvent | PointerEvent, content: string) {
    const e = (event as any).sourceEvent || event;
    this.updateState(e.clientX, e.clientY, content);
  }

  hide() {
    this.state.update(s => ({ ...s, visible: false }));
  }

  generateHtml(title: string, color: string, items: TooltipItem[]) {
    const gridItems = items.map(item => {
      let displayValue: string;

      if (item.type === 'duration' && typeof item.value === 'number') {
        displayValue = this.formatService.formatDurationDetail(item.value);
      } else if (item.type === 'pages' && typeof item.value === 'number') {
        displayValue = this.formatService.formatPages(item.value);
      } else {
        displayValue = String(item.value);
      }

      return `
        <span class="tt-label">${item.label || ''}</span>
        <span class="tt-val">${displayValue}</span>
      `;
    }).join('');

    return `
      <div class="tt-header">
        <span class="tt-dot" style="background-color:${color}"></span>
        <span class="tt-title">${title}</span>
      </div>
      <div class="tt-grid">
        ${gridItems}
      </div>
    `;
  }

  generateEmptyHtml(title: string) {
    return `
      <div class="tt-empty-title">${title}</div>
      <div class="tt-empty-sub">No reading activity</div>
    `;
  }

  private updateState(clientX: number, clientY: number, content: string) {
    this.state.set({
      visible: true,
      mouseX: clientX,
      mouseY: clientY,
      content
    });
  }
}
