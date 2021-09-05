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

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_KEY });

const databaseId = process.env.NOTION_DATABASE_ID;

const slackNotionId = {
  UT9G67J1Z: "f2ca3fc5-9ca1-46ed-be8b-fb618c56558a",
  U0185FAF1T5: "6718f0c7-f6e3-4c3a-9f65-e8344806b5b6",
  U025P5K0S0Z: "6f7ce62c-fa2e-4440-8805-72af5f937666",
  U021UR4DW5C: "8fd7689c-d795-4ae9-aa53-5846ac1569b7",
  U0224KFNYRW: "7c02e0ba-2aec-4696-a91d-ecaa01b616ce",
  U025J9SLXV3: "94f6b8b7-e8b0-4790-8265-f08e6b1d550c",
  UT9G67YFM: "6c3a6ec1-4b99-4e5c-8214-cea14fd9b142",
};

import he from "he";

import fs from "fs";
import { timeLog } from "console";

let rawdata = fs.readFileSync("./slack_emoticons_to_html_unicode.json");
let emojis = JSON.parse(rawdata);

const replaceEmojis = (string) => {
  var splitString = string.split(" ");
  splitString.forEach((word) => {
    for (var key in emojis) {
      if (word.search(":" + key + ":") != -1) {
        var regexKey = new RegExp(key, "gi");
        string = string.replace(regexKey, he.decode(emojis[key]));
      }
    }
  });
  string = string.replace(/:/gi, "");
  return string;
};

const newLinkItem = (plainText, link) => {
  var array = {
    type: "text",
    text: {
      content: plainText,
      link: {
        type: "url",
        url: link,
      },
    },
  };
  return array;
};

const newTextItem = (text) => {
  var array = {
    type: "text",
    text: {
      content: text,
    },
  };
  return array;
};

const newUserItem = (slackUserID, idDatabase) => {
  var array = {
    type: "mention",
    mention: {
      type: "user",
      user: { id: idDatabase[slackUserID] },
    },
  };
  return array;
};

const newCodeItem = (codeText) => {
  var array = {
    type: "text",
    text: {
      content: codeText,
    },
    annotations: {
      code: true,
    },
  };
  return array;
};

const newChild = (splitItem) => {
  console.log(splitItem)
  var notionAppendItem = [];

  splitItem.forEach((item) => {
    if (item.search("http") != -1) {
      item = item.replace("\n", "");
      let linkSplit = item.split("|");

      const notionLinkItem = newLinkItem(linkSplit[1], linkSplit[0]);
      notionAppendItem.push(notionLinkItem);
    } else if (item.search(":") != -1) {
      item = item.replace("\n", "");
      var string = replaceEmojis(item);
      const textItem = newTextItem(string);
      notionAppendItem.push(textItem);
    } else if (item.search("@") != -1) {
      item = item.replace("\n", "");
      var string = item.replace("@", "");
      const userItem = newUserItem(string, slackNotionId);
      notionAppendItem.push(userItem);
    } else if (item.search("`") != -1) {
      item = item.replace("\n", "");
      var splitString = item.split("`");
      console.log(splitString);
      const textItem = newTextItem(splitString[0]);
      notionAppendItem.push(textItem);
      console.log(textItem);
      const codeItem = newCodeItem(splitString[1]);
      notionAppendItem.push(codeItem);
      console.log(codeItem);
      if (splitString[2] != undefined) {
        const textItem2 = newTextItem(splitString[2]);
        notionAppendItem.push(textItem2);
        console.log(textItem2);
      }
    } else {
      item = item.replace("\n", "");
      const textItem = newTextItem(item);
      notionAppendItem.push(textItem);
    }
  });
  return notionAppendItem;
};

const newNotionItem = (slackMessage, userId) => {
  var newLineSplit = slackMessage.split("\n");
  newLineSplit = newLineSplit.filter(Boolean);

  const emptyBlock = {
    object: "block",
    type: "paragraph",
    paragraph: {
      text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    },
  };

  const notionItem = [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        text: [
          {
            type: "mention",
            mention: {
              type: "user",
              user: { id: slackNotionId[userId] },
            },
          },
          {
            type: "text",
            text: {
              content: " says:",
            },
          },
        ],
      },
    },
  ];

  newLineSplit.forEach((line) => {
    var regex = new RegExp(/[\<\>]/);

    var split = line.split(regex);

    var item = newChild(split);

    const childItem = {
      object: "block",
      type: "paragraph",
      paragraph: { text: item },
    };

    notionItem.push(childItem);
  });

  notionItem.push(emptyBlock);
  return notionItem;
};

const initialNotionItem = (slackMessage, userId) => {
  var newLineSplit = slackMessage.split("\n");
  newLineSplit = newLineSplit.filter(Boolean);

  const emptyBlock = {
    object: "block",
    type: "paragraph",
    paragraph: {
      text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    },
  };

  const notionItem = [];

  newLineSplit.forEach((line) => {
    var regex = new RegExp(/[\<\>]/);

    var split = line.split(regex);

    var item = newChild(split);

    const childItem = {
      object: "block",
      type: "paragraph",
      paragraph: { text: item },
    };

    notionItem.push(childItem);
  });

  notionItem.push(emptyBlock);
  return notionItem;
};

async function addItem(title, text, userId, ts, tags, link) {
  try {
    const tagArray = [];

    for (const tag of tags) {
      tagArray.push({ name: tag });
    }

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

      children: initialNotionItem(text, userId),
    });
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

    // const blockId = response.results[0].id;
    // const children = await notion.blocks.children.list({
    //   block_id: blockId,
    //   page_size: 50,
    // });
    // console.log(children.results);

    return response.results[0].id;
  } catch (error) {
    console.error(error);
  }
}

async function addBody(id, text, userId) {
  try {
    const response = await notion.blocks.children.append({
      block_id: id,
      children: newNotionItem(text, userId),
    });
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

const makeTitle = (text) => {
  var title = text.split(/[\n\!\?]/)[0];
  title = replaceEmojis(title);
  title = title.slice(0, 100);
  if (title.search("http") != -1 || title.search("mailto") != -1) {
    var regex = new RegExp(/[\<\>]/);
    var split = title.split(regex);
    title = "";

    split.forEach((line) => {
      if (line.search("http") != -1 || line.search("mailto") != -1) {
        let lineSplit = line.split("|");
        title += lineSplit[1];
      } else {
        title += line;
      }
    });
  }
  title = title.split(".");
  return title[0];
};

app.event("message", async ({ event, client }) => {
  console.log(event);
  if (event.channel == standupId) {
    var tags = await findTags(event.text);

    const title = await makeTitle(event.text);

    const slackLink = await app.client.chat.getPermalink({
      token: token,
      channel: event.channel,
      message_ts: event.ts,
    });

    try {
      if ("thread_ts" in event) {
        const pageId = await findDatabaseItem(event.thread_ts);
        addBody(pageId, event.text, event.user);
      } else {
        const notionItem = await addItem(
          title,
          event.text,
          event.user,
          event.ts,
          tags,
          slackLink.permalink
        );

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
