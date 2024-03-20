import User from "../models/userModel.js";
import {
  validateSignupInput,
  validateLoginInput,
  validateUniqueUser
} from "../utils/validators.js";
import { hashPassword, comparePassword } from "../utils/password.js";

/**
 * @description Renders signup page
 * @route GET /signup
 * @access Public
 */
export const renderSignupPage = async (_req, res) => {
  return res.render("auth/signup");
};

/**
 * @description Renders login page
 * @route GET /login
 * @access Public
 */
export const renderLoginPage = async (_req, res) => {
  return res.render("auth/login");
};

/**
 * @description Creates an user
 * @route POST /signup
 * @access Public
 */
export const createUser = async (req, res) => {
  const { email, username, password } = req.body;

  try {
    validateSignupInput(email, username, password);
  } catch (error) {
    return res.status(400).render("auth/signup", { error: error.message });
  }

  try {
    validateUniqueUser(email, username);
  } catch (error) {
    return res.status(400).render("auth/signup", { error: error.message });
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({ email, username, hashedPassword });
  if (!user)
    return res
      .status(500)
      .render("signup", { error: "Unable to create an user." });

  req.session.user = {
    id: user._id,
    username: user.username,
    darkMode: user.darkMode
  };

  return res.status(201).redirect(`/user/${user._id}`);
};

/**
 * @description Authenticates an existing user
 * @route POST /login
 * @access Public
 */
export const authUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    validateLoginInput(username, password);
  } catch (error) {
    return res.status(400).render("auth/login", { error: error.message });
  }

  const user = await User.findOne({ username });
  if (!user)
    return res.status(400).render("auth/login", {
      error: "User does not exist."
    });

  const passwordMatch = await comparePassword(password, user.hashedPassword);
  if (!passwordMatch)
    return res.status(401).render("auth/login", {
      error: "Invalid username or password."
    });

  req.session.user = {
    id: user._id,
    username: user.username,
    darkMode: user.darkMode
  };

  return res.status(200).redirect(`/user/${user._id}`);
};

/**
 * @description Logs out an user
 * @route POST /logout
 * @access Public
 */
export const logout = async (req, res) => {
  req.session.destroy();

  return res.status(200).redirect("/");
};
