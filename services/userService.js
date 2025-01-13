// userService.js
const User = require("../models/User");

exports.getUserById = async (id) => {
  return User.findById(id).select("-password");
};
