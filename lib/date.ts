import dayjs, { type Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/ja";

const TIMEZONE = "Asia/Tokyo";

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.locale("ja");
dayjs.tz.setDefault(TIMEZONE);

export const jst = (date?: string | number | Date | Dayjs) => {
  return date ? dayjs(date).tz(TIMEZONE) : dayjs().tz(TIMEZONE);
};
