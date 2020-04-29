/*
    ROS Javascript dynamic_reconfigure simple example
    Jinsun Park
    (zzangjinsun@3secondz.com)
*/

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const router = express.Router();
const YAML = require("yamljs");
const execSync = require("child_process").execSync;
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  "/api/getNodes",
  router.get("/", (req, res) => {
    const sampleDataWrapper = [];
    let sampleData = {};
    let list_nodes = execSync("rosrun dynamic_reconfigure dynparam list", { shell: "/bin/bash" }).toString();
    list_nodes = list_nodes.split("\n");

    for (let i = 0; i < list_nodes.length; i++) {
      let name_node = list_nodes[i];

      if (name_node == "") {
        continue;
      }

      // Get reconfigurable parameters
      let list_lets = execSync("rosrun dynamic_reconfigure dynparam get " + name_node).toString();

      // Parse using YAML
      list_lets = YAML.parse(list_lets);

      // Get keys
      let list_keys = Object.keys(list_lets);
      let list_types = [];

      // Get types of keys
      for (let j = 0; j < list_keys.length; j++) {
        list_types.push(typeof list_lets[list_keys[j]]);
      }

      // Log
      sampleData.Node = name_node;
      for (let j = 0; j < list_keys.length; j++) {
        // Ignore groups
        if (list_keys[j] == "groups") {
          continue;
        }
        sampleData[list_keys[j]] = list_lets[list_keys[j]];
      }
      sampleDataWrapper.push(sampleData);
    }
    res.status(200).send(sampleDataWrapper);
  })
);

app.listen(port, () => {
  console.log(`server on port : ${port}`);
});
