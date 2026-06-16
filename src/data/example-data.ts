import { ProtoDailyStat } from '../services/database.service';

interface SimBookState {
  id: number;
  title: string;
  totalPages: number;
  currentPage: number;
  isFinished: boolean;
}

interface SimPageStat {
  book_id: number;
  book_title: string;
  page: number;
  start_time: number;
  duration: number;
}


function createLibrary(): SimBookState[] {
  const librarySource = [
    { title: 'Hyperion', pages: 1450 }, { title: 'The Fall of Hyperion', pages: 1600 },
    { title: 'Dune', pages: 2100 }, { title: 'Dune Messiah', pages: 900 },
    { title: 'Project Hail Mary', pages: 1350 }, { title: 'The Martian', pages: 1100 },
    { title: 'The Three-Body Problem', pages: 1250 }, { title: 'The Dark Forest', pages: 1600 },
    { title: 'Death\'s End', pages: 1900 }, { title: 'Atomic Habits', pages: 850 },
    { title: 'Deep Work', pages: 900 }, { title: 'Thinking, Fast and Slow', pages: 1500 },
    { title: 'Sapiens', pages: 1400 }, { title: 'Homo Deus', pages: 1300 },
    { title: 'Steve Jobs', pages: 2000 }, { title: 'The Hobbit', pages: 950 },
    { title: 'Mistborn', pages: 1600 }, { title: 'The Hero of Ages', pages: 1750 },
    { title: 'The Name of the Wind', pages: 1800 }, { title: 'The Wise Man\'s Fear', pages: 2400 },
    { title: 'Educated', pages: 1100 }, { title: '1984', pages: 900 },
    { title: 'Brave New World', pages: 850 }, { title: 'Fahrenheit 451', pages: 650 },
    { title: 'Dark Matter', pages: 1050 }, { title: 'Recursion', pages: 1100 },
    { title: 'Clean Code', pages: 1300 }, { title: 'Neuromancer', pages: 950 },
    { title: 'Snow Crash', pages: 1400 }, { title: 'Cryptonomicon', pages: 2800 }
  ];

  return librarySource.map((src, index) => ({
    id: 100 + index,
    title: src.title,
    totalPages: Math.floor(src.pages * (0.95 + Math.random() * 0.1)),
    currentPage: 0,
    isFinished: false
  }));
}

