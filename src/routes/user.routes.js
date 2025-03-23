import { Router as Route } from "express";

import { registerUser,changeCurrentPassword, logout, loginUser, refreshAccessToken, updateAccountDetails, updateUserAvatar, updateCoverImage, getWatchHistory ,getCurrentUser,getUserChannelProfile} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router=Route();

//to upload files we need to use multer middleware

//unsecured routes -> accessible by anyone
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
//Note: router.route("/givenRoute").post(middleware1,middleware2,ControllerFunction);

//login
router.route("/login").post(loginUser);

//refresh token
router.route("/refreshToken").post(refreshAccessToken);

//secured routes -> accessble only if the user is logged in

router.route("/logout").post(verifyJWT,logout);
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/channels/:username").get(verifyJWT,getUserChannelProfile);
router.route("/update-account").patch(verifyJWT,updateAccountDetails);
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar); //upload.single("avatar")  to upload a single file with the field name "avatar"
router.route("/update-cover-image").patch(verifyJWT,upload.single("coverImage"),updateCoverImage); //upload.single("coverImage")  to upload a single file with the field name "coverImage"
router.route("/history").get(verifyJWT,getWatchHistory);
export default router;