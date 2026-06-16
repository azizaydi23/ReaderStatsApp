import { Component, ElementRef, input, effect, viewChild, inject, DestroyRef, afterNextRender, computed, ChangeDetectionStrategy } from '@angular/core';
import * as d3 from 'd3';
import { Book } from '../../models/domain';
import { DailyReadingStat } from '../../models/domain';
import { ChartTooltipService } from '../../services/chart-tooltip.service';

@Component({
  selector: 'app-gantt-chart',
  templateUrl: './gantt-chart.component.html',
  styleUrls: ['./gantt-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GanttChartComponent {
  books = input.required<Book[]>();
  dailyStats = input.required<DailyReadingStat[]>();

  chartContainer = viewChild.required<ElementRef<HTMLElement>>('chartContainer');

  private tooltipService = inject(ChartTooltipService);
  private destroyRef = inject(DestroyRef);

  filteredBooks = computed(() => {
    const MIN_SECONDS = 15 * 60;
    return this.books().filter(b => b.totalSeconds >= MIN_SECONDS);
  });

  sortedBooks = computed(() => {
    return [...this.filteredBooks()].sort((a, b) => b.lastRead.getTime() - a.lastRead.getTime());
  });

  statsByBookId = computed(() => {
    const map = new Map<number, DailyReadingStat[]>();
    for (const stat of this.dailyStats()) {
      const bookId = stat.book.id;
      if (!map.has(bookId)) {
        map.set(bookId, []);
      }
      map.get(bookId)!.push(stat);
    }
    return map;
  });

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
      this.sortedBooks();
      this.statsByBookId();
      const element = this.chartContainer()?.nativeElement;
      if (element) {
        this.renderChart(element);
      }
    });
  }

  private renderChart(element: HTMLElement) {
    const books = this.sortedBooks();
    const dailyStatsMap = this.statsByBookId();
    d3.select(element).selectAll('*').remove();

    if (!books.length) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 200 };
    const barHeight = 20;
    const barPadding = 8;

    const height = books.length * (barHeight + barPadding) + margin.top + margin.bottom;
    const width = element.clientWidth - margin.left - margin.right;

    if (width <= 0) return;

    element.style.height = `${height}px`;

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const minDate = d3.min(books, b => b.firstRead);
    const maxDate = d3.max(books, b => b.lastRead);

    if (!minDate || !maxDate) return;

    const x = d3.scaleTime()
      .domain([d3.timeMonth.floor(minDate), d3.timeMonth.ceil(maxDate)])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(books.map(b => b.id.toString()))
      .range([0, books.length * (barHeight + barPadding)])
      .padding(0.1);

    const timeDiff = maxDate.getTime() - minDate.getTime();
    const yearsDiff = timeDiff / (1000 * 3600 * 24 * 365);

    let tickInterval: d3.TimeInterval;
    let tickFormatString: string;

    if (yearsDiff > 3) {
      tickInterval = d3.timeYear.every(1)!;
      tickFormatString = '%Y';
    } else if (yearsDiff > 1) {
      tickInterval = d3.timeMonth.every(3)!;
      tickFormatString = '%b %Y';
    } else if (yearsDiff > 0.5) {
      tickInterval = d3.timeMonth.every(2)!;
      tickFormatString = '%b %Y';
    } else {
      tickInterval = d3.timeMonth.every(1)!;
      tickFormatString = '%b %Y';
    }

    const format = d3.timeFormat(tickFormatString);
    const xAxisGenerator = d3.axisBottom(x)
      .ticks(tickInterval)
      .tickFormat(d => format(d as Date));

    svg.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0, ${books.length * (barHeight + barPadding)})`)
      .call(xAxisGenerator);

    const yAxis = svg.append('g')
      .attr('class', 'axis y-axis')
      .call(d3.axisLeft(y).tickSize(0).tickFormat(id => books.find(b => b.id.toString() === id)?.title ?? ''));

    yAxis.selectAll('.tick text')
      .attr('class', 'y-axis-label')
      .call(selection => this.truncateYAxisLabels(selection, margin.left - 10));

    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${books.length * (barHeight + barPadding)})`)
      .call(d3.axisBottom(x).tickSize(-(books.length * (barHeight + barPadding))).tickFormat(() => ''));

    const bookGroups = svg.selectAll('.book-group')
      .data(books, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'book-group')
      .attr('transform', d => `translate(0, ${y(d.id.toString())!})`);

    bookGroups.append('rect')
      .attr('class', 'gantt-bar')
      .attr('x', d => x(d.firstRead))
      .attr('width', d => Math.max(2, x(d.lastRead) - x(d.firstRead)))
      .attr('height', barHeight)
      .attr('rx', 3)
      .attr('ry', 3)
      .style('fill', d => {
        const c = d3.color(d.color);
        if (c) {
          c.opacity = 0.3;
          return c.toString();
        }
        return d.color;
      });

    bookGroups.each((book, i, nodes) => {
      const group = d3.select(nodes[i]);
      const bookStats = dailyStatsMap.get(book.id) || [];

      const uniqueDates = Array.from(new Set(bookStats.map(s => s.date.getTime()))).sort((a, b) => a - b);
      if (uniqueDates.length === 0) return;

      const activityBlocks: { start: Date, end: Date; }[] = [];
      let currentBlock = { start: new Date(uniqueDates[0]), end: new Date(uniqueDates[0]) };

      for (let j = 1; j < uniqueDates.length; j++) {
        const currentDate = new Date(uniqueDates[j]);
        const prevDate = new Date(uniqueDates[j - 1]);
        const diffDays = (currentDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);

        if (diffDays <= 7) {
          currentBlock.end = currentDate;
        } else {
          activityBlocks.push(currentBlock);
          currentBlock = { start: currentDate, end: currentDate };
        }
      }
      activityBlocks.push(currentBlock);

      group.selectAll('.activity-block')
        .data(activityBlocks)
        .enter()
        .append('rect')
        .attr('class', 'activity-block')
        .attr('x', d => x(d.start))
        .attr('width', d => Math.max(1, x(d3.timeDay.offset(d.end, 1)) - x(d.start)))
        .attr('height', barHeight)
        .style('fill', book.color);
    });

    bookGroups.append('rect')
      .attr('class', 'tooltip-rect')
      .attr('x', d => x(d.firstRead))
      .attr('width', d => Math.max(2, x(d.lastRead) - x(d.firstRead)))
      .attr('height', barHeight)
      .attr('fill', 'transparent')
      .on('mouseover', (event, d) => {
        const html = this.tooltipService.generateHtml(d.title, d.color, [
          { label: 'Started', value: d.firstRead.toLocaleDateString(), type: 'text' },
          { label: 'Finished', value: d.lastRead.toLocaleDateString(), type: 'text' },
          { label: 'Duration', value: d.totalSeconds, type: 'duration' },
          { label: 'Active Days', value: d.activeDays, type: 'text' }
        ]);
        this.tooltipService.show(event, html);
      })
      .on('mousemove', (event) => this.tooltipService.show(event, this.tooltipService.state().content))
      .on('mouseout', () => this.tooltipService.hide());
  }

  private truncateYAxisLabels(selection: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>, width: number) {
    selection.each((d, i, nodes) => {
      const textElement = d3.select(nodes[i] as SVGTextElement);
      const originalText = textElement.text();

      const textNode = textElement.node();
      if (!textNode) return;

      textElement.on('mouseover', null).on('mousemove', null).on('mouseout', null);
      textElement.select('title').remove();

      let textLength = textNode.getComputedTextLength();

      if (textLength > width) {
        let truncatedText = originalText;
        while (textLength > width && truncatedText.length > 3) {
          truncatedText = truncatedText.slice(0, -1);
          textElement.text(truncatedText + '…');
          textLength = textNode.getComputedTextLength();
        }
        textElement.append('title').text(originalText);
      }
    });
  }
}
