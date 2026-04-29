---
Task ID: 1
Agent: Main
Task: Fix double-counting in МФЦ "некоммерческая реклама" summary + add self-validation

Work Log:
- Analyzed the compute route and identified the root cause: section summation was counting ALL descendants (level 3+4) instead of only direct children (level+1)
- For "Социальная (некоммерческая) программа" (level 2), the old code summed both level-3 section items AND their level-4 children, causing double-counting
- Rewrote compute/route.ts with bottom-up section computation:
  1. First compute leaf items (with matchField) from playlist DB
  2. Then compute sections bottom-up (deepest level first), summing ONLY direct children (level+1)
  3. This ensures no double-counting: level-4 values only feed into level-3, level-3 values only feed into level-2
- Added comprehensive self-validation in compute route:
  - Duplicate entry detection (same categoryName + level)
  - Section total vs sum of children mismatch detection
  - Orphan item detection (no data, no filter, no children)
  - Percent sum validation (should be ~100%)
- Updated import route dedup logic: simpler fetch+delete approach instead of complex subquery (better Turso compatibility)
- Updated SummaryDialog with validation indicator in header and expandable validation panel

Stage Summary:
- Fixed: double-counting in "некоммерческая реклама" — now only sums direct children
- Added: self-validation checks across all data types
- Added: validation UI with error/warning indicators in SummaryDialog header
- Pushed to GitHub: commit 36b2058
