import "dotenv/config";
import { runSeed } from "./runSeed";

runSeed()
  .then((r) => {
    console.log("Seeded practice modules + sections.", r);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
