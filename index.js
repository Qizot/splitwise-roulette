import express from "express";
import bodyParser from "body-parser";

import { verifySlackSignature } from "./src/middleware/slack.js";
import { getThreadRepliesUsers, getUsersData, sendDebtSummaryMessage } from "./src/slack.js";
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
    const usersData = (await Promise.all(users.map(user => getUsersData(user)))).filter(({email}) => email !== null && email !== undefined)
    
    const emails = usersData.map(({email}) => email)
    
    const userDebts = await fetchUsersDebts()
    const presentUserDebts = userDebts
      .filter(userDebt => emails.includes(userDebt.email))

    presentUserDebts.sort((a, b) => a.debt - b.debt)
    
    await sendDebtSummaryMessage(channel, thread_ts, presentUserDebts.map(userDebt => {
      const u = usersData.find(({email}) => email === userDebt.email);

      return {...userDebt, name: u.name}
    }))
  }
  

  return res.send("Go away...");
});

app.listen(port, () => console.log(`Listening on port ${port}`));
