class Rooms{
    constructor(){
        this.rooms = {};
    }

    getDocuments(){
        return Object.keys(this.rooms);
    }

    createRoom(documentId){
        this.rooms[documentId] = {
            permittedUsers:[],
            currentUsers:[]
        }
    }

    addPermittedUsers(documentId, user){
        if(documentId in this.rooms){
            this.rooms[documentId].permittedUsers.push(user);
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
            this.rooms[documentId].currentUsers.push(user);
        }
    }
    removePermittedUsers(documentId, user){
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
    }

}

module.exports = Rooms;