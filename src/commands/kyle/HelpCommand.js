const Command = require('../Command')

module.exports =
class HelpCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'kylehelp',
      properName: 'Kyle',
      aliases: ['kyle'],
      description: 'Displays a description of Kyle'
    })
  }

  async fn (msg) {
    const output = `Hi, I'm Kyle! A bot used to give you benefits for taking the extra step in joining our community. You can run \`${msg.guild.commandPrefix}help\` to see a list of commands.`

    msg.reply(output)
  }
}
