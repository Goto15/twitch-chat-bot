
import { auth_token_params } from "../constants/auth_token_params.js";
import { URL } from "../constants/url.js";

// TODO: This should get moved to the back end
export async function get_new_auth_token() {
    const data = await fetch(URL.twitch_refresh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: auth_token_params
    });
    const new_token_info = await data.json()
    new_token_info.scope = new_token_info.scope.toString()
    new_token_info['token_name'] = 'twitch_chat_bot'
    const token_search = new URLSearchParams(new_token_info)
    
    const resp = await fetch(`${URL.backend}api_information?${token_search}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    return await resp.json()
}
