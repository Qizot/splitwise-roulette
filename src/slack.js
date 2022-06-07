const fetch = require("node-fetch");

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

    return {
      user_id: userId,
      email: data.user.profile.email,
      real_name: data.user.real_name,
      real_name_normalized: data.user.profile.real_name_normalized,
      display_name: data.user.profile.display_name,
      display_name_normalized: data.user.profile.display_name_normalized,
      dot_name: data.user.name,
    };
  } catch (error) {
    console.log(error);

    return null;
  }
}

// returns a list of user ids that took part in given thread conversation
async function getThreadRepliesUsers(channelId, threadTs, token = TOKEN) {
  try {
    const response = await slackRequest(
      token,
      `conversations.replies?channel=${channelId}&ts=${threadTs}}`
    );

    const data = await response.json();

    return [...new Set(data.messages.map((message) => message.user))];
  } catch (error) {
    console.log(error);

    return [];
  }
}

function getBotMentionMessageUsers(blocks)  {
    return blocks
    .filter(({type}) => type === "rich_text")
    .map(({elements}) => 
      elements
      .filter(({type: elementType}) => elementType === "rich_text_section")
      .map(({elements}) => elements)
    )
    .flat(10)
    .filter(({type}) => type === "user")
    .map(({user_id}) => user_id)
}

async function sendDebtSummaryMessage(
  channel,
  threadTs,
  userDebts,
  token = TOKEN
) {
  if (userDebts.length < 1) return null;

  const [topDebt] = userDebts;

  let i = 0;
  const ranking = userDebts
    .map((userDebt) => {
      i += 1;
      return `${i}. ${userDebt.name} *${userDebt.debt.toFixed(2)}zł*\n`;
    })
    .join("");

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
            text: `*Zwycięzca (<@${topDebt.user_id}>):*\n ${topDebt.name} *${topDebt.debt.toFixed(
              2
            )}zł*`,
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
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
}

module.exports = {
  getUsersData,
  getThreadRepliesUsers,
  sendDebtSummaryMessage,
  getBotMentionMessageUsers
};
