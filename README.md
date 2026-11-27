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
For a new Blueprint instance, Render prompts for the admin passwords defined in
`render.yaml`. For an existing Render service, open **Dashboard → your web
service → Environment**, set `SOLARHARVEST_ADMIN_PASSWORD` (for Slot Booking
admin access) and `INITIAL_ADMIN_PASSWORD` (for the V2V admin portal), then save
the changes and redeploy. These must be configured as private environment
variables in Render; never put their values in Git. The Slot Booking admin
screen remains disabled until `SOLARHARVEST_ADMIN_PASSWORD` is configured.
