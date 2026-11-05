# Movie With Friends

A multiplayer 3D cinema. Walk around a theatre, pick a seat, grab some popcorn, and watch the host's shared screen together on the big screen.

**Try it: [movie-time-392m.onrender.com](https://movie-time-392m.onrender.com/)**

<!-- Screenshot goes here, for example: ![The theatre](docs/screenshot.png) -->

Built with React, Three.js (React Three Fiber), Rapier, Node, Socket.IO and LiveKit.

## How to use it

1. Open the link on a computer. Phones and tablets aren't supported.
2. Enter your name and select **Create Room**, then send the room code or invite link to your friends.
3. Friends enter the code and select **Join Room**.
4. The host presses Esc and selects **Share Screen** to put a tab or window on the cinema screen. Screen sharing works best in Chrome or Edge.

Press F11 for full screen, for a much better experience. The first visit can take a moment, as the free server wakes up.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Walk |
| Shift | Sprint |
| Space | Jump |
| Mouse | Look around |
| E | Sit, stand or get popcorn |
| Left click | Eat popcorn |
| G | Put popcorn down |
| T | Chat |
| 1 to 6 | React |
| 7 / 8 | Whistle / Clap |
| Esc | Pause, and host controls |

## Run it

Requires Node 24.

| Command | What it does |
| --- | --- |
| `npm install` | Installs dependencies |
| `npm run dev` | Development, at http://localhost:5173. Downloads LiveKit on first run |
| `npm run host` | Hosts from this computer, for friends who connect through port forwarding |
| `npm run lint` / `npm run build` | Checks the code |

`npm run dev` and `npm run host` use the same ports, so run one at a time.

## Hosting from your own computer

`npm run host` prints the addresses and ports to forward: TCP 3001, 7880 and 7881, and UDP 7882. Friends' pages have no HTTPS, so only the person using `localhost` can share a screen.

## Deploying to Render

The live app runs on Render as a Docker web service, with [LiveKit Cloud](https://livekit.io/cloud) for the video. Set these environment variables on Render:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` |
| `PUBLIC_ORIGIN` | The app's address, used for invite links |
| `LIVEKIT_URL` and `LIVEKIT_PUBLIC_URL` | Your LiveKit Cloud project's `wss://` address |
| `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` | From your LiveKit Cloud project. Keep these secret |

## Deploying to your own server

Requires Docker and a domain name, and the server needs a public IP address.

1. Point `your-domain` and `live.your-domain` at the server.
2. Open TCP 80, 443 and 7881, and UDP 7882 in the server's firewall.
3. Copy `.env.example` to `.env` and fill it in.
4. Run `docker compose up -d --build`.

Caddy gets the HTTPS certificates automatically. With HTTPS, whoever is host can share their screen.

## Limits

- Rooms live in memory, so restarting the server ends them. It also runs as a single process.
- Each room holds up to 16 people.
- Sound is stereo, as that's what browsers capture. Surround is simulated in the viewer's browser.
- Protected services may show a black picture when shared. This app doesn't try to bypass that.
- Viewers behind very strict firewalls may need a TURN server, which isn't set up here.
