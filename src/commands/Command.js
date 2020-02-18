const Commando = require('discord.js-commando')

module.exports =
class Command extends Commando.Command {
  constructor (client, info) {
    info.group = info.group ? info.group : 'kyle'
    info.guildOnly = info.guildOnly == null ? true : info.guildOnly
    info.memberName = info.name
    info.argsPromptLimit = 1

    super(client, info)

    this.properName = info.properName
    this.userPermissions = info.userPermissions || ['MANAGE_GUILD']
    this.discordBot = this.client.discordBot
    this.group = info.group
  }

  hasPermission (msg) {
    return this.client.isOwner(msg.author) || !msg.guild || msg.member.hasPermission(this.userPermissions) || msg.member.roles.find(role => role.name === 'RoVer Admin')
  }

  async run (msg, args, pattern) {
    this.server = msg.guild && await this.discordBot.getServer(msg.guild.id)

    let commandChannelId = this.server.getSetting("CommandChannel")
    if (commandChannelId && msg.channel.id != commandChannelId && this.group.id != "moderation" && this.group.id != "kyle") {
      msg.reply("Please put commands in the designated channel.")
        .then(m => m.delete(15000));
      return msg.delete()
    }

    //if ()

    return this.fn(msg, args, pattern)
  }
}
