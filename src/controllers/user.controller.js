import ChannelService from "../services/channel.service.js";
import PrivateMessageService from "../services/privateMessage.service.js";
import ServerService from "../services/server.service.js";
import UserService from "../services/user.service.js";
import { BaseError, InternalServerError } from "../utils/errors.js";
import { UserValidator } from "../utils/validators.js";

export default class UserController {
  /**
   * @route GET /user/:userId
   * @access Public
   */
  static renderUserProfilePage = async (req, res) => {
    try {
      if (
        req.session.user &&
        req.session.user.id &&
        req.session.user.id === req.params.userId
      ) {
        const userId = UserValidator.validateMongooseId(
          req.params.userId,
          "userId"
        );

        const user = await UserService.getUserById(userId);

        const servers = await Promise.all(
          user.servers.map(async (serverId) => {
            const server = await ServerService.getServerById(serverId);

            return {
              id: serverId,
              name: server.name
            };
          })
        );

        const friends = await Promise.all(
          user.friends.map(async (userId) => {
            const friend = await UserService.getUserById(userId);

            return {
              id: userId,
              username: friend.username
            };
          })
        );

        const friendRequests = await Promise.all(
          user.friendRequests.map(async (userId) => {
            const sender = await UserService.getUserById(userId);

            return {
              id: userId,
              username: sender.username
            };
          })
        );

        return res.status(200).render("user/profile", {
          username: user.username,
          bio: user.bio,
          theme: user.theme,
          servers: servers,
          friends: friends,
          friendRequests: friendRequests,
          owner: true
        });
      } else {
        const userId = UserValidator.validateMongooseId(
          req.params.userId,
          "userId"
        );

        const user = await UserService.getUserById(userId);

        return res.status(200).render("user/profile", {
          username: user.username,
          bio: user.bio,
          owner: false
        });
      }
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        if (!(error instanceof InternalServerError)) {
          return res.status(error.statusCode).render("error", {
            statusCode: error.statusCode,
            message: error.message
          });
        } else {
          return res.status(error.statusCode).render("error", {
            statusCode: error.statusCode,
            message: error.message
          });
        }
      } else {
        console.log(error);
        return res.status(500).render("error", {
          statusCode: 500,
          message: "Code went boom."
        });
      }
    }
  };

  /**
   * @route POST /api/user/login
   * @access Public
   */
  static loginUser = async (req, res) => {
    try {
      const { username, password } = UserValidator.validateLoginCredentials(
        req.body.username,
        req.body.password
      );

      const user = await UserService.authenticateCredentials(
        username,
        password
      );

      req.session.user = {
        id: user.id,
        username: user.username,
        bio: user.bio,
        theme: user.theme
      };

      return res.status(200).json({
        data: {
          url: `/user/${user.id}`
        }
      });
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.log(error);
        return res.status(500).json({ error: "Code went boom." });
      }
    }
  };

  /**
   * @route POST /api/user/logout
   * @access Public
   */
  static logoutUser = async (req, res) => {
    req.session.destroy();
    return res.status(204).redirect("/");
  };

  /**
   * @route GET /api/user
   * @access Public
   */
  static getUsers = async (_req, res) => {
    try {
      const users = await UserService.getUsers();

      return res.status(200).json({ data: { users: users } });
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.log(error);
        return res.status(500).json({ error: "Code went boom." });
      }
    }
  };

  /**
   * @route POST /api/user
   * @access Public
   */
  static createUser = async (req, res) => {
    try {
      const { email, username, password } = UserValidator.validateSignupInfo(
        req.body.email,
        req.body.username,
        req.body.password
      );

      const user = await UserService.createUser(email, username, password);

      req.session.user = {
        id: user.id,
        username: user.username,
        bio: user.bio,
        theme: user.theme
      };

      return res.status(201).json({
        data: {
          url: `/user/${user.id}`
        }
      });
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.log(error);
        return res.status(500).json({ error: "Code went boom." });
      }
    }
  };

  /**
   * @route PATCH /api/user
   * @access Private
   */
  static updateUser = async (req, res) => {
    try {
      const { bio, theme } = UserValidator.validateUpdateInfo(
        req.body.bio,
        req.body.theme
      );
      const userId = req.session.user.id;

      await UserService.updateUser(userId, bio, theme);

      return res.status(204).json();
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.log(error);
        return res.status(500).json({ error: "Code went boom." });
      }
    }
  };

  /**
   * @route DELETE /api/user
   * @access Private
   */
  static deleteUser = async (req, res) => {
    try {
      const userId = req.session.user.id;

      const removedUser = await UserService.getUserById(userId);

      const associatedUsers = await UserService.getAssociatedUsers(
        removedUser.id
      );
      associatedUsers.forEach(async (associatedUser) => {
        await UserService.removeUserAssociations(associatedUser, removedUser);
      });

      const joinedServers = await ServerService.getJoinedServers(
        removedUser.id
      );
      joinedServers.forEach(async (joinedServer) => {
        if (removedUser.id === joinedServer.creatorId) {
          await ServerService.deleteServer(joinedServer, removedUser);
          await ChannelService.deleteServerChannels(joinedServer);
        } else {
          await ServerService.removeUser(joinedServer, removedUser);
        }
      });

      await PrivateMessageService.deleteUserPrivateMessages(removedUser);
      await UserService.deleteUser(removedUser.id);

      req.session.destroy();

      return res.status(204).json();
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.log(error);
        return res.status(500).json({ error: "Code went boom." });
      }
    }
  };

  /**
   * @route POST /api/user/friend/send
   * @access Private
   */
  static sendFriendRequest = async (req, res) => {
    try {
      const { username } = UserValidator.validateCreateFriendRequestInfo(
        req.body.username
      );
      const userId = req.session.user.id;

      const target = await UserService.getUserByUsername(username);
      const requester = await UserService.getUserById(userId);

      if (requester.friendRequests.includes(target.id)) {
        await UserService.sendFriendRequest(target, requester);
        await UserService.acceptFriendRequest(target, requester);
        await PrivateMessageService.createPrivateMessage(target, requester);
      } else {
        await UserService.sendFriendRequest(target, requester);
      }

      return res.status(204).json();
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.log(error);
        return res.status(500).json({ error: "Code went boom." });
      }
    }
  };

  /**
   * @route DELETE /api/user/friend/reject
   * @access Private
   */
  static rejectFriendRequest = async (req, res) => {
    try {
      const requesterId = UserValidator.validateMongooseId(
        req.body.requesterId,
        "requesterId"
      );
      const userId = req.session.user.id;

      const target = await UserService.getUserById(userId);
      const requester = await UserService.getUserById(requesterId);

      await UserService.rejectFriendRequest(target, requester);

      return res.status(204).json();
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.log(error);
        return res.status(500).json({ error: "Code went boom." });
      }
    }
  };

  /**
   * @route POST /api/user/friend
   * @access Private
   */
  static addFriend = async (req, res) => {
    try {
      const requesterId = UserValidator.validateMongooseId(
        req.body.requesterId,
        "requesterId"
      );
      const userId = req.session.user.id;

      const target = await UserService.getUserById(userId);
      const requester = await UserService.getUserById(requesterId);

      await UserService.acceptFriendRequest(target, requester);
      await PrivateMessageService.createPrivateMessage(target, requester);

      return res.status(200).json({
        data: {
          id: requester.id,
          username: requester.username
        }
      });
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.log(error);
        return res.status(500).json({ error: "Code went boom." });
      }
    }
  };

  /**
   * @route DELETE /api/user/friend
   * @access Private
   */
  static removeFriend = async (req, res) => {
    try {
      const friendId = UserValidator.validateMongooseId(
        req.body.friendId,
        "friendId"
      );
      const userId = req.session.user.id;

      const userA = await UserService.getUserById(friendId);
      const userB = await UserService.getUserById(userId);

      await PrivateMessageService.deletePrivateMessage(userA, userB);
      await UserService.removeFriend(userA, userB);

      return res.status(204).json();
    } catch (error) {
      if (error instanceof BaseError) {
        console.log(`${error.constructor.name} ${error.toString()}`);
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.log(error);
        return res.status(500).json({ error: "Code went boom." });
      }
    }
  };
}
