const User = require("../models/User");

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error." });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio, avatar } = req.body;

    const user = await User.findById(req.user.id);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio) user.profile.bio = bio;
    if (avatar) user.profile.avatar = avatar;

    await user.save();

    res.status(200).json({ message: "Profile updated successfully.", user });
  } catch (error) {
    res.status(500).json({ error: "Server error." });
  }
};
