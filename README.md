# 👋 Welcome to the only Slack to Notion standup integration you'll ever need
### This was wayyyy more difficult than it looks 😢

Wow I learned a ton doing this. Slack and Notion have great APIs and helpful docs, but being as new to this as I am, it took a lot of trial and error. A big part of this was figuring out how to translate Slack messages into stuff Notion can understand. You can find that whole project [here](https://github.com/victoriaslocum752/slack-notion-translation). 

 
# Features 📊  
## Parent Message  
This code will send a parent Slack message to a Notion database, complete with a title, properties, and a perfectly formatted body.  

### Title  
- split based on any punctuation mark or a new line
- formatted without link or user ickness
- character limit of 100
- emojis!!  

### Properties  
- user who sent the Slack message
- date created
- multi-select tags
- link to the original slack message  

### Body  
- text formatting for 
  - `code`
  - [links](https://findtheinvisiblecow.com/)
  - **bold text**
  - *italicized text*
  - ~~strikethrough~~
  - bullet points
  - (I think) ordered lists
- tagging users is automaticly done
- text links are formatted right]
- emojis!!

## Thread message  
It will also update a Notion page with the thread message, with all the correct formatting.  

### Example formatting:   
```
@Victoria Slocum says: This is a great additional item to a Notion page!! 
```

## Channel Topic  
We found it helpful to have the channel topic be updated with the currect tags in use.  

This code will automatically update the channel topic when a new tag is added!!  

## Reply with Link
The Standup Bot will reply in the thread with the link to the created Notion page  

 
# Overall flow 🌊

### The Slack message with the bot reply
![Slack message](https://user-images.githubusercontent.com/80417010/132265418-8299f108-1241-4026-8715-f967cd5e57ca.png)  
### The Bot setting the channel topic
![Bot channel topic](https://user-images.githubusercontent.com/80417010/132265440-50f9a127-0317-4343-8f73-2663393d7327.png)  
### The Notion page properties
![Notion page properties](https://user-images.githubusercontent.com/80417010/132265455-d4a1c3d5-2e29-45b6-9d2c-0bd3ceb83b11.png)  
### The Notion page content
![Notion page content](https://user-images.githubusercontent.com/80417010/132265462-0d79a0d1-07bb-4942-b2ec-7e95654bd72b.png)

 
# Anyways 👋
Hey, I'm Victoria, and you can find my website [here](https://victoriaslocum.com) and the blog post for this page [here](https://comingsoon.com).  

I also tried this with Zapier first, and you can read about my experience [here](https://dev.to/victoriaslocum/a-notion-slack-integration-for-standups-5egn)
