let assert = require('assert');

async function update_primary_db_list(Document, args)
{
    let last_index;

    const document = await Document.findById(0);
    if(document){
        last_index = document.data.updates.push({id: args.id, data: args.data}) - 1;
    }
    else{
        await Document.create({ _id: 0, data: {updates: [{id: args.id, data: args.data}]} });
        last_index = 0;
    }

    return last_index;
}

async function update_backup_db_list(Document, message)
{
    const document = await Document.findById(0);

    const received_index = message.index;
    let   expected_index;
    if(document){
        expected_index = document.data.updates.length;
    }
    else{
        expected_index = 0;
    }

    if(received_index != expected_index)
    {
        console.log("ERROR: trying to update database with out of order update(received: ", received_index,", expected: ", expected_index,")");

        // if backup is behind
        if(received_index > expected_index)
        {
            return expected_index;
        }
        else
        {
            throw new Error("Backup is ahead");
        }
    }

    const last_index = await update_primary_db_list(Document, message);
    assert(last_index == received_index);

    return -1;
}

module.exports = {
    setupBackupSocketForSync: function (socket, Document){
        socket.on("sync-doc-create", async (message) => {
            console.log("Received request to create doc from primary...");
            const index = await update_backup_db_list(Document, message);
            if(index < 0)
            {
            await Document.create({ _id: message.id, data: message.data });
            }
            else
            {
                // request all missing updates from primary
                socket.emit("catch-up-request", {index: index});
            }
        });
        
        socket.on("sync-doc-find-update", async (message) => {
            console.log("Received request to update doc from primary...");
            const index = await update_backup_db_list(Document, message);
            if(index < 0)
            {
            await Document.findByIdAndUpdate(message.id, { data: message.data });
            }
            else
            {
                // request all missing updates from primary
                socket.emit("catch-up-request", {index: index});
            }
        });

        socket.on("catch-up-response", async (message) => {
            const missing_updates = message.updates;
            const start_index = message.start_index;

            console.log("catch-up-response received: ", message);

            console.log("Catching up from ", start_index,"...");
            for (const [i, update] of missing_updates.entries()) {
                console.log('%d: %s', i, update);

                update.index = start_index + i;
                assert(await update_backup_db_list(Document, update) < 0);
            }
        });
    },

    setupPrimarySocketForSync: function(socket, Document){
        socket.on("catch-up-request", async (message) =>{
            console.log("catch-up-request received: ", message);

            const requested_index = message.index;

            const document = await Document.findById(0);
            if(document){
                const primary_index = document.data.updates.length - 1;

                if(requested_index > primary_index){
                    console.log("ERROR: backup is asking to catchup with a greater index.");
                    return;
                }

                const missing_updates = document.data.updates.slice(requested_index);

                socket.emit("catch-up-response", {updates: missing_updates, start_index: requested_index, end_index: primary_index + 1});
            }
            else{
                console.log("ERROR: backup is asking to catchup when DB has not been setup.");
            }
        });
    },

    syncCreateDocument: async (Document, args, serverSockets) => {
        const index = await update_primary_db_list(Document, args);

        args.index = index;

        for (const { serverEndpoint, sockId, socket:actualSocket } of serverSockets) {
            actualSocket.emit("sync-doc-create", args);
        }

        await Document.create({ _id: args.id, data: args.data });
    },

    syncFindByIdAndUpdate: async (Document, args, serverSockets) => {
        const index = await update_primary_db_list(Document, args);

        args.index = index;

        for (const { serverEndpoint, sockId, socket:actualSocket } of serverSockets) {
            actualSocket.emit("sync-doc-find-update", args);
        }

        await Document.findByIdAndUpdate(args.id, { data: args.data });
    }
};