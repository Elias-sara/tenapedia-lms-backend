// userController.js
const userService = require("../services/userService");

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching user profile", error: error.message });
  }
};
