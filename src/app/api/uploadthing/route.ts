import { createRouteHandler } from "uploadthing/next";
import { ourRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourRouter,
});
