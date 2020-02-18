const Command = require('../Command')

module.exports =
class VerifyChannelCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'commandchannel',
      group: 'moderation',
      properName: 'SetCommandChannel',
      aliases: ['commandchannel'],
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
      this.server.setSetting('CommandChannel', channel.id)
      msg.reply(`Set command channel to ${channel}. Commands messages in other channels will be deleted.`)
    } else {
      this.server.setSetting('CommandChannel', null)
      msg.reply('Removed command channel. Commands can be sent in any channel now.')
    }
  }
}
