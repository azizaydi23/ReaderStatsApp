import { Component, ElementRef, input, effect, viewChild, inject, DestroyRef, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import * as d3 from 'd3';
import { ChartDataPoint } from '../../services/stats-processor.service';
import { ChartTooltipService } from '../../services/chart-tooltip.service';

@Component({
  selector: 'app-combo-chart',
  templateUrl: './combo-chart.component.html',
  styleUrls: ['./combo-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComboChartComponent {
  data = input.required<ChartDataPoint[]>();
  barColor = input<string>('#94a3b8');
  lineColor = input<string>('#10b981');

  chartContainer = viewChild.required<ElementRef<HTMLElement>>('chartContainer');

  private tooltipService = inject(ChartTooltipService);
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
      this.barColor();
      this.lineColor();
      const element = this.chartContainer().nativeElement;
      this.renderChart(element);
    });
  }

  private renderChart(element: HTMLElement) {
    d3.select(element).selectAll('*').remove();

    const data = this.data();
    if (!data.length) return;

    const margin = { top: 20, right: 50, bottom: 40, left: 50 };
    const width = element.clientWidth - margin.left - margin.right;
    const height = element.clientHeight - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('display', 'block')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    svg.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5));

    const maxDaily = d3.max(data, d => d.secondaryValue || 0) || 0;
    const y1 = d3.scaleLinear()
      .domain([0, maxDaily * 1.2])
      .range([height, 0]);

    svg.append('g')
      .attr('class', 'axis y-axis-left')
      .call(d3.axisLeft(y1).ticks(5))
      .style('color', this.barColor());

    svg.append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('y', -35)
      .attr('x', -height / 2)
      .style('fill', this.barColor())
      .text('Daily Hours');

    const maxTotal = d3.max(data, d => d.value) || 0;
    const y2 = d3.scaleLinear()
      .domain([0, maxTotal * 1.05])
      .range([height, 0]);

    svg.append('g')
      .attr('class', 'axis y-axis-right')
      .attr('transform', `translate(${width}, 0)`)
      .call(d3.axisRight(y2).ticks(5))
      .style('color', this.lineColor());

    svg.append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('y', width + 35)
      .attr('x', -height / 2)
      .style('fill', this.lineColor())
      .text('Cumulative Hours');

    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisRight(y2).tickSize(-width).tickFormat(() => ''));

    const days = (x.domain()[1].getTime() - x.domain()[0].getTime()) / (1000 * 60 * 60 * 24);
    let barWidth = width / days;
    barWidth = Math.max(1, Math.min(barWidth - 1, 20));

    svg.selectAll('rect')
      .data(data)
      .join('rect')
      .attr('class', 'combo-bar')
      .attr('x', d => x(d.date!) - barWidth / 2)
      .attr('y', d => y1(d.secondaryValue || 0))
      .attr('width', barWidth)
      .attr('height', d => height - y1(d.secondaryValue || 0))
      .attr('fill', this.barColor());

    const area = d3.area<ChartDataPoint>()
      .x(d => x(d.date!))
      .y0(height)
      .y1(d => y2(d.value));

    svg.append('path')
      .datum(data)
      .attr('class', 'chart-area')
      .attr('fill', this.lineColor())
      .attr('d', area);

    const line = d3.line<ChartDataPoint>()
      .x(d => x(d.date!))
      .y(d => y2(d.value));

    svg.append('path')
      .datum(data)
      .attr('class', 'chart-line')
      .attr('stroke', this.lineColor())
      .attr('d', line);

    const bisect = d3.bisector((d: ChartDataPoint) => d.date).left;

    const hoverLine = svg.append('line')
      .attr('class', 'hover-line')
      .attr('y1', 0)
      .attr('y2', height);

    const focusCircle = svg.append('circle')
      .style('display', 'none')
      .attr('r', 4)
      .attr('fill', this.lineColor())
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    svg.append('rect')
      .attr('class', 'hover-overlay')
      .attr('width', width)
      .attr('height', height)
      .on('pointerenter', () => {
        hoverLine.classed('active', true);
        focusCircle.style('display', null);
      })
      .on('pointerleave', () => {
        hoverLine.classed('active', false);
        focusCircle.style('display', 'none');
        this.tooltipService.hide();
      })
      .on('pointermove', (event) => {
        const [mx] = d3.pointer(event, element);
        const chartX = mx - margin.left;

        if (chartX < 0 || chartX > width) return;

        const x0 = x.invert(chartX);
        const i = bisect(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        let d = d0;
        if (d1 && d0) {
          d = x0.getTime() - d0.date!.getTime() > d1.date!.getTime() - x0.getTime() ? d1 : d0;
        } else if (d1) {
          d = d1;
        }

        if (!d) return;

        const xPos = x(d.date!);
        const yPos = y2(d.value);

        hoverLine.attr('x1', xPos).attr('x2', xPos);
        focusCircle.attr('cx', xPos).attr('cy', yPos);

        const html = this.tooltipService.generateHtml(d.label, this.lineColor(), [
          { label: 'Daily', value: (d.secondaryValue || 0) * 3600, type: 'duration' },
          { label: 'Total', value: d.value * 3600, type: 'duration' },
          { label: 'Pages', value: d.pages || 0, type: 'pages' }
        ]);

        this.tooltipService.show(event, html);
      });
  }
}
