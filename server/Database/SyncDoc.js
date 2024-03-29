module.exports = {
    setupSocketForSync: function (socket, Document){
        socket.on("sync-doc-create", async (message) => {
            console.log("Received request to create doc from primary...");
            await Document.create({ _id: message.id, data: message.data });
        });
        
        socket.on("sync-doc-find-update", async (message) => {
            console.log("Received request to update doc from primary...");
            await Document.findByIdAndUpdate(message.id, { data: message.data });
        });
    },

    syncCreateDocument: async (Document, args, serverSockets) => {
        for (const { serverEndpoint, sockId, socket:actualSocket } of serverSockets) {
            actualSocket.emit("sync-doc-create", args);
        }

        await Document.create({ _id: args.id, data: args.data });
    },

    syncFindByIdAndUpdate: async (Document, args, serverSockets) => {
        for (const { serverEndpoint, sockId, socket:actualSocket } of serverSockets) {
            actualSocket.emit("sync-doc-find-update", args);
        }

        await Document.findByIdAndUpdate(args.id, { data: args.data });
    }
};