// const express = require("express");
// const router = express.Router();
// const authController = require("../controllers/authController");

// router.post("/register", authController.register);
// router.post("/login", authController.login);

// module.exports = router;
const express = require("express");
const { register, login } = require("../controllers/authController"); // Destructure specific functions
const router = express.Router();

router.post("/register", register); // Use shorter function names
router.post("/login", login);

module.exports = router;
