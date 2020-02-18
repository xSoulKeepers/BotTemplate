const path = require(`path`)
const Discord = require(`discord.js-commando`)
const request = require(`request-promise`)
const config = require(`./botconfig.json`)
const DiscordServer = require(`./DiscordServer.js`)
const { Cache } = require(`./GlobalCache`)
const requestDebug = require(`request-debug`)
const SettingProvider = require(`./commands/SettingProvider`)
const Util = require(`./Util`)
const fs = require(`mz/fs`)
const { ErelaClient, Utils  } = require("erela.js");
const { RichEmbed } = require("discord.js")
const { stripIndents } = require("common-tags")

if (config.loud) requestDebug(request, (type, data) => console.log(`${type} ${data.debugId} : ${ data.url || data.statusCode}`))

/**
 * The main Discord bot class, only one per shard.
 * @class DiscordBot
 */
class DiscordBot {
    constructor() {
        this.initialize()
        this.servers = {}
        this.authorizedOwners = {}
        this.patronTransfers = {}
    }

    /**
     * Initialize the bot, hook up events, and log in.
     * @memberof DiscordBot
     */
    initialize() {
        this.bot = new Discord.Client({
            //apiRequestMethod: `sequential`,
            disabledEvents: ['TYPING_START', 'VOICE_STATE_UPDATE', 'PRESENCE_UPDATE', 'MESSAGE_DELETE', 'MESSAGE_UPDATE', 'CHANNEL_PINS_UPDATE', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE', 'MESSAGE_REACTION_REMOVE_ALL', 'CHANNEL_PINS_UPDATE', 'MESSAGE_DELETE_BULK', 'WEBHOOKS_UPDATE'],
            owner: config.owner || `0`,
            commandPrefix: config.commandPrefix || `!`,
            unknownCommandResponse: false,
            disableEveryone: true
        })

        this.bot.setProvider(new SettingProvider())

        // Instantiate the shard's Cache singleton to interface with the main process.
        // A global variable is used here because the cache is dependent on the client
        // being initialized, but I don't like the idea of having to pass down the cahce
        // from this object into every instance (DiscordMember, DiscordServer). This seemed
        // like the best solution.
        global.Cache = new Cache(this.bot)
        this.shardClientUtil = global.Cache.shardClientUtil

        // Set a reference to this instance inside of the client
        // for use in Commando modules. Is this bad? Probably.
        this.bot.discordBot = this

        // Events

        // We use .bind(this) so that the context remains within
        // the class and not the event
        this.bot.on(`ready`, this.ready.bind(this))
        this.bot.on(`guildMemberAdd`, this.guildMemberAdd.bind(this))
        if (config.loud || true) this.bot.on(`error`, (message) => console.log(message))

        this.bot.on('message', this.message.bind(this))

        // Register commands
        this.bot.registry
            .registerGroups([
                { id: 'kyle', name: `Kyle`},
                { id: 'music', name: `Music`},
                { id: 'moderation', name: 'Moderation'}
            ])
            .registerDefaultTypes()
            .registerDefaultGroups()
            .registerDefaultCommands({
                ping: false,
                commandState: false,
                prefix: true,
                help: true,
                unknownCommand: false
            })
            .registerCommandsIn(path.join(__dirname, `commands`))

        //Login.
        this.bot.login(process.env.CLIENT_TOKEN)
    }

    isPremium() {
        return true
    }

    /**
     * Called when the bot is ready and has logged in.
     * @listens Discord.Client#ready
     * @memberof DiscordBot
     */
    ready () {
        console.log(`Shard ${this.bot.shard.id + 1} is ready, serving ${this.bot.guilds.array().length} guilds.`)

        // Set status message to the default until we get info from master process
        this.setActivity()
    }

    /**
     * This method is called when a user sends a message, but it's used
     * for setting their nickname back to what it should be if they've
     * changed it. Only active if lockNicknames is true in config.
     * @listens Discord.Client#message
     * @param {Message} message The new message.
     * @memberof DiscordBot
     */
    async message (message) {
        // Don't want to do anything if this is a DM or message was sent by the bot itself.
        // Additionally, if the message is !verify, we don't want to run it twice (since it
        // will get picked up by the command anyway)
        if (!message.guild || message.author.id === this.bot.user.id || message.cleanContent.toLowerCase() === message.guild.commandPrefix + 'verify' || message.author.bot) {
            return
        }

        // We call discordMember.verify but we want to retain the cache
        // and we don't want it to post any announcements.
        const server = await this.getServer(message.guild.id)
        const member = await server.getMember(message.author.id)
        if (!member) return

        // If this is the verify channel, we want to delete the message and just verify the user if they aren't an admin.
        if (server.getSetting('verifyChannel') === message.channel.id && !(this.bot.isOwner(message.author) || message.member.hasPermission('MANAGE_GUILD') || message.member.roles.find(role => role.name === 'RoVer Admin'))) {
            message.delete()
            return member.verify({ message })
        }
    }

    /**
     * This is called when a user joins any Discord server.
     * @listens Discord.Client#guildMemberAdd
     * @param {GuildMember} member The new guild member
     * @memberof DiscordBot
     */
    async guildMemberAdd (member) {
        if (member.user.bot) return

        const server = await this.getServer(member.guild.id)

        if (server.getSetting('joinDM') === false) {
        return
        }

        const discordMember = await server.getMember(member.id)
        if (!member) return
        const action = await discordMember.verify()

        try {
        if (action.status) {
            member.send(server.getWelcomeMessage(action, member)).catch(() => {})
        } else if (!action.status && action.nonFatal) {
            member.send(`Welcome to ${member.guild.name}! You are already verified, but something went wrong when updating your roles. Try running \`${member.guild.commandPrefix}verify\` in the server for more information.`).catch(() => {})
        } else {
            member.send(`Welcome to ${member.guild.name}! This Discord server uses a Roblox account verification system to keep our community safe. Verifying your account is quick and safe and doesn't require any information other than your username. All you have to do is either join a game or put a code in your profile, and you're in!\n\nVisit the following link to verify your Roblox account: ${Util.getVerifyLink(member.guild)}`).catch(() => {})
        }
        } catch (e) {}
    }

    /**
     * Sets the bot's status text.
     * @param {string} text The status message.
     * @param {string} activityType The activity type.
     * @memberof DiscordBot
     */
    setActivity (text, activityType) {
        this.bot.user.setActivity(text || 'Experimenting', { type: activityType })
    }

    /**
     * This is used to get the DiscordServer instance associated
     * with the specific guild id.
     * @param {Snowflake} id Guild id
     * @returns {Promise<DiscordServer>} DiscordServer
     * @memberof DiscordBot
     */
    async getServer (id) {
        if (!this.servers[id]) {
            this.servers[id] = new DiscordServer(this, id)
            await this.servers[id].loadSettings()
        } else if (!this.servers[id].areSettingsLoaded) {
            await this.servers[id].loadSettings()
        }
        return this.servers[id]
    }


}

module.exports = DiscordBot