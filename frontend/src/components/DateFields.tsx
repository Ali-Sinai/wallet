import { CalendarIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { FIELD_CLASS } from "@/components/primitives";
import { DESKTOP_MIN_WIDTH } from "@/hooks/use-media-query";
import { useI18n } from "@/lib/i18n";
import { toLatinDigits } from "@/lib/persian-date";
import { cn } from "@/lib/utils";

/*
 * Shamsi date fields on top of the Persian Labs pickers. Values in and out
 * are plain `Date`s — the calendar only changes how they're shown and picked,
 * callers still send `toISOString()` (Gregorian, UTC) to the API.
 *
 * Both pickers switch to a drawer at the same width the app shell does.
 */

/** Rendered through Base UI's `render` prop, so it must pass the injected trigger props on. */
function Trigger({
  label,
  placeholder,
  className,
  ...props
}: ComponentProps<typeof Button> & { label: string | null; placeholder: string }) {
  const { fa } = useI18n();
  return (
    <Button
      {...props}
      variant="plain"
      size="plain"
      className={cn(FIELD_CLASS, "flex items-center gap-2 border text-start", !label && "text-muted-foreground", className)}
    >
      <CalendarIcon className="size-4 opacity-50" />
      <span className="truncate">{label === null ? placeholder : fa ? label : toLatinDigits(label)}</span>
    </Button>
  );
}

export function DateTimeField({ value, onChange }: { value: Date; onChange: (value: Date) => void }) {
  const { t, fa } = useI18n();

  return (
    <DateTimePicker
      calendarType="shamsi"
      digits={fa ? "fa" : "en"}
      mobileBreakpoint={DESKTOP_MIN_WIDTH}
      placeholder={t.pickDate}
      timeLabel={t.pickTime}
      confirmLabel={t.confirm}
      cancelLabel={t.cancel}
      value={{ date: value, time: { hour: value.getHours(), minute: value.getMinutes() } }}
      onValueChange={({ date, time }) => {
        if (!date) return;
        const next = new Date(date);
        next.setHours(time.hour, time.minute, 0, 0);
        onChange(next);
      }}
      renderTrigger={({ formattedValue }) => <Trigger label={formattedValue} placeholder={t.pickDate} />}
    />
  );
}

export function DateField({
  value,
  onChange,
  placeholder,
}: {
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
}) {
  const { t } = useI18n();

  return (
    <DatePicker
      calendarType="shamsi"
      mobileBreakpoint={DESKTOP_MIN_WIDTH}
      placeholder={placeholder ?? t.pickDate}
      confirmLabel={t.confirm}
      cancelLabel={t.cancel}
      value={value}
      onValueChange={onChange}
      renderTrigger={({ formattedValue }) => (
        <Trigger label={formattedValue} placeholder={placeholder ?? t.pickDate} />
      )}
    />
  );
}
