import 'dotenv/config'
import WebSocket from 'ws'
import { nuzlocke_msg } from './bot_commands/nuzlocke.js'
/* ----- Helpers ----- */
import { get_new_auth_token } from './helpers/auth.js'
import { parseMessage } from './helpers/message_parser.js'
/* ----- Constants ----- */
import { channel_info } from './constants/channel_info.js'
import { URL } from './constants/url.js'

const socket = new WebSocket(URL.twitch_irc)
let loginFailed = false
let access_token = ''

// TODO: Send a game suggestion to back end for search, parse, and add to list/vote increase
socket.onopen = async (connection) => {
    console.log("Socket Connected")

    // Get token information
    // TODO: This token flow needs to handle failed login attempts due to time out
    const token_data = await get_new_auth_token()
    access_token = token_data.access_token

    // Connect to the channel's IRC room
    socket.send('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands');
    socket.send(`PASS oauth:${token_data.access_token}`);
    socket.send(`NICK ${channel_info.nick}`);
    socket.send(`JOIN #${channel_info.channel}`)
}

socket.onmessage = async (event) => {
    // Raw and clean message variables
    const resp = event.data.toString()
    const msg = parseMessage(resp)

    // Booleans to handle different flows such as PINGs or bot commands
    const isPing = Boolean(resp.startsWith('PING'))
    const didAuthFail = Boolean(msg?.command?.command === 'NOTICE') && msg.parameters.startsWith('Login authentication failed')
    const isBotCmd = Boolean(msg?.command?.botCommand)
    // TODO: This seems to be flaky on connection and will seemingly randomly break. needs work.
    // TODO: This seems to be working more often now
    const isCustomReward = Boolean(msg?.tags != null && msg.tags.hasOwnProperty('custom-reward-id'))

    // TODO: build the failed auth flow
    // Check that login was successful. If not kick to try relogging.
    // Returns are here so it breaks out of the logic flow once it finds a branch.
    if (didAuthFail) return loginFailed = true
    if (isPing) return socket.send('PONG')
    if (isBotCmd) {
        const command = msg.command.botCommand.toLowerCase()
        if (command === 'nuzlocke') return socket.send(`PRIVMSG #${channel_info.channel} :${nuzlocke_msg()}`)
    }
    // TODO: break this out for custom rewards handling
    if (isCustomReward) {
        const game_request = new URLSearchParams({
            reward_type: msg.tags['custom-reward-id'],
            requested_game: msg.parameters.trim(),
            requester: msg.tags['display-name'],
            client_id: process.env.CLIENT_ID,
            access_token
        })

        const resp = await fetch(`${URL.backend}game_request?${game_request}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await resp.json()

        socket.send(`PRIVMSG #${channel_info.channel} :${data.message}`)
        return
    }

    console.log(msg)
}

/* ----- Error Handling ----- */
socket.onerror = (error) => console.log("Connection Error: " + error.message.toString())

/* ----- Close ----- */
socket.onclose = (connection) => {
    if (loginFailed) loginFailed = false
    console.log(`Connection Closed. Close reason code: ${connection}`)
}
