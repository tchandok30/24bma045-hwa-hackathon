# HuntClock

Wind-up, battery-free dog enrichment game — online shop.

## Stack
- Node.js + Express serving static files from `/public`
- JSON file database (`data/huntclock.json`) — no native compilation needed
- Plain HTML, CSS, vanilla JS (no frameworks, no build step)
- Google Fonts (Fraunces, DM Sans)

## Files
```
server.js        Express server + API routes
db.js            JSON-file database layer (run/get/all/exec/init)
seed.js          Seed products + HUNT10 promo code
package.json     npm scripts
public/          HTML, CSS, JS assets
```

## How to run

```bash
npm install        # install dependencies
node seed.js       # seed the database (products, HUNT10 promo)
npm start          # start server on PORT (default 3000)
```

Visit `http://localhost:3000`.

## Admin
Set `ADMIN_PASSWORD` environment variable, then:
- `ADMIN_PASSWORD=yourpassword npm start`
- Log in at `/admin.html` with that password
- Manage orders, update status (Placed/Packed/Shipped/Delivered)

## API
- `GET /api/products`
- `POST /api/promo/validate`
- `GET /api/delivery?pin=XXXXXX`
- `POST /api/cart/price`
- `POST /api/orders`
- `GET /api/orders/:orderNumber`
- `POST /api/track`
- `POST /api/newsletter`
- `POST /api/admin/login`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`

## Environment variables
- `PORT` — server port (default 3000)
- `ADMIN_PASSWORD` — admin login password

## Deploy (Vercel)
```bash
vercel --prod
```
Live at `https://24bma045-hwa-hackathon.vercel.app`

## Pricing (INR)
- HuntClock S: Rs 2,999 | M: Rs 3,499 | L: Rs 3,999
- Extra disc pack: Rs 499
- Disc of the Month: Rs 399/month
- Free delivery above Rs 3,000, else Rs 99
- Promo HUNT10 = 10% off
