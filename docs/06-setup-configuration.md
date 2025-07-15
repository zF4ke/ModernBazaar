# 🔧 setup

[← back to docs](./README.md)

## getting this thing running

### requirements

- node.js
- a discord bot token
- basic terminal skills
- patience

### step 1: clone the code

```bash
git clone <this-repo>
cd hypixel-bazaar-bot
```

### step 2: install dependencies

```bash
npm install
```

this downloads all the required packages.

### step 3: create a discord bot

1. go to https://discord.com/developers/applications
2. click "new application"
3. give it a name (whatever you want)
4. go to "bot" section
5. click "add bot"
6. copy the token (keep this secret!)

### step 4: bot permissions

your bot needs these permissions:
- use slash commands

**enable all permissions and intents in the "bot" section on the discord developer portal.**

### step 5: environment setup

create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token_here
```

**important:** never share this token. add `.env` to `.gitignore`.

### step 6: invite bot to server

1. go back to discord developer portal
2. "oauth2" → "url generator"
3. check "bot" and "applications.commands"
4. select permissions from step 4
5. copy the generated url
6. open url, select your server

### step 7: start the bot

```bash
npm start
```

you should see:
```
✅ Bot is ready!

🚀 No autocomplete cache found, making initial API request...
📡 API Response received in 245ms - Status: 200
✅ Successfully fetched 573 items from Hypixel API
📄 Autocomplete cache created with 573 items
```

### step 8: test it

in your discord server, type `/bazaar-price ...`

if it works, you're done!