// The league plays in Markham, Ontario — every "is this today / has this
// passed" comparison must be judged in Eastern time, not the server's UTC
// clock. A game at 8 PM EDT is already "tomorrow" in UTC, which was
// silently dropping evening games off "today" lists site-wide. Never call
// `new Date()` directly for date comparisons — always go through here.

export function getTodayEastern(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
  }); // Returns YYYY-MM-DD in Eastern time
}

export function isGameToday(gameDate: string): boolean {
  return gameDate === getTodayEastern();
}

export function isGamePast(gameDate: string): boolean {
  return gameDate < getTodayEastern();
}
