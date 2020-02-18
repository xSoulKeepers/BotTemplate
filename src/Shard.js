
const config = require("./botconfig.json")
const DiscordBot = require(`./DiscordBot`)

const discordBot = new DiscordBot()

process.on(`message`, msg => {
    if (msg.action === "status") {
        discordBot.setActivity(msg.argument.text, msg.argument.type)
    }
})