const admin = require("../index");

// Check user authentication token and then fetch the user
const authenticateUser = async (req, res, next) => {
  try {
    const header = req.header.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).send("Unauthorized access!");
    }

    const token = header.split("Bearer ")[1];

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).send("Invalid token");
  }
};

module.exports = authenticateUser;
