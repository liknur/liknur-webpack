import { PathLike } from "fs";
import { z } from "zod";
import YAML from "yaml";
import * as fs from "node:fs/promises";

const serviceSchema = z.object({
  name: z.string().min(3).max(15),
  subdomain: z
    .string()
    .max(15)
    .regex(/^[a-z0-9-]*$/)
    .default(""),
  ['service-type']: z.enum(["frontend", "backend"]),
  ['build-type']: z
    .array(z.enum(["development", "production", "test"]))
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Build types must be unique",
    })
    .default(["development", "production", "test"]),
  ['config-sections']: z.array(z.string()).optional(),
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

const settingsSchema = z.object({
  ['frontend-webpack-config']: z.string(fsPathSchema).optional(),
});

const projectSchema = z
  .object({
    name: z
      .string()
      .min(3, { message: "Project name must contain at least 3 characters" })
      .max(50, { message: "Project name must contain at most 50 characters" }),
    version: z.string().min(5).max(10),
    settings: settingsSchema.optional(),
    aliases: aliasesSchema.optional(),
    services: z.array(serviceSchema),
  })
  .strict();

export type LiknurConfig = {
  parsed: z.infer<typeof projectSchema>;
  file: PathLike;
};

interface ParseResultOk {
  readonly success: true;
  readonly data: LiknurConfig;
}

interface ParseResultError {
  readonly success: false;
  readonly errors: string[];
}

type ParseResult = ParseResultOk | ParseResultError;

export async function parseConfiguration(
  configFile: PathLike,
): Promise<ParseResult> {
  const raw = await fs.readFile(configFile, "utf-8");

  let config;
  try {
    config = YAML.parse(raw) as LiknurConfig;
  } catch (error) {
    console.error(error);
    return { success: false, errors: ["Error parsing YAML"] };
  }

  try {
    const result = await projectSchema.parseAsync(config);
    const configResult = { parsed: result, file: configFile };
    return { success: true, data: configResult };
  } catch (erro) {
    if (erro instanceof z.ZodError) {
      return {
        success: false,
        errors: erro.errors.map(
          (e) => `Field '${e.path.join(".") || "root"}': ${e.message}`,
        ),
      };
    } else {
      return { success: false, errors: ["Unknown error"] };
    }
  }
}
