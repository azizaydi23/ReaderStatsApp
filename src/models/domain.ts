export interface Book {
  id: number;
  title: string;
  color: string;

  totalSeconds: number;
  totalPages: number;
  firstRead: Date;
  lastRead: Date;
  activeDays: number;
  spanDays: number;
  speed: number;
}

export interface DailyReadingStat {
  book: Book;
  totalSeconds: number;
  totalPages: number;
  firstStart: Date;
  lastEnd: Date;
  date: Date;
}
