import { getMonthKey, getMonthLabel } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
  /** How many past months to show (default 12) */
  count?: number;
  className?: string;
}

export default function MonthPicker({ value, onChange, count = 12, className }: MonthPickerProps) {
  const months = Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return getMonthKey(d);
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-36"}>
        <SelectValue>{getMonthLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m} value={m}>
            {getMonthLabel(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
