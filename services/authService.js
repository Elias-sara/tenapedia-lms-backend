const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.register = async ({
  firstName,
  lastName,
  email,
  password,
  phone,
  role,
}) => {
  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    phone,
    role,
  });
  await user.save();
  return { message: "User registered successfully" };
};

exports.login = async ({ email, password }) => {
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error("User not found:", email);
      throw new Error("Invalid email or password");
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error("Password mismatch for user:", email);
      throw new Error("Invalid email or password");
    }

    // Generate JWT
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return {
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("Error during login:", error.message);
    throw error;
  }
};
