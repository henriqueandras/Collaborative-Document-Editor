class Rooms{
    constructor(){
        this.rooms = {};
        this.proxy_sid = null;
    }

    getProxySID(){
        return this.proxy_sid;
    }

    setProxySID(sid){
        return this.proxy_sid = sid;
    }

    getDocuments(){
        return Object.keys(this.rooms);
    }

    includesDocument(documentId){
        return Object.keys(this.rooms).includes(documentId);
    }

    createRoom(documentId){
        this.rooms[documentId] = {
            permittedUsers:[],
            currentUsers:[]
        }
    }

    addPermittedUsers(documentId, user){
        if(documentId in this.rooms){
            if(!this.rooms[documentId].permittedUsers.includes(user)){
                this.rooms[documentId].permittedUsers.push(user);
            }
        }
    }
    removePermittedUsers(documentId, user){
        if(documentId in this.rooms){
            const currPerm = this.rooms[documentId].permittedUsers;
            const newPerm = currPerm.filter((u)=>u!==user);
            this.rooms[documentId].permittedUsers = [...newPerm];
        }
    }
    addCurrentUsers(documentId, user){
        if(documentId in this.rooms){
            if(!this.rooms[documentId].currentUsers.includes(user)){
                this.rooms[documentId].currentUsers.push(user);
            }
        }
    }
    removeCurrentUsers(documentId, user){
        if(documentId in this.rooms){
            const currUsers = this.rooms[documentId].currentUsers;
            const newUsers = currUsers.filter((u)=>u!==user);
            this.rooms[documentId].currentUsers = [...newUsers];
        }
    }

    getCurrentUsers(documentId){
        if(documentId in this.rooms){
            return this.rooms[documentId].currentUsers;
        }
        return [];
    }

    removeFromAnyOtherRoom(user){
        const documents = this.getDocuments();
        documents.forEach((documentId)=>{
            this.removeCurrentUsers(documentId, user);
        });
    }

    removeAllCurrentUsers()
    {
        const docs = Object.entries(this.rooms);
        for (let [key, value] of docs)
        {
            value.currentUsers = [];
        }
    }

    getAllCurrentUsers()
    {
        let users = [];

        const docs = Object.entries(this.rooms);
        for (let [key, value] of docs)
        {
            users = [...users, ...value.currentUsers];
        }
        return users;
    }

}

module.exports = Rooms;