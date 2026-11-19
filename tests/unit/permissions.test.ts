import { describe, expect, it } from "vitest";
import {
  ADMIN_MFA_ROLES,
  canProvisionRole,
  hasPermission,
  PERMISSIONS,
} from "../../src/config/permissions.config";

describe("6-Role RBAC Permissions & Provisioning Hierarchy", () => {
  it("allows only super_admin to provision school_admin accounts", () => {
    expect(canProvisionRole("super_admin", "school_admin")).toBe(true);
    expect(canProvisionRole("super_admin", "teacher")).toBe(false);
    expect(canProvisionRole("super_admin", "student")).toBe(false);
    expect(canProvisionRole("school_admin", "school_admin")).toBe(false);
    expect(canProvisionRole("teacher", "school_admin")).toBe(false);
  });

  it("allows only school_admin to provision branch members (examiner, teacher, non_academic_staff, student)", () => {
    expect(canProvisionRole("school_admin", "examiner")).toBe(true);
    expect(canProvisionRole("school_admin", "teacher")).toBe(true);
    expect(canProvisionRole("school_admin", "non_academic_staff")).toBe(true);
    expect(canProvisionRole("school_admin", "student")).toBe(true);
    expect(canProvisionRole("school_admin", "super_admin")).toBe(false);

    expect(canProvisionRole("examiner", "student")).toBe(false);
    expect(canProvisionRole("teacher", "student")).toBe(false);
    expect(canProvisionRole("non_academic_staff", "student")).toBe(false);
    expect(canProvisionRole("student", "student")).toBe(false);
  });

  it("restricts non_academic_staff to directory and attendance without exam/grade authoring", () => {
    expect(hasPermission("non_academic_staff", PERMISSIONS.USER_READ_DIRECTORY)).toBe(true);
    expect(hasPermission("non_academic_staff", PERMISSIONS.ATTENDANCE_READ)).toBe(true);
    expect(hasPermission("non_academic_staff", PERMISSIONS.ATTENDANCE_MANAGE)).toBe(true);

    expect(hasPermission("non_academic_staff", PERMISSIONS.EXAM_CREATE)).toBe(false);
    expect(hasPermission("non_academic_staff", PERMISSIONS.EXAM_APPROVE)).toBe(false);
    expect(hasPermission("non_academic_staff", PERMISSIONS.GRADEBOOK_MANAGE)).toBe(false);
    expect(hasPermission("non_academic_staff", PERMISSIONS.USER_CREATE_BRANCH_MEMBER)).toBe(false);
  });

  it("separates teacher CA publishing from examiner/admin terminal exam approval", () => {
    expect(hasPermission("teacher", PERMISSIONS.EXAM_PUBLISH_CA)).toBe(true);
    expect(hasPermission("teacher", PERMISSIONS.EXAM_SUBMIT_FOR_APPROVAL)).toBe(true);
    expect(hasPermission("teacher", PERMISSIONS.EXAM_APPROVE)).toBe(false);
    expect(hasPermission("teacher", PERMISSIONS.QUESTION_BANK_AI_GENERATE)).toBe(true);

    expect(hasPermission("examiner", PERMISSIONS.EXAM_APPROVE)).toBe(true);
    expect(hasPermission("examiner", PERMISSIONS.ATTEMPT_FORCE_SUBMIT)).toBe(true);
    expect(hasPermission("school_admin", PERMISSIONS.EXAM_APPROVE)).toBe(true);
  });

  it("requires mandatory 2FA for super_admin and school_admin only", () => {
    expect(ADMIN_MFA_ROLES.has("super_admin")).toBe(true);
    expect(ADMIN_MFA_ROLES.has("school_admin")).toBe(true);
    expect(ADMIN_MFA_ROLES.has("examiner")).toBe(false);
    expect(ADMIN_MFA_ROLES.has("teacher")).toBe(false);
    expect(ADMIN_MFA_ROLES.has("student")).toBe(false);
  });
});
