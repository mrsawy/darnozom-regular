import { defineMiddlewares } from "@medusajs/framework/http";

export default defineMiddlewares({
  routes: [
    {
      // The digital-file upload body is the raw file, streamed to private
      // storage by the route — don't let the JSON body parser consume it.
      matcher: "/admin/digital-files/upload",
      method: ["POST"],
      bodyParser: false,
    },
  ],
});