export function getExampleData(): ProtoDailyStat[] {
  const stats = simulateFullYear();
  return stats.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

function getLogicalDateStr(unixTimestamp: number): string {
  const date = new Date((unixTimestamp - 4 * 3600) * 1000);
  return date.toISOString().split('T')[0];
}

function simulateFullYear(): ProtoDailyStat[] {
  const generatedStats: ProtoDailyStat[] = [];
  const year = new Date().getFullYear();
  const library = shuffle(createLibrary());
  const activeBooks: SimBookState[] = [];

  const MAX_ACTIVE_BOOKS = 4;
  const DAILY_READING_CHANCE = 0.80;
  const NEW_BOOK_CHANCE = 0.05;

  ensureActiveBooks(library, activeBooks, 2, MAX_ACTIVE_BOOKS);

  for (let day = 0; day < 365; day++) {
    const date = new Date(year, 0, 1 + day);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    if (Math.random() > (isWeekend ? 0.95 : DAILY_READING_CHANCE)) continue;

    if (activeBooks.length === 0) {
      ensureActiveBooks(library, activeBooks, 1, MAX_ACTIVE_BOOKS);
      if (activeBooks.length === 0) break;
    }

    if (Math.random() < NEW_BOOK_CHANCE) {
      ensureActiveBooks(library, activeBooks, activeBooks.length + 1, MAX_ACTIVE_BOOKS);
    }

    const numBooksToRead = Math.round(randomNormal(1.5, 1, 0, Math.min(4, activeBooks.length)));
    if (numBooksToRead === 0) continue;

    const booksForToday = shuffle(activeBooks).slice(0, numBooksToRead);
    const sessionTimes = pickSessionTimes(date, booksForToday.length);
    const dailyPageStats: SimPageStat[] = [];

    for (let i = 0; i < booksForToday.length; i++) {
      const book = booksForToday[i];
      const sessionStats = simulateReadingSession(sessionTimes[i], book, isWeekend);
      dailyPageStats.push(...sessionStats);
    }

    if (dailyPageStats.length > 0) {
      const dailyAggregates = new Map<number, { title: string, stats: SimPageStat[]; }>();
      for (const stat of dailyPageStats) {
        if (!dailyAggregates.has(stat.book_id)) {
          dailyAggregates.set(stat.book_id, { title: stat.book_title, stats: [] });
        }
        dailyAggregates.get(stat.book_id)!.stats.push(stat);
      }

      dailyAggregates.forEach((data, bookId) => {
        let totalSeconds = 0;
        let minStartTime = Infinity;
        let maxEndTime = -Infinity;
        const distinctPages = new Set<number>();

        for (const item of data.stats) {
          if (item.duration < 10) continue;
          totalSeconds += Math.min(item.duration, 180);
          minStartTime = Math.min(minStartTime, item.start_time);
          maxEndTime = Math.max(maxEndTime, item.start_time + item.duration);
          distinctPages.add(item.page);
        }

        if (totalSeconds > 0) {
          generatedStats.push({
            bookId: bookId,
            bookTitle: data.title,
            totalSeconds: totalSeconds,
            totalPages: distinctPages.size,
            firstStartTs: minStartTime,
            lastEndTs: maxEndTime,
            dateStr: getLogicalDateStr(minStartTime)
          });
        }
      });
    }

    const finishedBookCount = activeBooks.filter(b => b.isFinished).length;
    if (finishedBookCount > 0) {
      for (let i = activeBooks.length - 1; i >= 0; i--) {
        if (activeBooks[i].isFinished) {
          activeBooks.splice(i, 1);
        }
      }
      ensureActiveBooks(library, activeBooks, activeBooks.length + finishedBookCount, MAX_ACTIVE_BOOKS);
    }
  }

  return generatedStats;
}

function simulateReadingSession(sessionStart: Date, book: SimBookState, isWeekend: boolean): SimPageStat[] {
  const sessionStats: SimPageStat[] = [];
  let sessionTimestamp = Math.floor(sessionStart.getTime() / 1000);

  const meanDuration = isWeekend ? 50 : 40;
  const durationMins = randomNormal(meanDuration, 15, 15, 90);
  const secondsPerPage = randomNormal(45, 10, 20, 80);
  const pagesToRead = Math.floor((durationMins * 60) / secondsPerPage);

  for (let i = 0; i < pagesToRead; i++) {
    if (book.currentPage >= book.totalPages) {
      book.isFinished = true;
      break;
    }
    book.currentPage++;

    const pageDuration = Math.round(randomNormal(secondsPerPage, 5, 10, 120));
    sessionStats.push({
      book_id: book.id,
      book_title: book.title,
      page: book.currentPage,
      start_time: sessionTimestamp,
      duration: pageDuration
    });
    sessionTimestamp += pageDuration;
  }
  return sessionStats;
}

function ensureActiveBooks(library: SimBookState[], activeBooks: SimBookState[], count: number, max: number) {
  while (activeBooks.length < count && activeBooks.length < max) {
    const nextBook = library.find(b => !b.isFinished && !activeBooks.some(ab => ab.id === b.id));
    if (nextBook) {
      activeBooks.push(nextBook);
    } else {
      break;
    }
  }
}

function pickSessionTimes(day: Date, count: number): Date[] {
  const eveningHours = [19, 20, 21, 22, 23];
  const morningHours = [7, 8, 9];
  const times: Date[] = [];
  const usedHours = new Set<number>();

  for (let i = 0; i < count; i++) {
    let hour: number;
    if (i === 0 && Math.random() < 0.8) {
      hour = eveningHours[Math.floor(Math.random() * eveningHours.length)];
    } else {
      hour = morningHours[Math.floor(Math.random() * morningHours.length)];
    }
    if (usedHours.has(hour)) hour = (hour + 1) % 24;
    usedHours.add(hour);
    const sessionTime = new Date(day);
    sessionTime.setHours(hour, Math.floor(Math.random() * 60));
    times.push(sessionTime);
  }
  return times.sort((a, b) => a.getTime() - b.getTime());
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randn_bm(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function randomNormal(mean: number, stdDev: number, min: number, max: number): number {
  let num = randn_bm() * stdDev + mean;
  return Math.max(min, Math.min(max, num));
}
