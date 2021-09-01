// Require the Bolt package (github.com/slackapi/bolt)
import pkg from "@slack/bolt";
const { App } = pkg;

var token = process.env.SLACK_BOT_TOKEN;
var appToken = process.env.SLACK_APP_TOKEN;
var userToken = process.env.SLACK_USER_TOKEN;

const app = new App({
  token: token,
  appToken: appToken,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

const slackNotionId = {
  UT9G67J1Z: "f2ca3fc5-9ca1-46ed-be8b-fb618c56558a",
  U0185FAF1T5: "6718f0c7-f6e3-4c3a-9f65-e8344806b5b6",
  U025P5K0S0Z: "6f7ce62c-fa2e-4440-8805-72af5f937666",
  U021UR4DW5C: "8fd7689c-d795-4ae9-aa53-5846ac1569b7",
  U0224KFNYRW: "7c02e0ba-2aec-4696-a91d-ecaa01b616ce",
  U025J9SLXV3: "94f6b8b7-e8b0-4790-8265-f08e6b1d550c",
  UT9G67YFM: "6c3a6ec1-4b99-4e5c-8214-cea14fd9b142",
};

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_KEY });

const databaseId = process.env.NOTION_DATABASE_ID;

async function addItem(title, text, userId, ts, tags, link) {
  try {
    const tagArray = [];

    for (const tag of tags) {
      tagArray.push({ name: tag });
    }

    console.log(tagArray);

    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: title,
              },
            },
          ],
        },
        Person: {
          type: "people",
          people: [
            {
              object: "user",
              id: slackNotionId[userId],
            },
          ],
        },
        TS: {
          type: "rich_text",
          rich_text: [
            {
              type: "text",
              text: {
                content: ts,
              },
            },
          ],
        },
        Tags: {
          type: "multi_select",
          multi_select: tagArray,
        },
        "Link to Slack": {
          type: "rich_text",
          rich_text: [
            {
              type: "text",
              text: {
                content: link,
              },
            },
          ],
        },
      },

      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            text: [
              {
                type: "text",
                text: {
                  content: text,
                },
              },
            ],
          },
        },
      ],
    });
    console.log(response);
    console.log("Success! Entry added.");
    return response.url;
  } catch (error) {
    console.error(error);
  }
}

async function findDatabaseItem(threadts) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "TS",
        text: {
          contains: threadts,
        },
      },
    });
    console.log(response);

    const blockId = response.results[0].id;
    const children = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 50,
    });
    console.log(children.results[2].paragraph);

    return response.results[0].id;
  } catch (error) {
    console.error(error);
  }
}

async function addBody(id, text, user) {
  try {
    const response = await notion.blocks.children.append({
      block_id: id,
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            text: [
              // {
              //   type: 'mention',
              //   mention: {
              //     type: 'user',
              //     user: {
              //       object: 'user',
              //       id: slackNotionId[user],
              //     }
              //   }
              // },
              {
                type: "text",
                text: {
                  content: "@" + user + " replied: '" + text + "'",
                },
              },
            ],
          },
        },
      ],
    });
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}

async function findConversation(name) {
  try {
    var conversationId = "";
    // Call the conversations.list method using the built-in WebClient
    const result = await app.client.conversations.list({
      // The token you used to initialize your app
      appToken: appToken,
    });

    for (const channel of result.channels) {
      if (channel.name === name) {
        conversationId = channel.id;
        break;
      }
    }
    return conversationId;
  } catch (error) {
    console.error(error);
  }
}

const standupId = await findConversation("test-standup");

async function replyMessage(id, ts, link) {
  try {
    // Call the chat.postMessage method using the built-in WebClient
    const result = await app.client.chat.postMessage({
      // The token you used to initialize your app
      token: token,
      channel: id,
      thread_ts: ts,
      text: link,
    });

    console.log(result);
  } catch (error) {
    console.error(error);
  }
}

const findTags = (text) => {
  let tags = [];
  let index = text.toLowerCase().search("tags: ");
  if (index != -1) {
    index += 6;
    const tagList = text.slice(index, text.length).split("\n")[0];
    tags = tagList.split(", ");
  }
  return tags;
};

app.event("message", async ({ event, client }) => {
  console.log("event: ", event);
  if (event.channel == standupId) {
    var tags = await findTags(event.text);

    var title = event.text.split("\n")[0];
    if (title != undefined) {
      title = title.slice(0, 50);
    }

    const userIdentity = await app.client.users.profile.get({
      token: userToken,
      user: event.user,
    });

    const slackLink = await app.client.chat.getPermalink({
      token: token,
      channel: event.channel,
      message_ts: event.ts,
    });

    const userName = userIdentity.profile.display_name;
    try {
      if ("thread_ts" in event) {
        const pageId = await findDatabaseItem(event.thread_ts);
        addBody(pageId, event.text, userName);
      } else {
        const notionItem = await addItem(
          title,
          event.text,
          event.user,
          event.ts,
          tags,
          slackLink.permalink
        );

        console.log(notionItem);
        replyMessage(standupId, event.ts, notionItem);
      }
    } catch (error) {
      console.error(error);
    }
  }
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();
