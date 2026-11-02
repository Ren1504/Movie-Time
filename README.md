# Movie With Friends

A multiplayer 3D cinema. Walk around a theatre, pick a seat, and watch the host's shared screen together on the big screen.

Built with React, Three.js (React Three Fiber), Rapier, Node, Socket.IO and LiveKit.

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

## Deploying to a server

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
