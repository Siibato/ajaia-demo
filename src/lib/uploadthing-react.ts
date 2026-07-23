import { generateReactHelpers } from "@uploadthing/react";
import type { OurRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurRouter>();
