# MIT class group chats for Matrix

This web application is part of the SIPB Matrix project. For other GitHub repos in this project, see [sipb/uplink](https://github.com/sipb/uplink).

## Get involved

If you want to get involved with this project, shoot an email to matrix@ !

## Environment variables needed

In order to use this project, you need to set the following environment variables in `.env`:

* `MATRIX_TOKEN`: A Matrix access token for the bot or app service.
* `PUBLIC_MATRIX_HOMESERVER`: The Matrix homeserver.
* `MATRIX_BASEURL`: The URL at which the Matrix API is available.
* `PUBLIC_MATRIX_ROOM_LINK_BASE`: The prefix for room permalinks. For our Element instance it is `https://matrix.mit.edu/#/room/`.
* `PUBLIC_ROOM_ALIAS_PREFIX`: The prefix to use for room aliases on Matrix (e.g. `subject_` or `subject-test_`). Note that if you use an app service, the app service registration YAML file must declare this room alias prefix to be able to control it.
* `MULESOFT_CLIENT_ID`: A client ID to access developer.mit.edu APIs
* `MULESOFT_CLIENT_SECRET`: A client secret to access developer.mit.edu APIs
* `MULESOFT_SUBJECT_API="https://mit-course-catalog-v2.cloudhub.io/coursecatalog/v2"` (the Subject API endpoint)
* `API_SHARED_SECRET`: A shared secret that trusted clients of the API can use to perform actions. Generate with `pwgen -s 64 -n 1`
* `PUBLIC_HYDRANT_BASEURL="https://hydrant.mit.edu"` (the URL at which Hydrant is hosted)

## Developing

Once you've installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

Note: the Matrix dependency prefers `yarn`, but `npm` seems to work fine.

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

