import { describe, expect, it } from "vitest";
import {
  getPreassignedClassTemplates,
  isCanonicalSchoolForBranch,
  isGradeAllowedForSchoolLevel,
  PREASSIGNED_BRANCHES,
  PREASSIGNED_SCHOOLS,
  PRIMARY_CLASS_TEMPLATES,
  SECONDARY_CLASS_TEMPLATES,
} from "../../src/config/preassigned-classes.config";

describe("Preassigned Branch & School-Level Class Mapping", () => {
  it("defines the 4 canonical branches and 6 canonical schools", () => {
    expect(PREASSIGNED_BRANCHES.map((b) => b.name)).toEqual([
      "Guzape",
      "Gwarinpa",
      "Wuse",
      "Wuye",
    ]);

    const academies = PREASSIGNED_SCHOOLS.filter((s) => s.level === "primary");
    const colleges = PREASSIGNED_SCHOOLS.filter((s) => s.level === "secondary");

    expect(academies.map((s) => s.name)).toEqual([
      "Guzape Academy",
      "Gwarinpa Academy",
      "Wuse Academy",
    ]);
    expect(colleges.map((s) => s.name)).toEqual([
      "Guzape College",
      "Wuye College",
      "Gwarinpa College",
    ]);
  });

  it("validates canonical branch-level combinations", () => {
    expect(isCanonicalSchoolForBranch("GUZ", "primary")).toBe(true);
    expect(isCanonicalSchoolForBranch("GUZ", "secondary")).toBe(true);
    expect(isCanonicalSchoolForBranch("GWA", "primary")).toBe(true);
    expect(isCanonicalSchoolForBranch("GWA", "secondary")).toBe(true);
    expect(isCanonicalSchoolForBranch("WUS", "primary")).toBe(true);
    expect(isCanonicalSchoolForBranch("WUS", "secondary")).toBe(false);
    expect(isCanonicalSchoolForBranch("WUY", "secondary")).toBe(true);
    expect(isCanonicalSchoolForBranch("WUY", "primary")).toBe(false);
  });

  it("assigns strictly Primary classes to Academies and Secondary classes to Colleges", () => {
    const primary = getPreassignedClassTemplates("primary");
    const secondary = getPreassignedClassTemplates("secondary");

    expect(primary.length).toBe(33);
    expect(secondary.length).toBe(36);

    expect(primary.every((c) => c.isPrimarySelfContained)).toBe(true);
    expect(secondary.every((c) => !c.isPrimarySelfContained)).toBe(true);

    expect(primary.some((c) => c.gradeLevel.startsWith("JSS") || c.gradeLevel.startsWith("SS"))).toBe(false);
    expect(secondary.some((c) => c.gradeLevel.startsWith("GRADE") || c.gradeLevel === "PLAYGROUP")).toBe(false);

    // Zero duplicate class codes within each catalog
    expect(new Set(PRIMARY_CLASS_TEMPLATES.map((c) => c.code)).size).toBe(PRIMARY_CLASS_TEMPLATES.length);
    expect(new Set(SECONDARY_CLASS_TEMPLATES.map((c) => c.code)).size).toBe(SECONDARY_CLASS_TEMPLATES.length);
  });

  it("enforces grade-level school scoping", () => {
    expect(isGradeAllowedForSchoolLevel("GRADE 1", "primary")).toBe(true);
    expect(isGradeAllowedForSchoolLevel("PLAYGROUP - SUPERSTARS", "primary")).toBe(true);
    expect(isGradeAllowedForSchoolLevel("JSS 1", "primary")).toBe(false);
    expect(isGradeAllowedForSchoolLevel("SS 3 - SUPERSTARS", "primary")).toBe(false);

    expect(isGradeAllowedForSchoolLevel("JSS 1", "secondary")).toBe(true);
    expect(isGradeAllowedForSchoolLevel("SS 2 - EXPLORERS", "secondary")).toBe(true);
    expect(isGradeAllowedForSchoolLevel("GRADE 4", "secondary")).toBe(false);
    expect(isGradeAllowedForSchoolLevel("KINDERGARTEN - EXPLORERS", "secondary")).toBe(false);

    // Archive/status labels permitted for both levels
    expect(isGradeAllowedForSchoolLevel("GRADUATED", "primary")).toBe(true);
    expect(isGradeAllowedForSchoolLevel("WITHDRAWN", "secondary")).toBe(true);
  });
});
