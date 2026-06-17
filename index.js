const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Shopify app is connected 🚀");
});

// ✅ SHTO KËTË
app.get("/auth/callback", (req, res) => {
  res.send("Callback works ✔");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
