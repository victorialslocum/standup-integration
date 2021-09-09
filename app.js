// Require the Bolt package (github.com/slackapi/bolt)
import pkg from "@slack/bolt";
const { App } = pkg;

// create variables for Slack Bot, App, and User tokens
const token = process.env.SLACK_BOT_TOKEN;
const appToken = process.env.SLACK_APP_TOKEN;
const userToken = process.env.SLACK_USER_TOKEN;

// create Slack app
const app = new App({
  token: token,
  appToken: appToken,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

// create Notion client
import { Client } from "@notionhq/client";
const notion = new Client({ auth: process.env.NOTION_KEY });

// create variable for database ID
const databaseId = process.env.NOTION_DATABASE_ID;

// Slack user ID to Notion user ID dictionary
const slackNotionId = {
  UT9G67J1Z: "f2ca3fc5-9ca1-46ed-be8b-fb618c56558a",
  U0185FAF1T5: "6718f0c7-f6e3-4c3a-9f65-e8344806b5b6",
  U025P5K0S0Z: "6f7ce62c-fa2e-4440-8805-72af5f937666",
  U021UR4DW5C: "8fd7689c-d795-4ae9-aa53-5846ac1569b7",
  U0224KFNYRW: "7c02e0ba-2aec-4696-a91d-ecaa01b616ce",
  U025J9SLXV3: "94f6b8b7-e8b0-4790-8265-f08e6b1d550c",
  UT9G67YFM: "6c3a6ec1-4b99-4e5c-8214-cea14fd9b142",
};

// for emojis
import he from "he";
import fs from "fs";

// import slack to html emoji dictionary
let rawdata = fs.readFileSync("./slack_emoticons_to_html_unicode.json");
let emojis = JSON.parse(rawdata);

// following functions are for converting Slack to Notion Item
// replace the emojis codes (from Slack) in the text with actual emojis
const replaceEmojis = (string) => {
  // split string based on words
  var splitString = string.split(" ");

  // for each word in the string:
  // see if the word has the emoji marker ":"
  // search keys in the emoji for the word
  // replace the word with the decoded html value
  splitString.forEach((word) => {
    if (word.search(":") != -1) {
      for (var key in emojis) {
        if (word.search(":" + key + ":") != -1) {
          var regexKey = new RegExp(key);
          string = string.replace(regexKey, he.decode(emojis[key]));
        }
      }
    }
  });

  // replace all the ":" in the string and return
  string = string.replace(/:/gi, "");
  return string;
};

// create a new Notion block item for links
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

// create a new Notion block item for text
const newTextItem = (text) => {
  var array = {
    type: "text",
    text: {
      content: text,
    },
  };
  return array;
};

// create a new Notion block item for users
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

// create a new Notion block item for code
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

// create a new Notion block item for bold text
const newBoldItem = (codeText) => {
  var array = {
    type: "text",
    text: {
      content: codeText,
    },
    annotations: {
      bold: true,
    },
  };
  return array;
};

// create a new Notion block item for code text
const newItalicItem = (codeText) => {
  var array = {
    type: "text",
    text: {
      content: codeText,
    },
    annotations: {
      italic: true,
    },
  };
  return array;
};

// create a new Notion block item for strikethrough text
const newStrikeItem = (codeText) => {
  var array = {
    type: "text",
    text: {
      content: codeText,
    },
    annotations: {
      strikethrough: true,
    },
  };
  return array;
};

// create a new child of a page with different blocks
const newChild = (splitItem) => {
  // create the Item
  var notionItem = [];

  // the input is a split item based on (/[\<\>]/), and then for each item
  // both links and users are indicated by <text>
  splitItem.forEach((item) => {
    if ((item.search(/https?/) != -1) | (item.search(/mailto/) != -1)) {
      // see if its a link item by searching for link text indicators

      // split link into text and link
      let linkSplit = item.split("|");

      // create link item and push to notionItem
      const linkItem = newLinkItem(linkSplit[1], linkSplit[0]);
      notionItem.push(linkItem);
    } else if (item.search("@") != -1) {
      // see if it is a user by searching for the @ symbol

      // replace indicator symbol
      var string = item.replace("@", "");

      if (string in slackNotionId) {
        // create a new user item and push to notionItem
        const userItem = newUserItem(string, slackNotionId);
        notionItem.push(userItem);
      } else {
        const textItem = newTextItem(item);
        notionItem.push(textItem);
      }
    } else if (item.search(/[\`\_\*\~]/) != -1) {
      // if a string contains any special annotations (bold, italic, code, strikethrough)

      // replace any emojis in string
      item = replaceEmojis(item);

      // kinda wack, but replace all the symbols with = on either end
      // so it can break without getting rid of the original symbol
      item = item.replace(/[\*](?=[a-zA-Z0-9])/, "=*");
      item = item.replace(/(?<=[a-zA-Z0-9,])[\*]/, "*=");
      item = item.replace(/[\`](?=[a-zA-Z0-9])/, "=`");
      item = item.replace(/(?<=[a-zA-Z0-9,])[\``]/, "`=");
      item = item.replace(/[\_](?=[a-zA-Z0-9])/, "=_");
      item = item.replace(/(?<=[a-zA-Z0-9,])[\_]/, "_=");
      item = item.replace(/[\~](?=[a-zA-Z0-9])/, "=~");
      item = item.replace(/(?<=[a-zA-Z0-9,])[\~]/, "~=");

      // split item based off of =
      var split = item.split(/(\=)/gi);

      // filter out any remaining "="
      split = split.filter((test) => test.search("=") != 0);

      // for each item, check to see what type it is, replace the indicator, and push to notionItem
      split.forEach((split) => {
        if (split.search("`") != -1) {
          split = split.replace(/\`/gi, "");
          const item = newCodeItem(split);
          notionItem.push(item);
        } else if (split.search("_") != -1) {
          split = split.replace(/\_/gi, "");
          const item = newItalicItem(split);
          notionItem.push(item);
        } else if (split.search(/[\*]/) != -1) {
          split = split.replace(/\*/gi, "");
          const item = newBoldItem(split);
          notionItem.push(item);
        } else if (split.search("~") != -1) {
          split = split.replace(/\~/gi, "");
          const item = newStrikeItem(split);
          notionItem.push(item);
        } else {
          const textItem = newTextItem(split);
          notionItem.push(textItem);
        }
      });
    } else {
      // if the string is normal, then replace emojis and if any mentions and push text item
      var string = replaceEmojis(item);
      string = string.replace("!channel", "@channel");
      string = string.replace("!here", "@here");
      const textItem = newTextItem(string);
      notionItem.push(textItem);
    }
  });
  return notionItem;
};

// create a new Notion item
const newNotionItem = (slackMessage, userId) => {
  // empty block for spacing
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

  // notion Item for replies
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

  // split message on line breaks and filter empty lines
  var newLineSplit = slackMessage.split("\n");
  newLineSplit = newLineSplit.filter(Boolean);

  // for each line in Slack message
  newLineSplit.forEach((line) => {
    // split line based on link/user indicators
    var regex = new RegExp(/[\<\>]/);
    var split = line.split(regex);

    // create new child item content
    var item = newChild(split);
    // add child item content to formatted block
    const childItem = {
      object: "block",
      type: "paragraph",
      paragraph: { text: item },
    };

    // push child to notionItem
    notionItem.push(childItem);
  });

  // add an empty block for spacing and return
  notionItem.push(emptyBlock);
  return notionItem;
};

// same thing as above except for inital messages not replies
const initialNotionItem = (slackMessage) => {
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

  // empty Notion Item instead of reply format
  const notionItem = [];

  // for each line in the Slack message
  newLineSplit.forEach((line) => {
    // split based on link/user markers
    var regex = new RegExp(/[\<\>]/);
    var split = line.split(regex);

    // make a child from these splits
    var item = newChild(split);

    // properly format child
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

// find Slack channel
async function findConversation(name) {
  try {
    var conversationId = "";

    // get a list of conversations
    const result = await app.client.conversations.list({
      // app token
      appToken: appToken,
    });

    // check if channel name == input name
    for (const channel of result.channels) {
      if (channel.name === name) {
        conversationId = channel.id;
        break;
      }
    }

    // return found ID
    return conversationId;
  } catch (error) {
    console.error(error);
  }
}

// variable for slack channel
const standupId = await findConversation("standup");

// add item to Notion database
async function addItem(title, text, userId, ts, tags, link) {
  try {
    // add tags with proper format
    const tagArray = [];
    for (const tag of tags) {
      tagArray.push({ name: tag });
    }

    // create page with correct properties and child using initialNotionItem function
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

      children: initialNotionItem(text),
    });

    console.log(response);

    // return the url to be put in thread
    return response.url;
  } catch (error) {
    console.error(error);
  }
}

// find database item based on the threadts value from Slack and property from Notion
async function findDatabaseItem(threadTs) {
  try {
    // find Notion items with the correct threadts property
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "TS",
        text: {
          contains: threadTs,
        },
      },
    });

    // code for testing what block formatting looks like
    // const blockId = response.results[0].id;
    // const children = await notion.blocks.children.list({
    //   block_id: blockId,
    //   page_size: 50,
    // });
    // console.log(children.results);

    // return the ID of the page
    return response.results[0].id;
  } catch (error) {
    console.error(error);
  }
}

// append a body to a Notion page
async function addBody(id, text, userId) {
  try {
    // use ID of page and newNotionItem function for formatting
    const response = await notion.blocks.children.append({
      block_id: id,
      children: newNotionItem(text, userId),
    });
  } catch (error) {
    console.error(error);
  }
}

// make the list of tags for the channel topic
async function setChannelTopic(currentTag) {
  try {
    // get database and then list of tags in database
    const response = await notion.databases.retrieve({
      database_id: databaseId,
    });
    const tags = response.properties.Tags.multi_select.options;

    // make a list of the current tags in the database
    var topic = "Current tags are: ";
    tags.forEach((tag) => {
      topic += tag.name + ", ";
    });

    // set variable for reset channel topic
    var restart = false;

    // for each tag in list of tags presented in the Slack message
    currentTag.forEach((tag) => {
      // if the tag is not found add to list and set restart to true
      if (topic.search(tag) == -1) {
        topic += tag + ", ";
        restart = true;
      }
    });

    // get rid of last ", "
    topic = topic.slice(0, -2);

    // if it should be restarted, set the channel topic again
    if (restart == true) {
      const setTopic = await app.client.conversations.setTopic({
        token: token,
        channel: standupId,
        topic: topic,
      });
    }
  } catch (error) {
    console.error(error);
  }
}

// reply to the Slack message with the Notion link
async function replyMessage(id, ts, link) {
  try {
    const result = await app.client.chat.postMessage({
      // bot token
      token: token,
      channel: id,
      thread_ts: ts,
      text: link,
    });

    return;
  } catch (error) {
    console.error(error);
  }
}

// find the Slack username of the user using the Slack ID
async function findUserName(user) {
  try {
    const result = await app.client.users.profile.get({
      // bot token and Slack user ID
      token: token,
      user: user,
    });
    return result.profile.display_name;
  } catch (error) {
    console.error(error);
  }
}

// find the tags in the Slack message
async function findTags(text) {
  try {
    // get database and then list of tags in database
    const response = await notion.databases.retrieve({
      database_id: databaseId,
    });
    const databaseTags = response.properties.Tags.multi_select.options;

    // make a list of the current tags in the database
    var dbTagArray = [];
    databaseTags.forEach((dbtag) => {
      dbTagArray.push(dbtag.name);
    });

    var tags = [];
    // search for Tags indicator
    var index = text.toLowerCase().search("tags: ");

    // if found
    if (index != -1) {
      // bypass "tags: "
      index += 6;
      // make a list by slicing from index to end and split on first line
      const tagList = text.slice(index, text.length).split("\n")[0];

      // make array of tags based on the split value
      var slackTagArray = tagList.split(", ");

      // for each found Slack tag
      slackTagArray.forEach((stag) => {
        // set counter
        var index = 0;
        // for each Notion database tag
        dbTagArray.forEach((dbtag) => {
          if (stag.toLowerCase() == dbtag.toLowerCase()) {
            // if the tags match, push the database tag
            tags.push(dbtag);
          } else {
            // if they don't, count
            index += 1;
          }

          // if it went through all of the database items, push the Slack tag
          if (index == dbTagArray.length) {
            tags.push(stag);
          }
        });
      });
    }

    // return array of tags
    return tags;
  } catch (error) {
    console.error(error);
  }
}

// create the title for the Notion page
async function makeTitle(text) {
  // split based off of line break or emphasis punctuation
  var title = text.split(/[\n]/)[0];

  // replace the emojis
  title = replaceEmojis(title);

  // search for links
  if (title.search("http") != -1 || title.search("mailto") != -1) {
    // split title based on link indicators <link>
    var regex = new RegExp(/[\<\>]/);
    var split = title.split(regex);

    // initialize title
    title = "";

    // for each line in the split text
    split.forEach((line) => {
      if (line.search("http") != -1 || line.search("mailto") != -1) {
        // if it is the link item, split the first half off and only push the text to title
        let lineSplit = line.split("|");
        title += lineSplit[1];
      } else {
        // if it isn't, push the text to title
        title += line;
      }
    });
  }

  console.log(title)

  if (title.search("@") != -1) {
    // split title based on link indicators <link>
    var regex = new RegExp(/[\<\>]/);
    var split = title.split(regex);

    // find all instances of users and then replace in title with their Slack user name
    // wait til this promise is completed before moving on
    await Promise.all(
      split.map(async (line) => {
        if (line.search("@") != -1) {
          const userId = line.replace("@", "");
          if (userId in slackNotionId) {
            var userName = await findUserName(userId);
            var regexReplace = new RegExp(["<" + line + ">"]);
            title = title.replace(regexReplace, userName);
          }
        }
      })
    );
  }

  // replace weird slack formatting with more understandable stuff
  if (title.search("!channel") != -1 || title.search("!here") != -1) {
    title = title.replace("<!channel>", "@channel");
    title = title.replace("<!here>", "@here");
  }

  // make sure its not too long
  title = title.slice(0, 100);

  console.log(title)

  // split the title based on "." and "!"
  // (can't do above because links have "." and "?" and @channel has "!")
  // and return the first item
  title = title.split(/[\.\!\?]/)[0];

  console.log(title)
  return title;
}

async function addTags(pageId, tags) {
  try {
    // add tags with proper format
    const tagArray = [];
    for (const tag of tags) {
      tagArray.push({ name: tag });
    }

    // 
    const response = await notion.pages.update({
      page_id: pageId,
      properties: {
        Tags: { 
          name: 'Tags',
          type: 'multi_select',
          multi_select: tagArray,
        },
      },
    });
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}

// if a message is posted
app.event("message", async ({ event, client }) => {
  console.log(event);

  // make sure its the right channel
  if (event.channel == standupId) {
    // get the tags
    var tags = await findTags(event.text);

    console.log(tags)
    // get the title
    const title = await makeTitle(event.text);

    // get the link to the Slack message
    const slackLink = await app.client.chat.getPermalink({
      token: token,
      channel: event.channel,
      message_ts: event.ts,
    });

    try {
      if ("thread_ts" in event) {
        // if its a thread message, find the original Notion page and then append the Slack message
        const pageId = await findDatabaseItem(event.thread_ts);
        addBody(pageId, event.text, event.user);
        if (tags.length != 0) {
          addTags(pageId, tags)
        }
      } else {
        // if its a parent message
        // make the list of tags for the channel topic and push it if applicable
        await setChannelTopic(tags);
        // make the Notion page and push to database
        const notionItem = await addItem(
          title,
          event.text,
          event.user,
          event.ts,
          tags,
          slackLink.permalink
        );

        // reply with the link returned by addItem
        await replyMessage(standupId, event.ts, notionItem);
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
