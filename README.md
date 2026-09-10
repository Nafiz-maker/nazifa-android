# Nazifa AI Assistant — Notion-powered Android PWA

An installable mobile app that chats with the **Nazifa Mobile** Custom Agent through Notion’s public-beta Agent API.

## Included

- Notion Agent API server route at `api/chat.js`
- Secure server-side Notion token handling
- Automatic lookup of the `Nazifa Mobile` Custom Agent
- Multi-turn sessions, chat memory, voice input, offline app shell, icons, and dark mode
- Vercel-ready deployment configuration

## One-time secure deployment

1. In the Notion Developer portal, create a personal access token with the **Notion API** capability. Alternatively, use an internal connection token with **View threads and interact with agents** enabled and grant it access to **Nazifa Mobile**.
2. Never paste the token into chat or source code.
3. Import this folder into Vercel.
4. Add these environment variables in Vercel project settings:
   - `NOTION_API_KEY` = your private `ntn_…` token
   - `NOTION_AGENT_NAME` = `Nazifa Mobile`
5. Deploy.
6. Open the HTTPS address in Chrome on Android and choose **⋮ → Add to Home screen → Install**.

You may set `NOTION_AGENT_ID` instead of `NOTION_AGENT_NAME` if you prefer direct ID configuration.

## Important

The Notion Agent API is currently in public beta. Custom Agents and token creation may depend on workspace plan and owner settings. The secret stays on the deployment server and is never sent to the Android browser.
