import express from "express";
import env from "./config/env.js";
import database from "./config/database.js";
import configRoutes from "./routes/_index.js";
import session from "express-session";
import logger from "./middleware/logger.js";
import path from "path";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const staticRoutes = express.static(path.join(__dirname, "/public"));

database();

app.use("/public", staticRoutes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: "nexus",
    secret: env.SESSION_SECRET,
    saveUninitialized: true,
    resave: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  })
);

if (env.NODE_ENV == "dev") {
  app.use(logger);
}

app.engine("handlebars", engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

configRoutes(app);

const server = app.listen(env.PORT, () => {
  if (env.NODE_ENV == "dev") {
    console.log(`Server listening on port ${env.PORT}.`);
  }
});

const io = new Server(server);

io.on("connection", (socket) => {
  console.log(`${socket.id} has connected.`);

  socket.on("joinRoom", (e) => {
    console.log(`${socket.id} has joined room ${e.room}`);
    socket.join(e.room);
    io.in(e.room).emit("joinMessage", {
      message: `${socket.id} has joined the room.`
    });
  });

  socket.on("message", (e) => {
    io.in(e.room).emit("joinMessage", {
      message: e.message
    });
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} has disconnected.`);
  });
});

export default app;
