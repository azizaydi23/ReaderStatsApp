import { Component, ElementRef, input, output, effect, viewChild, inject, DestroyRef, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { ChartDataPoint } from '../../services/stats-processor.service';
import { ChartTooltipService } from '../../services/chart-tooltip.service';
import { FormatService } from '../../services/format.service';

@Component({
  selector: 'app-calendar-heatmap',
  imports: [CommonModule],
  templateUrl: './calendar-heatmap.component.html',
  styleUrls: ['./calendar-heatmap.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarHeatmapComponent {
  data = input.required<ChartDataPoint[]>();
  cellClick = output<Date>();

  chartContainer = viewChild.required<ElementRef<HTMLElement>>('chartContainer');
  private tooltipService = inject(ChartTooltipService);
  private formatService = inject(FormatService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const element = this.chartContainer().nativeElement;
      const observer = new ResizeObserver(() => {
        window.requestAnimationFrame(() => this.renderChart(element));
      });
      observer.observe(element);

      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        this.tooltipService.hide();
      });
    });

    effect(() => {
      this.data();
      const element = this.chartContainer().nativeElement;
      this.renderChart(element);
    });
  }

  private renderChart(element: HTMLElement) {
    d3.select(element).selectAll('svg').remove();

    const rawData = this.data();
    if (!rawData.length) return;

    const dateMap = new Map<string, { val: number, pages: number; }>();
    const validYears = new Set<number>();

    rawData.forEach(d => {
      if (d.date && !isNaN(d.date.getTime())) {
        const key = d3.timeFormat('%Y-%m-%d')(d.date);
        dateMap.set(key, {
          val: d.secondaryValue || 0,
          pages: d.pages || 0
        });
        validYears.add(d.date.getFullYear());
      }
    });

    const years = Array.from(validYears).sort((a, b) => b - a);
    if (years.length === 0) return;

    const cellSize = 11;
    const cellGap = 3;
    const monthShift = 5;
    const leftMargin = 30;
    const topMargin = 30;
    const monthLabelOffset = 11;
    const daysHeight = 7 * (cellSize + cellGap);
    const yearLabelHeight = 20;
    const blockHeight = daysHeight + yearLabelHeight + 10;

    const estWidth = leftMargin + (53 * (cellSize + cellGap)) + (11 * monthShift) + 50;
    const width = Math.max(element.clientWidth, estWidth);

    if (width <= 0) return;

    const totalHeight = years.length * blockHeight + topMargin;

    const maxValue = d3.max(rawData, d => d.secondaryValue || 0) || 1;

    const activeColors = [
      '#bef264', '#84cc16', '#22c55e', '#15803d'
    ];

    const colorScale = d3.scaleQuantile<string>()
      .domain([0.1, maxValue])
      .range(activeColors);

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width)
      .attr('height', totalHeight)
      .style('display', 'block')
      .append('g')
      .attr('transform', `translate(${leftMargin}, ${topMargin})`);

    const getX = (date: Date, startOfYear: Date) => {
      const weekIndex = d3.timeMonday.count(startOfYear, date);
      const shift = date.getMonth() * monthShift;
      return (weekIndex * (cellSize + cellGap)) + shift;
    };

    years.forEach((year, index) => {
      const yearGroup = svg.append('g')
        .attr('transform', `translate(0, ${index * blockHeight})`);

      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year + 1, 0, 1);
      const daysInYear = d3.timeDays(startOfYear, endOfYear);

      yearGroup.append('text')
        .attr('class', 'hm-year-label')
        .attr('x', -leftMargin)
        .attr('y', -8)
        .text(year);

      const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      weekdays.forEach((d, i) => {
        yearGroup.append('text')
          .attr('class', 'hm-day-label')
          .attr('x', -6)
          .attr('y', i * (cellSize + cellGap) + cellSize - 2)
          .text(d);
      });

      yearGroup.selectAll('rect')
        .data(daysInYear)
        .join('rect')
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('rx', 2)
        .attr('ry', 2)
        .attr('x', d => getX(d, startOfYear))
        .attr('y', d => {
          let day = d.getDay();
          day = day === 0 ? 6 : day - 1;
          return day * (cellSize + cellGap);
        })
        .attr('fill', d => {
          const key = d3.timeFormat('%Y-%m-%d')(d);
          const data = dateMap.get(key) || { val: 0, pages: 0 };
          return data.val === 0 ? '#e2e8f0' : colorScale(data.val);
        })
        .on('click', (event, d) => {
          this.cellClick.emit(d);
        })
        .on('mouseover', (event, d) => {
          const key = d3.timeFormat('%Y-%m-%d')(d);
          const data = dateMap.get(key) || { val: 0, pages: 0 };
          const dateStr = this.formatService.formatDate(d);

          let html: string;
          if (data.val > 0) {
            html = this.tooltipService.generateHtml(dateStr, colorScale(data.val), [
              { label: 'Duration', value: data.val * 3600, type: 'duration' },
              { label: 'Pages', value: data.pages, type: 'pages' }
            ]);
          } else {
            html = this.tooltipService.generateEmptyHtml(dateStr);
          }

          this.tooltipService.show(event, html);
        })
        .on('mouseout', () => {
          this.tooltipService.hide();
        });

      const months = d3.timeMonths(startOfYear, endOfYear);
      yearGroup.selectAll('text.month-label')
        .data(months)
        .join('text')
        .attr('class', 'hm-month-label')
        .attr('x', d => getX(d, startOfYear) + monthLabelOffset)
        .attr('y', -8)
        .text(d3.timeFormat('%b'));
    });
  }
}
