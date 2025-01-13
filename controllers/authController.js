const authService = require("../services/authService");

exports.register = async (req, res) => {
  try {
    // Validate request body
    const { firstName, lastName, email, password, phone, role } = req.body;
    if (!firstName || !lastName || !email || !password || !phone || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await authService.register({
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
    });
    res.status(201).json(result);
  } catch (error) {
    console.error(error); // Log error for debugging
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const result = await authService.login({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(401).json({ message: error.message });
  }
};
