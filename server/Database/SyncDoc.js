let assert = require('assert');

const UT_CREATE = "create";
const UT_FIND_UPDATE = "find-update";

async function update_primary_db_list(Document, args)
{
    let last_index;

    const document = await Document.findById(0);
    if(document){
        last_index = document.data.updates.push({utype: args.utype, id: args.id, data: args.data}) - 1;
    }
    else{
        await Document.create({ _id: 0, data: {updates: [{utype: args.utype, id: args.id, data: args.data}]} });
        last_index = 0;
    }

    return last_index;
}

async function update_backup_db_list(Document, message, allow_late_update = false)
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
        console.log("WARNING: trying to update database with out of order update(received: ", received_index,", expected: ", expected_index,")");

        // if backup is behind
        if(received_index > expected_index)
        {
            return expected_index;
        }
        else
        {
            if(allow_late_update)
            {
                // compare updates
                if(JSON.stringify(document.data.updates[received_index]) !== JSON.stringify({utype: message.utype, id: message.id, data: message.data}))
                {
                    console.log("received: ", JSON.stringify({id: message.id, data: message.data}), ", expected: ", JSON.stringify(document.data.updates[received_index]));
                    throw new Error("ERROR: Update is different from what is stored in backup!");
                }
                else
                {
                    // no action required, update has already been applied.
                    return -1;
                }
            }
            else
            {
                throw new Error("ERROR: Backup is ahead!");
            }
        }
    }

    const last_index = await update_primary_db_list(Document, message);
    assert(last_index == received_index);

    if(message.utype === UT_CREATE)
    {
        console.log("Received request to create doc from primary...");
        await Document.create({ _id: message.id, data: message.data });
    }
    else if(message.utype === UT_FIND_UPDATE)
    {
        console.log("Received request to update doc from primary...");
        await Document.findByIdAndUpdate(message.id, { data: message.data });
    }
    else
    {
        throw new Error("ERROR: Invalid update type!");
    }

    return -1;
}

async function default_update_handler(socket, Document, message)
{
    console.log("Receive request to update with: ", message);

    const index = await update_backup_db_list(Document, message);
    if(index >= 0)
    {
        // if catch up has not been sent yet
        const listeners = [...socket.listeners("sync-doc-create"), ...socket.listeners("sync-doc-find-update")];
        if (listeners !== undefined && listeners.length != 0)
        {
            // disable listeners
            socket.removeAllListeners("sync-doc-create");
            socket.removeAllListeners("sync-doc-find-update");

            // request all missing updates from primary
            socket.emit("catch-up-request", {index: index});
            
            // wait for a bit and enable listeners if they haven't already.
            setTimeout(async () => {
                const listeners = [...socket.listeners("sync-doc-create"), ...socket.listeners("sync-doc-find-update")];
                if (listeners === undefined || listeners.length == 0) {
                    socket.on("sync-doc-create", async (message) => {
                        await sync_doc_create_handler(socket, Document, message);
                    });
                    socket.on("sync-doc-find-update", async (message) => {
                        await sync_doc_find_update_handler(socket, Document, message);
                    });
                }
            }, 1000);
        }
    }
}

async function sync_doc_create_handler(socket, Document, message)
{
    return await default_update_handler(socket, Document, message);
}

async function sync_doc_find_update_handler(socket, Document, message)
{
    return await default_update_handler(socket, Document, message);
}

module.exports = {
    setupBackupSocketForSync: function (socket, Document){
        socket.on("sync-doc-create", async (message) => {
            await sync_doc_create_handler(socket, Document, message);
        });
        
        socket.on("sync-doc-find-update", async (message) => {
            await sync_doc_find_update_handler(socket, Document, message);
        });

        socket.on("catch-up-response", async (message) => {
            const missing_updates = message.updates;
            const start_index = message.start_index;

            console.log("catch-up-response received: ", message);

            console.log("Catching up from ", start_index,"...");
            for (const [i, update] of missing_updates.entries()) {
                console.log('%d: %s', i, update);

                update.index = start_index + i;
                assert(await update_backup_db_list(Document, update, true) < 0);
            }

            console.log("Finished catching up backup.");
            
            // enable the listeners
            const listeners = [...socket.listeners("sync-doc-create"), ...socket.listeners("sync-doc-find-update")];
            if (listeners === undefined || listeners.length == 0) {
                socket.on("sync-doc-create", async (message) => {
                    await sync_doc_create_handler(socket, Document, message);
                });
                socket.on("sync-doc-find-update", async (message) => {
                    await sync_doc_find_update_handler(socket, Document, message);
                });
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
        const index = await update_primary_db_list(Document, {utype: UT_CREATE, id: args.id, data: args.data});

        for (const { serverEndpoint, sockId, socket:actualSocket } of serverSockets) {
            actualSocket.emit("sync-doc-create", {utype: UT_CREATE, id: args.id, data: args.data, index: index});
        }

        await Document.create({ _id: args.id, data: args.data });
    },

    syncFindByIdAndUpdate: async (Document, args, serverSockets) => {
        const index = await update_primary_db_list(Document, {utype: UT_FIND_UPDATE, id: args.id, data: args.data});

        for (const { serverEndpoint, sockId, socket:actualSocket } of serverSockets) {
            actualSocket.emit("sync-doc-find-update", {utype: UT_FIND_UPDATE, id: args.id, data: args.data, index: index});
        }

        await Document.findByIdAndUpdate(args.id, { data: args.data });
    }
};