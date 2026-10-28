# Forest Service Nepal

Zero-dependency Node.js site (Node 18+). No `npm install` needed.

    ADMIN_USER=yourname ADMIN_PASS='a-long-password' node server.js

- Site:  http://localhost:3000
- Admin: http://localhost:3000/admin  (default login admin / changeme123 - change it!)

Put your logo at `public/images/forest-service-nepal-logo.png`.
Data lives in `data/db.json`; uploaded files in `data/uploads/`. Back up the `data/` folder.
Serve over HTTPS in production (reverse proxy such as Nginx/Caddy), and add `Secure` to the cookie if you do.
