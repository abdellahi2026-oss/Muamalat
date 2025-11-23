
'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { addDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  setDate
}: DateRangePickerProps) {

  const handlePresetChange = (value: string) => {
    const now = new Date();
    switch (value) {
      case 'today':
        setDate({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'this_month':
        setDate({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'this_year':
        setDate({ from: startOfYear(now), to: endOfYear(now) });
        break;
      default:
        setDate(undefined);
    }
  };


  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <div className='flex items-center gap-2'>
        <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="فترة محددة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="this_month">هذا الشهر</SelectItem>
              <SelectItem value="this_year">هذه السنة</SelectItem>
            </SelectContent>
          </Select>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[260px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y', { locale: ar })} -{' '}
                  {format(date.to, 'LLL dd, y', { locale: ar })}
                </>
              ) : (
                format(date.from, 'LLL dd, y', { locale: ar })
              )
            ) : (
              <span>اختر فترة</span>
            )}
          </Button>
        </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            locale={ar}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
