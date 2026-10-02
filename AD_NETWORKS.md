# Multi Ad Networks: AdsGram · GigaPub · Monetag

## Admin settings (system_settings / POST /admin/ads/config)

| Key | Example | Meaning |
|-----|---------|---------|
| ads_enabled / adsgram_enabled | true | Master ads on/off |
| primary_ad_network | adsgram \| gigapub \| monetag | Default network everywhere |
| adsgram_block_id | 1234 | AdsGram block id |
| gigapub_project_id | YOUR_PROJECT_ID | GigaPub project id |
| monetag_zone_id | 1234567 | Monetag zone id |
| monetag_sdk_fn | show_1234567 | Global function from Monetag tag |
| monetag_script_url | https://.../sdk.js | Full script URL from Monetag dashboard |
| ads_require_spin / checkin / task / withdraw / direct | true/false | Force ad on that action |
| ads_network_spin etc. | monetag | Optional per-placement override |

## Client flow
1. POST /ads/session → session_id + network + credentials
2. Play AdsGram / showGiga() / show_ZONE()
3. POST /ads/complete { done: true }
4. Reward APIs consume one-time proof

## GigaPub
Script: https://ad.gigapub.tech/script?id=PROJECT_ID  
Call: window.showGiga()

## Monetag
Paste dashboard script URL into monetag_script_url.  
data-zone + data-sdk=show_ZONEID  
Call: window.show_ZONEID()

## AdsGram
https://sad.adsgram.ai/js/sad.min.js  
Adsgram.init({ blockId }).show()
