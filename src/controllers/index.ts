import express from "express";
const router = express.Router();

import postsController from "./posts";
import usersController from "./users";
import metaController from "./meta";
import mediaController from "./media";

router.use("/", metaController);
router.use("/", mediaController);
router.use("/", postsController);
router.use("/", usersController);

export default router;
