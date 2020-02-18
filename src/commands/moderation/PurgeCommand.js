const Command = require('../Command')

module.exports =
class VerifyChannelCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'purge',
      group: 'moderation',
      properName: 'Purge',
      aliases: ['delete','clear'],
      description: '`<Discord Channel>` Set a channel that the bot will delete all messages in except for verification messages. Default none.',

      args: [
        {
          key: 'Amount',
          label: 'Amount',
          prompt: 'Amount of messages to delete',
          type: 'integer',
          default: false
        }
      ]
    })
  }

  async fn (msg, args) {
    const amount = args.Amount

    if (!amount) {
      msg.reply("Please include the number of messages to delete.")
        .then(m => m.delete(15000))
      return msg.delete()
    }

    msg.channel.bulkDelete(amount).then(() => {
      //things in the future maybe.
    })

  }
}
