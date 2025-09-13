"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Shadcn Select

// Define the enhanced props to include dropdowns
export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  // You can add any future custom props here if needed
};

// Function to get a range of years (e.g., from 1950 to current year)
function getYears() {
  const currentYear = new Date().getFullYear();
  const startYear = 1950;
  const years = [];
  for (let i = currentYear; i >= startYear; i--) {
    years.push(i);
  }
  return years;
}

// Enhanced Calendar Component
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [selectedYear, setSelectedYear] = React.useState<number>(props.month?.getFullYear() ?? new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState<number>(props.month?.getMonth() ?? new Date().getMonth());

  React.useEffect(() => {
    setSelectedYear(props.month?.getFullYear() ?? new Date().getFullYear());
    setSelectedMonth(props.month?.getMonth() ?? new Date().getMonth());
  }, [props.month]);


  // Handle month/year change from dropdowns
  const handleSelectChange = (year: number, month: number) => {
    const newDate = new Date(year, month, 1);
    props.onMonthChange?.(newDate); // Inform the DayPicker about the new month
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      month={new Date(selectedYear, selectedMonth)} // Control the displayed month
      onMonthChange={(date) => {
        // Update our state if the user navigates with arrows
        setSelectedYear(date.getFullYear());
        setSelectedMonth(date.getMonth());
        props.onMonthChange?.(date);
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "hidden", // Hide the default text caption (e.g., "January 2024")
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        // Override the Caption component to add our custom dropdowns
        Caption: ({...captionProps}) => {
          return (
            <div className="flex items-center justify-center w-full px-10 gap-2 mb-2">
                 <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => {
                    const newMonth = parseInt(value);
                    setSelectedMonth(newMonth);
                    handleSelectChange(selectedYear, newMonth);
                    }}
                >
                    <SelectTrigger className="w-full font-medium">
                    <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                        {new Date(selectedYear, i, 1).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => {
                    const newYear = parseInt(value);
                    setSelectedYear(newYear);
                    handleSelectChange(newYear, selectedMonth);
                    }}
                >
                    <SelectTrigger className="w-full font-medium">
                    <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                    {getYears().map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                        {year}
                        </SelectItem>
                    ))}
                    </SelectContent>
              </Select>
            </div>
          );
        },
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
