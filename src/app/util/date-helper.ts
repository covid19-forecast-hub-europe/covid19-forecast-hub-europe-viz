// import * as moment from 'moment';
import { format, formatISO } from 'date-fns'

export class DateHelper {
  static format(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  static sameDate(l: Date, r: Date) {
    return formatISO(l, { representation: 'date' }) === formatISO(r, { representation: 'date' });
  }
}
