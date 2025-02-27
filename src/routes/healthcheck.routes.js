import { Router as Route } from "express";

import { healthCheck } from "../controllers/healthCheck.controllers.js";

const router=Route();

router.route("/").get(healthCheck);

export default router;