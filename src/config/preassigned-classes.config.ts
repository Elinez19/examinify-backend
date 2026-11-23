import type { SchoolLevel } from "../db/schema/enums";

export interface PreassignedBranchConfig {
  readonly code: string;
  readonly name: string;
  readonly address: string;
}

export interface PreassignedSchoolConfig {
  readonly branchCode: string;
  readonly name: string;
  readonly level: SchoolLevel;
}

export interface PreassignedClassTemplate {
  readonly code: string;
  readonly name: string;
  readonly gradeLevel: string;
  readonly isPrimarySelfContained: boolean;
}

export const PREASSIGNED_BRANCHES: ReadonlyArray<PreassignedBranchConfig> = [
  { name: "Guzape", code: "GUZ", address: "Guzape Campus, Abuja" },
  { name: "Gwarinpa", code: "GWA", address: "Gwarinpa Campus, Abuja" },
  { name: "Wuse", code: "WUS", address: "Wuse II Campus, Abuja" },
  { name: "Wuye", code: "WUY", address: "Wuye Campus, Abuja" },
];

/**
 * Canonical Branch + School-Level Registry:
 * - Academies (Guzape Academy, Gwarinpa Academy, Wuse Academy) -> Primary school classes
 * - Colleges (Guzape College, Wuye College, Gwarinpa College) -> Secondary school classes
 */
export const PREASSIGNED_SCHOOLS: ReadonlyArray<PreassignedSchoolConfig> = [
  { branchCode: "GUZ", name: "Guzape Academy", level: "primary" },
  { branchCode: "GWA", name: "Gwarinpa Academy", level: "primary" },
  { branchCode: "WUS", name: "Wuse Academy", level: "primary" },
  { branchCode: "GUZ", name: "Guzape College", level: "secondary" },
  { branchCode: "WUY", name: "Wuye College", level: "secondary" },
  { branchCode: "GWA", name: "Gwarinpa College", level: "secondary" },
];

const STANDARD_ARM_NAMES = [
  "DISCOVERERS",
  "EXPLORERS",
  "ICONS",
  "LEGENDS",
  "SUPERSTARS",
  "TRAILBLAZERS",
] as const;

const SECONDARY_GRADE_LEVELS = [
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SS 1",
  "SS 2",
  "SS 3",
] as const;

const PRIMARY_CLASS_PAIRS: ReadonlyArray<readonly [string, string]> = [
  // Nursery / Early Years
  ["PLAYGROUP", "SUPERSTARS"],
  ["PRE-SCHOOL", "ICONS"],
  ["PRE-SCHOOL", "LEGENDS"],
  ["PRE-SCHOOL", "SUPERSTARS"],
  ["PRE-SCHOOL 1", "DISCOVERERS"],
  ["PRE-SCHOOL 1", "ICONS"],
  ["PRE-SCHOOL 1", "SUPERSTARS"],
  ["PRE-SCHOOL 2", "SUPERSTARS"],
  ["PRE-SCHOOL 2", "TRAILBLAZERS"],
  ["KINDERGARTEN", "EXPLORERS"],
  ["KINDERGARTEN", "LEGENDS"],

  // Primary (Grade 1 - Grade 6)
  ["GRADE 1", "EXPLORERS"],
  ["GRADE 1", "ICONS"],
  ["GRADE 1", "SUPERSTARS"],
  ["GRADE 2", "DISCOVERERS"],
  ["GRADE 2", "EXPLORERS"],
  ["GRADE 2", "LEGENDS"],
  ["GRADE 2", "SUPERSTARS"],
  ["GRADE 3", "DISCOVERERS"],
  ["GRADE 3", "EXPLORERS"],
  ["GRADE 3", "LEGENDS"],
  ["GRADE 3", "SUPERSTARS"],
  ["GRADE 4", "DISCOVERERS"],
  ["GRADE 4", "EXPLORERS"],
  ["GRADE 4", "LEGENDS"],
  ["GRADE 4", "SUPERSTARS"],
  ["GRADE 5", "EXPLORERS"],
  ["GRADE 5", "SUPERSTARS"],
  ["GRADE 5", "TRAILBLAZERS"],
  ["GRADE 6", "EXPLORERS"],
  ["GRADE 6", "LEGENDS"],
  ["GRADE 6", "SUPERSTARS"],
  ["GRADE 6", "TRAILBLAZERS"],
];

