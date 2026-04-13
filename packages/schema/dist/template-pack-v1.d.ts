import { z } from "zod";
export declare const TEMPLATE_PACK_SCHEMA_VERSION: "1.0.0";
export declare const templatePackEntrySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    icon: z.ZodString;
    color: z.ZodEnum<{
        cyan: "cyan";
        purple: "purple";
        green: "green";
        pink: "pink";
        orange: "orange";
    }>;
    category: z.ZodString;
    profile: z.ZodString;
    description: z.ZodString;
    prompt: z.ZodString;
    goals: z.ZodArray<z.ZodString>;
    suggestedSkills: z.ZodArray<z.ZodString>;
    defaultModel: z.ZodString;
    timeoutMinutes: z.ZodNumber;
}, z.core.$strip>;
export declare const templatePackManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    id: z.ZodString;
    name: z.ZodString;
    version: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    templates: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        icon: z.ZodString;
        color: z.ZodEnum<{
            cyan: "cyan";
            purple: "purple";
            green: "green";
            pink: "pink";
            orange: "orange";
        }>;
        category: z.ZodString;
        profile: z.ZodString;
        description: z.ZodString;
        prompt: z.ZodString;
        goals: z.ZodArray<z.ZodString>;
        suggestedSkills: z.ZodArray<z.ZodString>;
        defaultModel: z.ZodString;
        timeoutMinutes: z.ZodNumber;
    }, z.core.$strip>>;
    extensions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
export type TemplatePackManifestV1 = z.infer<typeof templatePackManifestSchema>;
export declare function parseTemplatePackManifestV1(input: unknown): {
    ok: true;
    data: TemplatePackManifestV1;
} | {
    ok: false;
    error: z.ZodError;
};
//# sourceMappingURL=template-pack-v1.d.ts.map