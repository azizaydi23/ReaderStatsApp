import { Component, ElementRef, input, output, effect, viewChild, inject, DestroyRef, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import * as d3 from 'd3';
import { ChartDataPoint, ChartSegment } from '../../services/stats-processor.service';
import { ChartTooltipService } from '../../services/chart-tooltip.service';
import { FormatService } from '../../services/format.service';

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarChartComponent {
  data = input.required<ChartDataPoint[]>();
  color = input<string>('#3b82f6');
  showTotalLabel = input<boolean>(false);
  highlightedBookId = input<number | null>(null);
  orientation = input<'horizontal' | 'vertical'>('horizontal');

  barClick = output<ChartDataPoint>();
  segmentHover = output<ChartSegment | null>();

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
      this.color();
      this.orientation();
      const element = this.chartContainer().nativeElement;
      this.renderChart(element);
    });

    effect(() => {
      const id = this.highlightedBookId();
      const svg = d3.select(this.chartContainer()?.nativeElement).select('svg');
      if (!svg.empty()) {
        svg.selectAll('.bar-segment')
          .classed('dimmed', d => id !== null && id !== (d as ChartSegment).bookId);
      }
    });
  }

  private renderChart(element: HTMLElement) {
    d3.select(element).selectAll('*').remove();
    const data = this.data();
    if (!data.length) return;

    if (this.orientation() === 'vertical') {
      this.renderVerticalChart(element);
    } else {
      this.renderHorizontalChart(element);
    }
  }

  private renderHorizontalChart(element: HTMLElement) {
    const data = this.data();
    const wrapper = element.parentElement as HTMLElement;
    wrapper.style.height = '';

    const margin = { top: this.showTotalLabel() ? 30 : 20, right: 20, bottom: 40, left: 50 };
    const width = element.clientWidth - margin.left - margin.right;
    const height = element.clientHeight - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const svg = this.createSvg(element, width, height, margin);

    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.label))
      .padding(0.2);

    svg.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('class', 'axis-text x-axis-text')
      .attr('transform', 'translate(-10,0)rotate(-45)');

    const yMax = d3.max(data, d => d.value) || 0;
    const y = d3.scaleLinear()
      .domain([0, yMax * (this.showTotalLabel() ? 1.15 : 1)])
      .range([height, 0]);

    svg.append('g').attr('class', 'axis y-axis').call(d3.axisLeft(y).ticks(5));
    svg.append('g').attr('class', 'grid').call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''));

    const groups = svg.selectAll('.bar-group').data(data).join('g')
      .attr('class', 'bar-group')
      .attr('transform', d => `translate(${x(d.label)!}, 0)`);

    this.drawBars(groups, x, y, width, height);

    if (this.showTotalLabel()) {
      groups.append('text')
        .attr('class', 'bar-total-label')
        .attr('x', x.bandwidth() / 2)
        .attr('y', d => y(d.value) - 6)
        .attr('text-anchor', 'middle')
        .text(d => this.formatService.formatHour(d.value * 3600));
    }
  }

  private renderVerticalChart(element: HTMLElement) {
    const data = this.data();
    const margin = { top: 10, right: 80, bottom: 30, left: 120 };

    const barHeight = 16;
    const barPadding = 4;
    const dynamicHeight = data.length * (barHeight + barPadding) + margin.top + margin.bottom;

    const wrapper = element.parentElement as HTMLElement;
    wrapper.style.height = `${dynamicHeight}px`;

    const height = dynamicHeight - margin.top - margin.bottom;
    const width = element.clientWidth - margin.left - margin.right;

    if (width <= 0 || height <= 0) return;

    const svg = this.createSvg(element, width, height, margin);

    const xMax = d3.max(data, d => d.value) || 0;
    const x = d3.scaleLinear()
      .domain([0, xMax * 1.05])
      .range([0, width]);

    svg.append('g').attr('class', 'axis x-axis').attr('transform', `translate(0, ${height})`).call(d3.axisBottom(x).ticks(5));

    const y = d3.scaleBand()
      .range([0, height])
      .domain(data.map(d => d.label).reverse())
      .padding(0.3);

    svg.append('g').attr('class', 'axis y-axis').call(d3.axisLeft(y));
    svg.append('g').attr('class', 'grid').call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''));

    const groups = svg.selectAll('.bar-group').data(data).join('g')
      .attr('class', 'bar-group')
      .attr('transform', d => `translate(0, ${y(d.label)!})`);

    this.drawBars(groups, x, y, width, height);

    if (this.showTotalLabel()) {
      groups.append('text')
        .attr('class', 'bar-total-label')
        .attr('x', d => x(d.value) + 6)
        .attr('y', y.bandwidth() / 2)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .text(d => this.formatService.formatHour(d.value * 3600));
    }
  }

  private createSvg(element: HTMLElement, width: number, height: number, margin: any) {
    return d3.select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('display', 'block')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
  }

  private drawBars(groups: any, x: any, y: any, width: number, height: number) {
    const isHorizontal = this.orientation() === 'horizontal';

    groups.each((d: ChartDataPoint, i: number, nodes: any[]) => {
      const g = d3.select(nodes[i]);

      if (d.segments && d.segments.length > 0) {
        if (isHorizontal) {
          let currentY = 0;
          d.segments.forEach(seg => {
            const nextY = currentY + seg.value;
            const yPos = y(nextY);
            const barHeight = y(currentY) - y(nextY);

            if (barHeight > 0) {
              this.appendSegmentRect(g, seg, 0, yPos, x.bandwidth(), barHeight);
            }
            currentY = nextY;
          });
        } else {
          let currentX = 0;
          d.segments.forEach(seg => {
            const nextX = currentX + seg.value;
            const xPos = x(currentX);
            const barWidth = x(nextX) - x(currentX);
            if (barWidth > 0) {
              this.appendSegmentRect(g, seg, xPos, 0, barWidth, y.bandwidth());
            }
            currentX = nextX;
          });
        }

      } else {
        const rect = g.append('rect')
          .attr('x', isHorizontal ? 0 : 0)
          .attr('y', isHorizontal ? y(d.value) : 0)
          .attr('width', isHorizontal ? x.bandwidth() : x(d.value))
          .attr('height', isHorizontal ? height - y(d.value) : y.bandwidth())
          .attr('fill', this.color())
          .attr('rx', 4);

        this.attachNonSegmentedTooltip(rect, d);
      }
    });
  }

  private appendSegmentRect(g: any, seg: ChartSegment, x: number, y: number, width: number, height: number) {
    g.append('rect')
      .datum(seg)
      .attr('class', 'bar-segment')
      .attr('x', x)
      .attr('width', width)
      .attr('y', y)
      .attr('height', height)
      .attr('fill', seg.color)
      .attr('rx', 1)
      .on('mouseover', (event: MouseEvent, s: ChartSegment) => {
        this.segmentHover.emit(s);
        const html = this.tooltipService.generateHtml(s.label, s.color, [
          { label: 'Duration', value: s.value * 3600, type: 'duration' },
          { label: 'Pages', value: s.pages || 0, type: 'pages' }
        ]);
        this.tooltipService.show(event, html);
      })
      .on('mousemove', (event: MouseEvent) => this.tooltipService.show(event, this.tooltipService.state().content))
      .on('mouseout', () => {
        this.segmentHover.emit(null);
        this.tooltipService.hide();
      })
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        this.barClick.emit(g.datum());
      });
  }

  private attachNonSegmentedTooltip(selection: any, d: ChartDataPoint) {
    selection
      .on('mouseover', (event: MouseEvent) => {
        d3.select(event.currentTarget as Element).classed('bar-hover', true);
        const totalPages = d.segments ? d.segments.reduce((acc, s) => acc + (s.pages || 0), 0) : 0;
        const items: any[] = [{ label: 'Total Duration', value: d.value * 3600, type: 'duration' }];
        if (totalPages > 0) {
          items.push({ label: 'Total Pages', value: totalPages, type: 'pages' });
        }
        const html = this.tooltipService.generateHtml(d.label, this.color(), items);
        this.tooltipService.show(event, html);
      })
      .on('mousemove', (event: MouseEvent) => this.tooltipService.show(event, this.tooltipService.state().content))
      .on('mouseout', (event: MouseEvent) => {
        d3.select(event.currentTarget as Element).classed('bar-hover', false);
        this.tooltipService.hide();
      })
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        this.barClick.emit(d);
      });
  }
}
