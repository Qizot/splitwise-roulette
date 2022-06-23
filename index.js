const functions = require("@google-cloud/functions-framework");
const { verifySlackSignature } = require("./src/middleware/slack.js");
const {
  getUsersData,
  sendDebtSummaryMessage,
  getUsersFromEvent,
  getBotId,
  getTimeFromMessage,
  scheduleEvent,
} = require("./src/slack.js");
const { fetchUsersDebts, findSplitwiseUser } = require("./src/splitwise.js");

function bundleHandlers(handlers) {
  return async (req, res) => {
    let executeNext = true;

    const runNext = () => (executeNext = true);

    for (const handler of handlers) {
      if (executeNext) {
        executeNext = false;

        if (handler.constructor.name === "AsyncFunction") {
          await handler(req, res, runNext);
        } else {
          handler(req, res, runNext);
        }

        continue;
      }

      break;
    }
  };
}

function registerCloudFunction(name, ...handlers) {
  functions.http(name, bundleHandlers(handlers));
}

async function sendDebtMessage(event) {
  const { channel, thread_ts } = event;

  const users = await getUsersFromEvent(event);

  if (users.length === 0) {
    return res.send("No users, bye!");
  }

  const slackUsers = (
    await Promise.all(users.map((user) => getUsersData(user)))
  ).filter(({ email }) => email !== null && email !== undefined);

  const userDebts = await fetchUsersDebts();
  const presentUserDebts = userDebts
    .map((splitwiseUser) => {
      const mappedUser = findSplitwiseUser(splitwiseUser, slackUsers);

      if (mappedUser === undefined) {
        return undefined;
      }

      return {
        ...splitwiseUser,
        name: mappedUser.real_name,
        user_id: mappedUser.user_id,
      };
    })
    .filter((splitwiseUser) => splitwiseUser !== undefined);

  presentUserDebts.sort((a, b) => a.debt - b.debt);

  await sendDebtSummaryMessage(channel, thread_ts, presentUserDebts);
}

async function processEvent(event) {
  const botId = await getBotId();
  if (botId === event.user) {
    const oldEvent = JSON.parse(event.text);
    return await sendDebtMessage(oldEvent);
  }
  const timeSet = getTimeFromMessage(event.blocks);

  if (!timeSet) {
    return await sendDebtMessage(event);
  } else {
    return await scheduleEvent(event, timeSet, botId);
  }
}

async function handleRequest(req, res) {
  const { challenge, type, event } = req.body;

  // required for app url validation
  if (type === "url_verification") {
    return res.send(challenge);
  }

  // we only want to react on the bot being metntioned
  if (
    type === "event_callback" &&
    (event.type === "app_mention" || event.type === "message")
  ) {
    await processEvent(event);
    return res.status(200).send("ok");
  } else {
    return res.status(400).send("unhandled event");
  }
}

registerCloudFunction("slack-handler", verifySlackSignature, handleRequest);
