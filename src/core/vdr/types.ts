import { z } from "npm:zod";

export const VDRDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  folderId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type VDRDocument = z.infer<typeof VDRDocumentSchema>;

export const VDRFolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type VDRFolder = z.infer<typeof VDRFolderSchema>;

export const SupergoodConfigSchema = z.object({
  apiKey: z.string(),
  clientId: z.string().optional(),
  proxyUrl: z.string().url().optional(),
});

export type SupergoodConfig = z.infer<typeof SupergoodConfigSchema>;

export const IDealsDocumentSchema = z.object({
  FileId: z.number(),
  FileName: z.string(),
  FileSize: z.number(),
  MimeType: z.string(),
  FolderId: z.number().optional(),
  CreationDate: z.string(),
  LastModified: z.string(),
});
export type IDealsDocument = z.infer<typeof IDealsDocumentSchema>;

export const IntralinksDocumentSchema = z.object({
  id: z.number(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  parentId: z.number().optional(),
  createdOn: z.string(),
  modifiedOn: z.string(),
});
export type IntralinksDocument = z.infer<typeof IntralinksDocumentSchema>;
