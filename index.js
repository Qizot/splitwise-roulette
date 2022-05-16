const functions = require('@google-cloud/functions-framework')
const { verifySlackSignature } = require("./src/middleware/slack.js")
const { getThreadRepliesUsers, getUsersData, sendDebtSummaryMessage } = require("./src/slack.js")
const { fetchUsersDebts } = require("./src/splitwise.js")


function bundleHandlers(handlers) {
  return async (req, res) =>  {
    let executeNext = true
    
    const runNext = () => executeNext = true
    
    for (const handler of handlers) {
      if (executeNext) {
        executeNext = false

        if (handler.constructor.name === 'AsyncFunction') {
          await handler(req, res, runNext)
        } else {
          handler(req, res, runNext)
        }
        
        continue
      } 

      break
    }
  }
}

function registerCloudFunction(name, ...handlers)  {
  functions.http(name, bundleHandlers(handlers))
}


async function handleRequest(req, res) {
  const { challenge, type, event } = req.body;

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
    const usersData = (await Promise.all(users.map(user => getUsersData(user))))
      .filter(({email}) => email !== null && email !== undefined)
    
    const emails = usersData.map(({email}) => email)
    
    const userDebts = await fetchUsersDebts()
    const presentUserDebts = userDebts
      .filter(userDebt => emails.includes(userDebt.email))

    presentUserDebts.sort((a, b) => a.debt - b.debt)
    
    await sendDebtSummaryMessage(channel, thread_ts, presentUserDebts.map(userDebt => {
      const u = usersData.find(({email}) => email === userDebt.email);

      return {...userDebt, name: u.name}
    }))
    
    return res.status(200).send("ok")
  } else {
    return res.status(400).send("unhandled event")
  }
  
}
  
registerCloudFunction("slack-handler", verifySlackSignature, handleRequest)