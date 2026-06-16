import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-gauge-bar',
  templateUrl: './gauge-bar.component.html',
  styleUrls: ['./gauge-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GaugeBarComponent {
  localRel = input<number>(0);
  globalRel = input<number>(0);

  localLabel = input<string>('Local');
  globalLabel = input<string>('Global');

  showGlobal = input<boolean>(false);

  localPercent = computed(() => Math.min(100, Math.max(0, this.localRel() * 100)));
  globalPercent = computed(() => Math.min(100, Math.max(0, this.globalRel() * 100)));

  activePercent = computed(() => {
    const val = this.showGlobal() ? this.globalPercent() : this.localPercent();
    return val;
  });

  activeColor = computed(() => {
    const val = this.showGlobal() ? this.globalRel() : this.localRel();
    return this.getColor(val);
  });

  tooltip = computed(() => {
    const l = Math.round(this.localPercent());
    const g = Math.round(this.globalPercent());
    return `${this.localLabel()}: ${l}%\n${this.globalLabel()}: ${g}%`;
  });

  private getColor(ratio: number): string {

    const r = Math.max(0, Math.min(1, ratio));

    const hue = Math.floor(r * 120);
    return `hsl(${hue}, 85%, 45%)`;
  }
}
