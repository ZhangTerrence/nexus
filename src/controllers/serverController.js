import Channel from "../models/channelModel.js";
import Server from "../models/serverModel.js";
import {
  validateServerCreationInput,
  validateUniqueServer
} from "../utils/validators.js";
import mongoose from "mongoose";

/**
 * @description Renders a server's main page
 * @route Get /server/:serverId
 * @access Public
 */
export const renderServerPage = async (req, res) => {
  const { serverId } = req.params;

  if (!serverId)
    return res.render("error/404", {
      statusCode: 404,
      error: "Server not found."
    });

  const server = await Server.findById(serverId);
  if (!server)
    return res.render("error/404", {
      statusCode: 404,
      error: "Server not found."
    });

  return res.render("server/server", {
    name: server.name,
    description: server.description
  });
};

/**
 * @description Creates a server
 * @route POST /server
 * @access Private
 */
export const createServer = async (req, res) => {
  const { name } = req.body;

  try {
    validateServerCreationInput(name);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    validateUniqueServer(name);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const serverId = new mongoose.Types.ObjectId();

  const channel = await Channel.create({
    name: "general",
    serverId
  });
  if (!channel)
    return res.status(500).json({ error: "Unable to create general channel." });

  const server = await Server.create({
    _id: serverId,
    name,
    creatorId: req.session.user.id,
    users: [
      {
        id: req.session.user.id,
        permissionLevel: 9
      }
    ],
    channels: [channel._id]
  });
  if (!server)
    return res.status(500).json({ error: "Unable to create server." });

  console.log(server);

  return res.status(201).redirect(`/server/${server._id}`);
};
