const BULLETIN_CS = `Computer Science, B.S. (Engineering) bulletin summary (Penn State):
- Use CMPSC_BS / CSENG_BS requirements.
- Suggested plan baseline: CMPSC 131/132, CMPSC 150N, MATH 140/141/220/230, PHYS 211/212, CAS 100A or 100B, ENGL 15 + ENGL 202C, CMPSC 221/222/315/316/320/360/461/465/483W, STAT 318/319, CMPSC/CMPEN 400-level electives, department-list electives, GHW.
- Confirm final requirement interpretation in LionPATH + official bulletin.
Source: https://bulletins.psu.edu/undergraduate/colleges/engineering/computer-science-bs/`;

function resolveMajorKey(raw: string | undefined): "cmpsc" | null {
  if (!raw?.trim()) return null;
  const u = raw.toUpperCase();
  if (
    u.includes("CMPSC_BS") ||
    u.includes("CSENG_BS") ||
    u.includes("COMPUTER SCIENCE") ||
    u.includes("COMP SCI") ||
    u === "CMPSC"
  ) return "cmpsc";
  return null;
}

export function getMajorRequirementsBulletin(major: string | undefined): string {
  if (!major?.trim()) return "";
  const key = resolveMajorKey(major);
  if (key === "cmpsc") {
    return `=== MAJOR REQUIREMENTS ===\n${BULLETIN_CS}\n=== END MAJOR REQUIREMENTS ===`;
  }
  return `=== MAJOR REQUIREMENTS ===\nNo embedded requirement sheet for "${major}". Use Penn State bulletin + LionPATH audit as source of truth.\n=== END MAJOR REQUIREMENTS ===`;
}

