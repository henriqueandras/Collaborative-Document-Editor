# Collaborative-Document-Editor
Repository for CPSC 559 Project - G15.

You can start your application with nodemon by running:

Run the frontend:

```bash
npm run dev
```

Run the server:

To run one instance of the server and DB statically connected locally(mainly for final product demo):
```bash
docker-compose -f docker-compose.yml up -d
```


To run multiple instances of server on one machine for development and one DB where all servers connect to that DB,run
```bash
docker-compose -f docker-compose-dev.yml up -d
```
Then run as many instances of server from different ports that will
connect to the same DB
```bash
npm run dev  // to run default PORT 3000
or
npm run dev <PORT_NUMBER>  // specify port to PORT_NUMBER
eg. npm run dev 4000
```
