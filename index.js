import express from "express";
import bodyParser from "body-parser";

import { verifySlackSignature } from "./src/middleware/slack.js";
import { getThreadRepliesUsers, getUserRealName, sendDebtSummaryMessage } from "./src/slack.js";
import { fetchUsersDebts } from "./src/splitwise.js";

const app = express();

app.use(bodyParser.text({type: '*/*'}));

const port = 8080;

app.post("/slack-challenge", verifySlackSignature, async (req, res) => {
  const { challenge, type, event } = JSON.parse(req.body);

  // required for app url validation
  if (type === "url_verification") {
    return res.send(challenge);
  }

  // we only want to react on the bot being metntioned
  if (type === "event_callback" && event.type === "app_mention") {
    const { channel, thread_ts } = event;
    
    const users = await getThreadRepliesUsers(channel, thread_ts);
    
    if (users === null) {
      return res.send("No users, bye!")
    }
    const realNames = (await Promise.all(users.map(user => getUserRealName(user)))).filter(name => name !== null && name !== undefined)
    
    const userDebts = await fetchUsersDebts()
    
    const presentUserDebts = userDebts.filter(userDebt => realNames.includes(userDebt.name))
    
    presentUserDebts.sort((a, b) => a.debt - b.debt)
    
    await sendDebtSummaryMessage(channel, thread_ts, presentUserDebts)
  }
  

  return res.send("Go away...");
});

app.listen(port, () => console.log(`Listening on port ${port}`));
