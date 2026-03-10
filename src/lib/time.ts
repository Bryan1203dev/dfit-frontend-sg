import { format, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Lima';

export const getPeruTime = () => {
  const now = new Date();
  return toZonedTime(now, TIMEZONE);
};

export const formatPeruDate = (date: Date | string, fmt: string = 'yyyy-MM-dd HH:mm:ss') => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, fmt, { timeZone: TIMEZONE });
};

export const getCurrentPeruISODate = () => {
    return formatPeruDate(new Date(), 'yyyy-MM-dd');
}

export const getCurrentPeruISOTime = () => {
    return formatPeruDate(new Date(), 'HH:mm:ss');
}

export const getCurrentPeruISO = () => {
    return formatPeruDate(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
}
