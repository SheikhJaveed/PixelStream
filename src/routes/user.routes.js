import { Router as Route } from "express";

import { registerUser } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
const router=Route();

//to upload files we need to use multer middleware
router.route("/register").post(
    upload.fields([
        {
            name:"avatar", 
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),registerUser);

export default router;