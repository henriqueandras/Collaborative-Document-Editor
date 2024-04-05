// Developer tools for handling multiple MongoDB instances
const { exec } = require("child_process");

let COUNT = 1;
let startingPort = 27018;

if (process.argv.length >= 3) {
  COUNT = Number.parseInt(process.argv[2]);
}
if (process.argv.length >= 4) {
  startingPort = Number.parseInt(process.argv[3]);
}

async function atomicExecute(command) {
  return new Promise((res) => {
    exec(command, function (error, stdout, stderr) {
      console.log("stdout: " + stdout);
      console.log("stderr: " + stderr);
      if (error !== null) {
        console.log("exec error: " + error);
      }
      res();
    });
  });
}

const build = async () => {
  const promiseArray = [];
  for (let port = startingPort; port < startingPort + COUNT; port++) {
    const buildCommand = `docker build . -t monogtest${port} -f ./Dockerfile.mongo --build-arg arg=${port}`;
    promiseArray.push(atomicExecute(buildCommand));
  }
  await Promise.all(promiseArray);
};

const run = async () => {
  const promiseArray = [];
  for (let port = startingPort; port < startingPort + COUNT; port++) {
    const runCommand = `docker run --detach --name=mongotest${port} --publish ${port}:27017 monogtest${port}`;
    promiseArray.push(atomicExecute(runCommand));
  }
  await Promise.all(promiseArray);
};

async function removeContainers() {
  const promiseArray = [];
  for (let port = startingPort; port < startingPort + COUNT; port++) {
    const runCommand = `docker rm --force mongotest${port}`;
    promiseArray.push(atomicExecute(runCommand));
  }
  await Promise.all(promiseArray);
}

async function start() {
  console.log("Start building images...");
  await build();
  console.log("Completed building images...");
  // console.log("Removing existing containers...");
  // await removeContainers();
  console.log("Start running images...");
  await run();
  console.log("Completed running images...");
}

start();
