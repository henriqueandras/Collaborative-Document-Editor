# Collaborative-Document-Editor
Repository for CPSC 559 Project - G15.

## Table of Contents
- [Team Names](#team-names)
- [Project Description](#project-description)
- [System Overview](#system-overview)
  - [Communication](#communication)
  - [Synchronization](#synchronization)
  - [Replication](#replication)
  - [Consistency](#consistency)
  - [Fault Tolerance](#fault-tolerance)
- [Technologies Used](#technologies-used)
  - [Node.js](#nodejs)
  - [React](#react)
  - [Quill](#quill)
  - [MongoDB](#mongodb)
  - [Docker](#docker)
- [Setup](#setup)

## Team Names

Ana Clara Perrone - 30111664
Angelo Gonzales - 30085865
Dave Sharma - 30093981
Henrique Andras - 30105778
Mohamed Yassin - 30086575

## Project Description

Our project culminated in the creation of a distributed collaborative document editor, enabling multiple users to concurrently access, edit, and format documents in real-time, much like Google Docs. This fully developed application integrates advanced features such as instant synchronization of edits, cursor tracking for active editor visibility, and a web-based, desktop-oriented interface for optimal user interaction. At its core, the system leverages replicated databases and employs the Bully Algorithm for server replication, TCP for reliable message delivery, and the Operational Transform algorithm to ensure document state consistency across all clients. Designed to bridge the gap between theoretical concepts and real-world application, this project not only enhances our understanding of distributed systems but also provides a practical tool for collaborative document editing.


## System Overview

#### Communication
- Utilizes TCP for reliable message delivery, ensuring FIFO (First In, First Out) order.
- Employs WebSockets and the `Socket.io` library for real-time, bidirectional communication.

#### Synchronization
- Implements the Bully Algorithm for leader election, ensuring all servers and proxies recognize the current leader.
- Primary process handles all requests, broadcasting actions to backups for synchronous state management.

#### Replication
- Features two replicated proxies for redundancy and up to four server replicas for high availability.
- Leader Election Bully Algorithm ensures dynamic leadership management among servers, enhancing reliability.

#### Consistency
- Adheres to PRAM (Pipelined Random Access Memory) consistency model, with SC (Sequential Consistency) for single-writer scenarios.
- Uses Operational Transform algorithm to maintain document state consistency across clients, accommodating concurrent edits.

#### Fault Tolerance
- Detects server failures through timeouts and seamlessly reroutes requests to backup or replica servers.
- Supports crash recovery by automatically connecting clients to backup proxies or electing a new leader among servers.
- Handles Timing and Omission Failures with TCP's reliable delivery, and Byzantine Failures by ensuring accurate global server replica information.


## Technologies Used

#### Node.js
- Servers and Proxies
![Alt Text](/img/nodejs-logo.jpg)

#### React
- Client
![Alt Text](/img/react-logo.png)

#### Quill
- Rich text editor
![Alt Text](/img/quill-logo.png)

#### MongoDB
- Database
![Alt Text](/img/mongodb-logo.jpg)

#### Docker
- Containerizing servers and database
![Alt Text](/img/docker-logo.png)

## Setup

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
npm run dev  // to run default PORT 3001
or
npm run dev <PORT_NUMBER>  // specify port to PORT_NUMBER
eg. npm run dev 4000
```

Running server with in-memory storage
Run with port and "local" flag
```
npm run server.js 3002 local
```


Running multiple local mongo db instances

Enter the PORT that will be exposed on local host
```
docker build . -t monogtest<PORT> -f ./Dockerfile.mongo --build-arg arg=<PORT>

docker run --detach --name=mongotest<PORT> --publish <PORT>:27017 monogtest<PORT>
```

OR

```
npm run buildMultipleMongo <COUNT_OF_MONGO_DB_INSTANCES>
```