export const auth_token_params = new URLSearchParams({
    'client_id': `${process.env.CLIENT_ID}`,
    'client_secret': `${process.env.CLIENT_SECRET}`,
    'grant_type': 'refresh_token',
    'refresh_token': `${process.env.REFRESH_TOKEN}`
})
