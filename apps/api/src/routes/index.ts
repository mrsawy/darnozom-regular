import { Router, type IRouter } from "express";
import { requireAuth, loadUserRole } from "../middlewares/authMiddleware";
import healthRouter from "./health";
import storageRouter from "./storage";
import documentsRouter from "./documents/index";
// NOT MOUNTED — see the router.use block below.
// import conversationsRouter from "./conversations/index";
import contentRouter from "./content/index";
import clientsRouter from "./clients/index";
import reportsRouter from "./reports/index";
import orchestratorRouter from "./orchestrator/index";
import assessmentsRouter from "./assessments/index";
import usersRouter from "./users/index";
import rfpRouter from "./rfp/index";
import contactRouter from "./contact/index";
import whatsappRouter from "./whatsapp/index";
import emailRouter from "./email/index";
import analyticsRouter from "./analytics/index";
import booksRouter from "./books/index";
import tenantsRouter from "./tenants/index";
import tenantsPublicRouter from "./tenants/public";
import academyRouter from "./academy/index";
import eventsRouter from "./events/index";
import mobileChatRouter from "./mobile-chat/index";
import storeCoursesRouter from "./store-courses/index";
import storeAppsRouter from "./store-apps/index";
import ordersRouter from "./orders/index";
import shippingRatesRouter from "./shipping-rates/index";
import adminRouter from "./admin/index";
import jobApplicationsRouter from "./job-applications/index";
import jobsRouter from "./jobs/index";
import accountRouter from "./account/index";
import consultationsRouter from "./consultations/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rfpRouter);
router.use(contactRouter);
router.use(tenantsPublicRouter);
router.use(mobileChatRouter);

router.use(booksRouter);
router.use(academyRouter);
router.use(eventsRouter);
router.use(storeCoursesRouter);
router.use(storeAppsRouter);
router.use(ordersRouter);
router.use(shippingRatesRouter);
router.use(adminRouter);
router.use(jobApplicationsRouter);
router.use(jobsRouter);
router.use(accountRouter);
router.use(consultationsRouter);

// Storage must be reachable for anonymous storefront images (book covers etc.).
// Sensitive keys still require auth inside the router.
router.use(storageRouter);

router.use(requireAuth);
router.use(loadUserRole);

router.use(usersRouter);
router.use(tenantsRouter);
router.use(clientsRouter);
router.use(reportsRouter);
router.use(documentsRouter);
// conversationsRouter (and the attachments router it mounts) is deliberately
// NOT mounted. The `conversations` table has no owner column and these routes
// filter only by conversation id, so any signed-in user could list, read, and
// delete every other user's conversations, messages, and attachments.
//
// Nothing in this deployment calls /api/conversations: the web client never
// does, and the mobile app uses /api/mobile/chat/conversations, which is the
// separate mobileChatRouter above. Only the darnozom-agent artifact — not
// deployed here — uses these routes.
//
// To re-enable: add an owner column to `conversations`, backfill it, filter
// every query by the signed-in user, then restore the import and this line.
// router.use(conversationsRouter);
router.use(contentRouter);
router.use(orchestratorRouter);
router.use(assessmentsRouter);
router.use(whatsappRouter);
router.use(emailRouter);
router.use(analyticsRouter);

export default router;
