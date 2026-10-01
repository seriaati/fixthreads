import express from "express";
const router = express.Router();

import postsController from "./posts";
import usersController from "./users";
import metaController from "./meta";
import cv2testController from "./cv2test";

router.use("/", metaController);
router.use("/", cv2testController);
router.use("/", postsController);
router.use("/", usersController);

export default router;
