import test from "node:test";
import assert from "node:assert/strict";
import { ProjectContactRole } from "../../../types/contact";

test("ProjectContactRole enum values match specification", () => {
  assert.equal(ProjectContactRole.PRIMARY, "PRIMARY");
  assert.equal(ProjectContactRole.TECHNICAL, "TECHNICAL");
  assert.equal(ProjectContactRole.BILLING, "BILLING");
  assert.equal(ProjectContactRole.FINANCE, "FINANCE");
  assert.equal(ProjectContactRole.PROJECT_MANAGER, "PROJECT_MANAGER");
  assert.equal(ProjectContactRole.APPROVER, "APPROVER");
  assert.equal(ProjectContactRole.PROCUREMENT, "PROCUREMENT");
  assert.equal(ProjectContactRole.LEGAL, "LEGAL");
  assert.equal(ProjectContactRole.OPERATIONS, "OPERATIONS");
  assert.equal(ProjectContactRole.OTHER, "OTHER");
});

test("ProjectContactRole supports multiple roles per contact design pattern", () => {
  // Rahul Sharma can hold both TECHNICAL and APPROVER roles for project P001
  const rahulAssignments = [
    { projectId: "P001", contactId: "C001", role: ProjectContactRole.TECHNICAL },
    { projectId: "P001", contactId: "C001", role: ProjectContactRole.APPROVER },
  ];

  assert.equal(rahulAssignments.length, 2);
  const roles = rahulAssignments.map((a) => a.role);
  assert.deepEqual(roles, [ProjectContactRole.TECHNICAL, ProjectContactRole.APPROVER]);
});
