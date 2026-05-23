import type { ChartPoint } from "../types";

export const chartData7d: ChartPoint[] = [
  { date: "May 1", users: 8120, applications: 3520 },
  { date: "May 2", users: 8180, applications: 3588 },
  { date: "May 3", users: 8250, applications: 3610 },
  { date: "May 4", users: 8310, applications: 3702 },
  { date: "May 5", users: 8395, applications: 3788 },
  { date: "May 6", users: 8460, applications: 3890 },
  { date: "May 7", users: 8542, applications: 3967 },
];

export const chartData30d: ChartPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: `Apr ${i + 1}`,
  users: 7600 + i * 32,
  applications: 2900 + i * 36,
}));
