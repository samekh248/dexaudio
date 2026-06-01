import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaysOverTimeChart } from "@/components/stats/PlaysOverTimeChart";
import { ListeningClockChart } from "@/components/stats/ListeningClockChart";
import { WeekdayChart } from "@/components/stats/WeekdayChart";
import { CalendarHeatmap } from "@/components/stats/CalendarHeatmap";

describe("stats charts", () => {
  it("renders plays over time with accessible summary", () => {
    render(<PlaysOverTimeChart data={[{ bucket: "2026-05-01", count: 3 }]} />);
    expect(screen.getByRole("heading", { name: /plays over time/i })).toBeInTheDocument();
    expect(screen.getByText(/3 total plays/i)).toBeInTheDocument();
  });

  it("renders listening clock", () => {
    const clock = Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour === 20 ? 5 : 0 }));
    render(<ListeningClockChart data={clock} />);
    expect(screen.getByRole("heading", { name: /listening clock/i })).toBeInTheDocument();
    expect(screen.getByText(/peak at 20:00/i)).toBeInTheDocument();
  });

  it("renders weekday chart", () => {
    const weekday = Array.from({ length: 7 }, (_, weekday) => ({ weekday, count: 1 }));
    render(<WeekdayChart data={weekday} />);
    expect(screen.getByText(/by weekday/i)).toBeInTheDocument();
  });

  it("renders calendar heatmap", () => {
    render(<CalendarHeatmap data={[{ bucket: "2026-05-01", count: 2 }]} />);
    expect(screen.getByRole("heading", { name: /calendar/i })).toBeInTheDocument();
  });
});
