import userRoutes from "./userRoutes.js";
// import io from "../ws.js";

const constructorMethod = (app) => {
  app.use("/:id", (req, res) => {
    res.status(200).render("home", {
      title: req.params.id,
      messages: []
    });
  });

  app.use("/api/users", userRoutes);

  app.use("*", (_req, res) => {
    return res.status(404).json({ error: "Route not found." });
  });
};

export default constructorMethod;
