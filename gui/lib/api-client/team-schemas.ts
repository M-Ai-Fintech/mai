import { z } from "zod";

import { idSchema } from "./common-schemas";

export const teamMemberSchema = z.object({
  id: idSchema,
  displayName: z.string(),
  email: z.string().email(),
  role: z.string(),
  firmName: z.string(),
  avatarUrl: z.string().url().nullable(),
  active: z.boolean(),
});

export const teamAssignmentSchema = z.object({
  id: idSchema,
  teamMember: teamMemberSchema,
  assignmentRole: z.string(),
  side: z.enum(["buyer", "seller", "target", "neutral"]),
  isLead: z.boolean(),
});

export const assignmentWriteSchema = z.object({
  teamMemberId: idSchema,
  assignmentRole: z.string().trim().min(1),
  side: z.enum(["buyer", "seller", "target", "neutral"]),
  isLead: z.boolean(),
});

export const replaceAssignmentsSchema = z.object({
  version: z.number().int().positive(),
  assignments: z.array(assignmentWriteSchema),
});
