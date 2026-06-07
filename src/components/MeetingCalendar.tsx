import type { Meeting } from "@/types/api";

interface MeetingCalendarProps {
  meetings: Meeting[];
  onSelect: (meeting: Meeting) => void;
}

function getStatus(meeting: Meeting): "completed" | "ongoing" | "upcoming" {
  const now = Date.now();
  const start = new Date(meeting.date_start).getTime();
  const end = new Date(meeting.date_end).getTime();
  if (now > end) return "completed";
  if (now >= start && now <= end) return "ongoing";
  return "upcoming";
}

function countryFlag(countryCode: string): string {
  if (!countryCode) return "🏁";
  // Convert country code to regional indicator symbols
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return "🏁";
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(code.charCodeAt(0) + offset, code.charCodeAt(1) + offset);
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const sameMonth = s.getMonth() === e.getMonth();
  if (sameMonth) {
    return `${s.toLocaleDateString("en-GB", opts)}–${e.getDate()}`;
  }
  return `${s.toLocaleDateString("en-GB", opts)} – ${e.toLocaleDateString("en-GB", opts)}`;
}

export default function MeetingCalendar({ meetings, onSelect }: MeetingCalendarProps) {
  if (meetings.length === 0) {
    return (
      <div className="text-center py-10 text-f1-dim text-sm">
        <div className="text-4xl mb-3 opacity-40">📅</div>
        No meetings found for this year
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-2.5">
      {meetings.map((meeting) => {
        const status = getStatus(meeting);
        const flag = countryFlag(meeting.country_code);

        return (
          <button
            key={meeting.meeting_key}
            /* eslint-disable-next-line react-perf/jsx-no-new-function-as-prop */
            onClick={() => onSelect(meeting)}
            /* eslint-disable-next-line react-perf/jsx-no-new-function-as-prop */
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(meeting);
              }
            }}
            type="button"
            className="w-full text-left bg-f1-bg2 border border-f1-border rounded-lg p-3.5 cursor-pointer transition-all hover:bg-f1-bg3 hover:border-f1-red hover:-translate-y-px relative overflow-hidden font-inherit"
          >
            <span className="absolute right-3 top-3 text-3xl leading-none opacity-60">{flag}</span>

            <div className="text-sm font-semibold text-f1-bright mb-1 pr-12">
              {meeting.meeting_name}
            </div>
            <div className="text-xs text-f1-dim">{meeting.circuit_short_name}</div>
            <div className="text-[11px] text-f1-dim mt-1.5">
              {formatDateRange(meeting.date_start, meeting.date_end)}
            </div>

            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: "completed" | "ongoing" | "upcoming" }) {
  const styles = {
    completed: "bg-f1-green text-black",
    ongoing: "bg-f1-orange text-black",
    upcoming: "bg-f1-bg4 text-f1-dim",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider inline-block ${
        styles[status]
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}
