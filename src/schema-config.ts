import { z } from "zod";
import * as fs from "node:fs/promises";

const serviceSchema = z.object({
  name: z.string().min(3).max(15),
  subdomain: z
    .string()
    .max(15)
    .regex(/^[a-z0-9-]*$/)
    .default(""),
  serviceType: z.enum(["frontend", "backend"]),
  buildType: z
    .array(z.enum(["development", "production", "test"]))
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Build types must be unique",
    })
    .default(["development", "production", "test"]),
});

const fsPathSchema = z.string().refine(
  async (path) => {
    try {
      await fs.access(path, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  },
  {
    message: "File or directory does not exist",
  },
);

const aliasNameSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^@[a-z0-9-]+$/);

const aliasesSchema = z.object({
  common: z.record(aliasNameSchema, fsPathSchema).optional(),
  frontend: z.record(aliasNameSchema, fsPathSchema).optional(),
  backend: z.record(aliasNameSchema, fsPathSchema).optional(),
});

export const projectSchema = z
  .object({
    name: z
      .string()
      .min(3, { message: "Project name must contain at least 3 characters" })
      .max(50, { message: "Project name must contain at most 50 characters" }),
    version: z.string().min(5).max(10),
    aliases: aliasesSchema.optional(),
    services: z.array(serviceSchema),
  })
  .strict();

export type LiknurConfig = z.infer<typeof projectSchema>;
