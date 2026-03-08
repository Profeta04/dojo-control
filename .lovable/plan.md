

## Fix: Streak icon appearing as negative sign

The `Minus` icon from Lucide renders as a dash "—" right next to the streak number, making "— 3" look like "-3" (negative). 

### Change
In `src/components/classes/StudentAttendanceOverview.tsx`, replace the `Minus` icon for streaks 1-4 with `Equal` or simply remove the icon for that range, using a dot or the `Activity` icon instead.

**Simplest fix**: Replace `Minus` with `Activity` (a neutral heartbeat-like icon) for streaks 1-4, which won't be confused with a negative sign.

### File: `src/components/classes/StudentAttendanceOverview.tsx`
- Line 10: Replace `Minus` import with `Activity`
- Line 115: Change `<Minus ...>` to `<Activity ...>`

