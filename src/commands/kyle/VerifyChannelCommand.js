const Command = require('../Command')
const { RichEmbed } = require(`discord.js`)

module.exports =
class VerifyChannelCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'verifychannel',
      properName: 'VerifyChannel',
      aliases: ['kyleverifychannel', 'verificationchannel'],
      description: '`<Discord Channel>` Set a channel that the bot will delete all messages in except for verification messages. Default none.',

      args: [
        {
          key: 'channel',
          label: 'channel',
          prompt: 'What channel will users run the verify command in?',
          type: 'channel',
          default: false
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    const channel = args.channel

    if (channel) {
      this.server.setSetting('verifyChannel', channel.id)
      msg.reply(`Set verify channel to ${channel}. Non-verification messages in this channel will be deleted.`)
      try {
        let BotMessageExists
        channel.fetchMessages()
            .then((messages) => { messages.forEach((msg) => {
                if (!msg.bot) {
                    msg.delete()
                } else if (msg.member.id == this.bot.id) {
                    BotMessageExists = true
                }
            })
        })
        if (!BotMessageExists) {
            let embed = new RichEmbed()
                .setAuthor("Server Verification", this.server.bot.displayAvatarURL)
                .setDescription(`Welcome!\n\nIn order to access the rest of the server, you'll need to verify!\nPlease type in this channel in order to verify yourself.`);
            channel.send(embed)
        }
    } catch(e) {
        console.log(`Unable to fulfill startup; ${e}`)
    }
    } else {
      this.server.setSetting('verifyChannel', null)
      msg.reply('Removed verification channel. All messages are allowed to be sent in that channel now.')
    }
  }
}
