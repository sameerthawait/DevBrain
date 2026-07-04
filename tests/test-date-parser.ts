import { parseDateExpression } from "../lib/rag/retrieve";

function testDateParser() {
  console.log("=== STARTING DATE EXPRESSION PARSER UNIT TESTS ===");

  // 1. Test today
  const today = parseDateExpression("today");
  console.log("today range:", today);
  const now = new Date();
  if (today.start.getUTCFullYear() !== now.getUTCFullYear() || today.end.getUTCHours() !== 23) {
    throw new Error("today parsing failed");
  }

  // 2. Test yesterday
  const yesterday = parseDateExpression("yesterday");
  console.log("yesterday range:", yesterday);
  if (yesterday.start.getTime() >= today.start.getTime()) {
    throw new Error("yesterday must be strictly before today");
  }

  // 3. Test relative ranges
  const lastWeek = parseDateExpression("last week");
  console.log("last week range:", lastWeek);
  const weekDiff = today.start.getTime() - lastWeek.start.getTime();
  if (weekDiff !== 7 * 24 * 60 * 60 * 1000) {
    throw new Error("last week range must be exactly 7 days difference");
  }

  // 4. Test sprints
  const thisSprint = parseDateExpression("this sprint");
  console.log("this sprint range:", thisSprint);
  const sprintDiff = today.start.getTime() - thisSprint.start.getTime();
  if (sprintDiff !== 14 * 24 * 60 * 60 * 1000) {
    throw new Error("this sprint must span 14 days");
  }

  // 5. Test absolute YYYY-MM-DD
  const single = parseDateExpression("2026-05-15");
  console.log("single date range:", single);
  if (single.start.getUTCMonth() !== 4 || single.start.getUTCDate() !== 15) {
    throw new Error("specific date parsing failed");
  }

  // 6. Test absolute date ranges
  const range = parseDateExpression("2026-01-01 to 2026-01-10");
  console.log("date range:", range);
  if (range.start.getUTCDate() !== 1 || range.end.getUTCDate() !== 10) {
    throw new Error("absolute date range parsing failed");
  }

  console.log("=== ALL DATE PARSER UNIT TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
}

testDateParser();
