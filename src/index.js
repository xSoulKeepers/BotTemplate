
const path = require(`path`)
const { Client, Collection, ShardingManager } = require("discord.js")
const { token } = require("./botconfig.json")
const { GlobalCache } = require("./GlobalCache")
const Util = require('./Util.js')

const shardManager = new ShardingManager(path.join(__dirname, `Shard.js`), {
    token : token,
    totalShards: `auto`,
    shardArgs: undefined
})

shardManager.on(`shardCreate`, shard => {
    console.log(`Launching shard ${shard.id + 1}/${shardManager.totalShards}`)
})

shardManager.spawn(`auto`, 1000, 30000)

global.GlobalCache = new GlobalCache(shardManager)

let currentActivity = 0
async function getNextActivity() {
    currentActivity++

    if (currentActivity > 3) currentActivity = 0

    switch (currentActivity) {
        case 0:
            return { text : `vern is god`}
        case 1:
            let totalGuilds = (await shardManager.fetchClientValues(`guilds.size`)).reduce((prev, val) => prev + val, 0)
            totalGuilds = Util.toHumanReadableNumber(totalGuilds)
            return { text: `${totalGuilds} servers`, type: "WATCHING" }
        case 2:
            let totalUsers = (await shardManager.fetchClientValues(`users.size`)).reduce((prev, val) => prev + val, 0)
            totalUsers = Util.toHumanReadableNumber(totalUsers)
            return { text: `${totalUsers} users`, type: "WATCHING" }
        case 3:
            return { text: "!botName", type: "LISTENING"}
    }
}

setInterval(async() => {
    shardManager.broadcast({
        action: `status`,
        argument: await getNextActivity()
    })
}, 15000)