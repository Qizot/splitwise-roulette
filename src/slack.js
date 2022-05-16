const fetch = require("node-fetch")

const BASE = "https://slack.com/api/";
const TOKEN = process.env.SLACK_TOKEN;

function slackRequest(token, path) {
  return fetch(BASE + path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function getUsersData(userId, token = TOKEN) {
  try {
    const response = await slackRequest(token, `users.info?user=${userId}`);

    const data = await response.json();

    return {name: data.user.real_name, email: data.user.profile.email};
  } catch (error) {
    console.log(error);

    return null;
  }
}

// returns a list of user ids that took part in given thread conversation
async function getThreadRepliesUsers(
  channelId,
  threadTs,
  token = TOKEN
) {
  try {
    const response = await slackRequest(
      token,
      `conversations.replies?channel=${channelId}&ts=${threadTs}}`
    );

    const data = await response.json();

    return [...new Set(data.messages.map((message) => message.user))];
  } catch (error) {
    console.log(error);

    return null;
  }
}

async function sendDebtSummaryMessage(channel, threadTs, userDebts, token = TOKEN) {
  if (userDebts.length < 1) return null
  
  const [topDebt] = userDebts
  
  let i = 0;
  const ranking = userDebts.map(userDebt => {
    i += 1;
    return `${i}. ${userDebt.name} *${userDebt.debt.toFixed(2)}zł*\n`
  }).join("")
  
  const payload = {
    channel,
    thread_ts: threadTs,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Wyniki ruletki",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Zwycięzca:*\n ${topDebt.name} *${topDebt.debt.toFixed(2)}zł*`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Ranking*\n${ranking}`,
        },
      },
    ],
  };
  
  await fetch(BASE + "chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });
}

module.exports = { getUsersData, getThreadRepliesUsers, sendDebtSummaryMessage }