function deriveStandardClassCode(gradeLevel: string, arm: string): string {
  const upper = gradeLevel.trim().toUpperCase();
  const armCode = arm
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 3)
    .toUpperCase();

  let prefix = upper.replace(/[^A-Z0-9]/g, "").slice(0, 4);
  if (upper === "PLAYGROUP") prefix = "PG";
  else if (upper === "PRE-SCHOOL") prefix = "PS";
  else if (upper === "PRE-SCHOOL 1") prefix = "PS1";
  else if (upper === "PRE-SCHOOL 2") prefix = "PS2";
  else if (upper === "KINDERGARTEN") prefix = "KG";
  else if (upper.startsWith("GRADE ")) {
    prefix = `GR${upper.replace("GRADE ", "").trim()}`;
  } else if (upper.startsWith("JSS ")) {
    prefix = `JSS${upper.replace("JSS ", "").trim()}`;
  } else if (upper.startsWith("SS ")) {
    prefix = `SS${upper.replace("SS ", "").trim()}`;
  }

  return armCode && armCode !== prefix ? `${prefix}-${armCode}` : prefix;
}

export const PRIMARY_CLASS_TEMPLATES: ReadonlyArray<PreassignedClassTemplate> =
  PRIMARY_CLASS_PAIRS.map(([gradeLevel, arm]) => ({
    code: deriveStandardClassCode(gradeLevel, arm),
    name: `${gradeLevel} - ${arm}`,
    gradeLevel,
    isPrimarySelfContained: true,
  }));

export const SECONDARY_CLASS_TEMPLATES: ReadonlyArray<PreassignedClassTemplate> =
  SECONDARY_GRADE_LEVELS.flatMap((gradeLevel) =>
    STANDARD_ARM_NAMES.map((arm) => ({
      code: deriveStandardClassCode(gradeLevel, arm),
      name: `${gradeLevel} - ${arm}`,
      gradeLevel,
      isPrimarySelfContained: false,
    }))
  );

export function getPreassignedClassTemplates(
  level: SchoolLevel
): ReadonlyArray<PreassignedClassTemplate> {
  return level === "primary"
    ? PRIMARY_CLASS_TEMPLATES
    : SECONDARY_CLASS_TEMPLATES;
}

export function inferClassLevelFromGradeOrName(
  value: string
): SchoolLevel | "status" {
  const probe = value.trim().toUpperCase();
  if (probe.includes("GRADUATED") || probe.includes("WITHDRAWN")) {
    return "status";
  }
  if (
    probe.includes("PLAYGROUP") ||
    probe.includes("PRE-SCHOOL") ||
    probe.includes("PRESCHOOL") ||
    probe.includes("KINDERGARTEN") ||
    probe.includes("NURSERY") ||
    probe.includes("CRECHE") ||
    probe.includes("KG") ||
    probe.includes("GRADE ") ||
    probe.includes("PRIMARY") ||
    probe.includes("PRY") ||
    probe.includes("BASIC")
  ) {
    return "primary";
  }
  return "secondary";
}

export function isGradeAllowedForSchoolLevel(
  gradeLevelOrClassName: string,
  schoolLevel: SchoolLevel
): boolean {
  const inferred = inferClassLevelFromGradeOrName(gradeLevelOrClassName);
  if (inferred === "status") return true;
  return inferred === schoolLevel;
}

export function isCanonicalSchoolForBranch(
  branchCode: string,
  level: SchoolLevel
): boolean {
  const normalizedCode = branchCode.trim().toUpperCase();
  return PREASSIGNED_SCHOOLS.some(
    (s) => s.branchCode === normalizedCode && s.level === level
  );
}
