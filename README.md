# v2v website

## Local setup

Copy `.env.example` to `.env` and set `INITIAL_ADMIN_PASSWORD` and
`SOLARHARVEST_ADMIN_PASSWORD` before starting the server. Admin sign-in is
restricted to the V2V Tech Main Admin account. The password can be changed from
the admin sign-in screen after entering the current password.

## Deploying on Render

Deploy this project as a **Web Service** using the included `render.yaml`
Blueprint. In Render, create a new Blueprint Instance and connect this
repository. Do not deploy it as a Static Site or set a publish directory: the
build creates `dist/`, and the Node server serves the frontend and API together.
Render will prompt you to provide the admin passwords defined in `render.yaml`.
