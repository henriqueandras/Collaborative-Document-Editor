    //Utility function that mimics applying transformations used for testing purposes
    function apply(operation){
        const action = this.getAction(operation);
        const retain = operation.ops[0].retain;
        switch(action){
            case "insert":
                if(retain<this.str.length){
                    this.str = this.str.substring(0,retain) + operation.ops[1].insert + this.str.substring(retain,this.str.length);
                }else{
                    this.str = this.str + operation.ops[1].insert;
                }
                break;
            case "delete":
                if(retain<this.str.length){
                    const count = operation.ops[1].delete;
                    this.str = this.str.substring(0,retain) + this.str.substring(retain+count, this.str.length);
                }
                break;
        }
    }
    
/**delta {"ops":[{"retain":16},{"insert":"d"}]} */
/**delta {"ops":[{"retain":16},{"delete":2}]} */

// Get the action either inserting data or deleting data from the operation
function getAction(data){
        //Action is either "insert" or "delete"
        const actionEl = data.ops[1];
        if("insert" in actionEl){
            return "insert";
        }
        else if("delete" in actionEl){
            return "delete";
        }else{
            return "insert";
        }
    }
    // Transform if the old operation retain position is less than the new operation retain positin
    function transformLessThan(old, newData){
        const oldAction = getAction(old);
        const newDataAction = getAction(newData);
        if(oldAction === "insert" && newDataAction === "insert"){
            newData.ops[0].retain++;
        }
        else if(oldAction === "insert" && newDataAction === "delete"){
            newData.ops[0].retain++;
        }
        else if(oldAction === "delete" && newDataAction === "insert"){
            const oldDelete = old.ops[1].delete;
            const oldRetain = old.ops[0].retain;
            const newRetain = newData.ops[0].retain;
            if(oldRetain+oldDelete>newRetain){
                newData.ops[0].retain = oldRetain;
            }else{
                newData.ops[0].retain = newData.ops[0].retain - oldDelete;
            }

        }
        else if(oldAction === "delete" && newDataAction === "delete"){
            // const oldDelete = old.ops[1].delete;
            // newData.ops[0].retain = newData.ops[0].retain - oldDelete;
            // "gibberish"
            //  012345678
            const oldRetain = old.ops[0].retain;
            const newRetain = newData.ops[0].retain;
            const oldDelete = old.ops[1].delete;
            const newDelete = newData.ops[1].delete;
            console.log('old',oldRetain, oldDelete);
            console.log('new',newRetain, newDelete)
            if(newRetain> oldRetain && (newDelete + newRetain) <=( oldRetain + oldDelete)){
                return [[],old];
            }
            else if(newRetain> oldRetain && oldRetain + oldDelete <= newRetain){
                newData.ops[0].retain = newRetain - oldDelete;
            }
            else if(newRetain> oldRetain && oldRetain + oldDelete > newRetain && newRetain + newDelete > oldRetain + oldDelete){
                    newData.ops[1].delete = (newRetain + newDelete) - (oldRetain + oldDelete);
                    newData.ops[0].retain = oldRetain;
            }
            // return [newData];
        }
        return [[newData], newData];
    }
    
    // Transform if the new operation retain position is after/greater than the old operation retain position
    function transformGreaterThan(old, newData){
        const oldAction = getAction(old);
        const newDataAction = getAction(newData);
        if(oldAction === "insert" && newDataAction === "delete"){
            const oldRetain = old.ops[0].retain;
            const newRetain = newData.ops[0].retain;
            const newDelete = newData.ops[1].delete;
            
            
            // giBerish
            // giBerish
            if((newRetain + newDelete > oldRetain) && (newRetain<oldRetain)){
                const reducedDelete = oldRetain - newRetain;
                const newDataOps = [
                    {ops:[{"retain":newData.ops[0].retain},{"delete":reducedDelete}]},
                    {ops:[{"retain":newRetain+1},{"delete":newDelete-reducedDelete}]}
                ];
                return [newDataOps, {ops:[{"retain":newData.ops[0].retain},{"delete":newDelete}]}];
            }
            return [[newData], newData];
        }
        else if((oldAction === "delete" && newDataAction === "delete")){
            const oldRetain = old.ops[0].retain;
            const newRetain = newData.ops[0].retain;
            const newDelete = newData.ops[1].delete;
            const oldDelete = old.ops[1].delete;
            if(newRetain<oldRetain && newRetain + newDelete <= oldRetain){
                return [[newData], newData]
            }else if(newRetain<oldRetain && (newRetain + newDelete) > oldRetain && (newRetain + newDelete) < (oldRetain + oldDelete)){
                newData.ops[1].delete = oldRetain - newRetain
            }else if(newRetain<oldRetain && (newRetain + newDelete) >= (oldRetain + oldDelete)){
                newData.ops[1].delete = (oldRetain - newRetain) + ((newRetain + newDelete) - (oldRetain + oldDelete))
            }
            return [[newData], newData]
        }
        else if((oldAction === "insert" && newDataAction === "insert")
           || (oldAction === "delete" && newDataAction === "insert")
           ){
               return [[newData], newData];
        }
    }

    //If the trying to operate such that both have the same retain position, then compare based on the type of operation
    function transformEqual(old, newData, oldId, newId){
        const oldAction = getAction(old);
        const newDataAction = getAction(newData);
        if(oldAction === "insert" && newDataAction === "insert"){
            // break by process ids
            // "gibbVBerish"
            // "gibbBVerish"
            //  012345678
            if(oldId<=newId){
                newData.ops[0].retain++;
            }
            return [[newData], newData];
        }
        else if(oldAction === "insert" && newDataAction === "delete"){
            newData.ops[0].retain++;
            return [[newData], newData];
            // abTVc
            // abTVc
        }
        else if(oldAction === "delete" && newDataAction === "insert"){
            return [[newData], newData];
        }
        else if(oldAction === "delete" && newDataAction === "delete"){
            const newDelete = newData.ops[1].delete;
            const oldDelete = old.ops[1].delete;
            if(newDelete > oldDelete){
                newData.ops[1].delete = newDelete - oldDelete;
                return [[newData],newData];
            }else{
                return [[],old];
            }
        }
    }
    //The actual transform operation that will compare based on the 2 retain position
    function transformOperations(old, newData, oldId, newId){
        if(old === "BEG"){
            return [[newData], newData];
        }
        console.log(old, newData);
        const oldRetain = old.ops[0].retain;
        const newRetain = newData.ops[0].retain;

        if(oldRetain<newRetain){
            return transformLessThan(old, newData);
        }else if(oldRetain>newRetain){
            return transformGreaterThan(old, newData);
        }else{
            return transformEqual(old, newData, oldId, newId);
        }
    }
    ///Handle the actual "atomic" transformation
    function handleTransforms(old, newData,print, oldId, newId){
        console.log("HANDLE transforms");
        print(`prev: ${JSON.stringify(old)}, curr: ${newData}`);
        if(old === "BEG"){
            return [[newData], newData];
        }
        const trans = transformOperations(ensureStructure(old), ensureStructure(newData), oldId, newId);
        print(`trans: ${JSON.stringify(trans)}`);
        return trans;
    }
    //Ensure structure so that the retain and insert/delete values exist or create them
    function ensureStructure(data){
        if("ops" in data){
            if(data.ops.length === 2){
                return data;
            }else{
                if("delete" in data.ops[0]){
                    return {"ops":[{"retain":0},data.ops[0]]};
                }else{
                    return {"ops":[{"retain":0},data.ops[0]]};
                }
            }
        }else{
            return {"ops":[{"retain":0},{"insert":''}]};
        }
    }

//If the delete or insert op occurs at the first position transform so Quill can understand it better
export function adjustForQuill(data){
    if("ops" in data){
        if(data.ops.length === 2){
            if("retain" in data.ops[0]){
                if(data.ops[0].retain === 0){
                    return {"ops":[data.ops[1]]};
                }
            }
        }
        return data;
    }else{
        return {"ops":[{"retain":0},{"insert":''}]};
    }
}

//If the client is same then need to compare the old operation and how it was transformed to ensure that the current operation is handled correctly  
function isFromOwnClient(old, currentOp, currentOpOg){
    if(!old.deltaId || !currentOp.prevDelta){
        return false;
    }
    // Check if the previous delta for the current operation is the same as the old delta and retain position of old is before the current then need to apply transformation.
    if(((currentOp.prevDelta.deltaId===old.deltaId && old.userId===currentOp.userId)&&(ensureStructure(currentOp.prevDelta.delta).ops[0].retain<=ensureStructure(currentOpOg.operation).ops[0].retain) && ((ensureStructure(currentOp.operation).ops[0].retain<=ensureStructure(old.operation).ops[0].retain)))||(old.userId===currentOp.userId && (ensureStructure(old.og).ops[0].retain<ensureStructure(currentOpOg.operation).ops[0].retain && (ensureStructure(currentOp.operation).ops[0].retain<=ensureStructure(old.operation).ops[0].retain)))){
        return true;
    }
    return false;
}

/**Comparison between history of old operations and the current operation that is received from another user */
export function comparison(listOfOldOps, currentOp, print){
    //Get the operation from the currentOp passed in
    let newOp = currentOp.operation;
    //Make a deep copy of the object
    const currentOpOg = JSON.parse(JSON.stringify(currentOp));
    if(listOfOldOps.length===0){
        return {
            operation:[newOp],
            version:currentOp.version
        };
    }

    print(`Comp: ${JSON.stringify(listOfOldOps)} - ${JSON.stringify(currentOp)}`);
    //Iterate the list of old operations that were applied and compare with currentOp
    for(let i=0;i<listOfOldOps.length;i++){
        const old = listOfOldOps[i];
        print(`Old: ${JSON.stringify(old)}, New: ${JSON.stringify(currentOp)}`);
        //Check if the currentOp version is less than or equal to each old op and that the client is different, or if it is from same client call isFromOwnClient check
        if((currentOp.version<=old.version && (old.userId !== currentOp.userId ))||(isFromOwnClient(old, currentOp, currentOpOg))){
            //call handleTransforms function to handle transforming the current op based on the previous ops
            if(!("ops" in newOp)){
                if(newOp.length===1){
                    const [newAlteredOp,prev] = handleTransforms(old.operation, newOp[0], print, old.userId, currentOp.userId);
                    newOp = JSON.parse(JSON.stringify(newAlteredOp));
                }else{
                    const [newAlteredOp,prev] = handleTransforms(old.operation, newOp[0], print, old.userId, currentOp.userId);
                    
                    const [newAlteredOp2,prev2] = handleTransforms(old.operation, newOp[1], print, old.userId, currentOp.userId);
                    newOp[0] = JSON.parse(JSON.stringify(newAlteredOp[0]));
                    newOp[1] = JSON.parse(JSON.stringify(newAlteredOp2[0]));
                }
            }else{
                const val = handleTransforms(old.operation, newOp, print, old.userId, currentOp.userId);
                print(`handleTransforms value: ${JSON.stringify(val)}`);
                newOp = JSON.parse(JSON.stringify(val[0]));
            }
        }
    }
    //Return the final operation of the current op after augmenting it
    return {
        operation:newOp,
        version:listOfOldOps.length>0 ? listOfOldOps[listOfOldOps.length-1].version+1 :currentOp.version+1  
    };
}

//Revise history function that was never used (intended to change the old ops list to "revise" the history of the operations correctly)
export function reviseHistory(listOfOldOps, currentOp){
    const op = currentOp.operation.ops[0];
    if(!("retain" in op)){
        return [[],[currentOp.operation]];
    }
    const removeOp = [];
    const addOp = [currentOp.operation];
    let version = listOfOldOps[listOfOldOps.length-1].version;
    for(let i=listOfOldOps.length-1;i>=0;i--){
        const old = listOfOldOps[i];
        if("retain" in old.operation.ops[0]){
            if(old.operation.ops[0].retain > currentOp.operation){
                removeOp.push(old.operation);
                version = old.version;
            }
        }
    }
    return [removeOp, addOp,version];
}
/*
BELOW ARE SOME NOTES ABOUT HOW THE TRANSFORMATION SHOULD WORK 
old = retain 3 insert 'm'
current = retain:4 delete 1

abcdedd
abcMdedd
abcd_dd

oldRetain < newRetain:

retain 3 insert 'm'
retain 5 insert 'd
-> abcdedd 1) abcMdedd 2) abcdeDdd => abcMdeDdd
if retain 3 insert 'm' first then retain 6 insert 'd'
Therefore for insert insert add 1 to newData retain


retain 3 delete 2
retain 5 insert 'd
-> abcdedd 1) abc__dd 2) abcdeDdd => abcDdd
Therefore for delete insert, subtract the delete from the retain of old to newData
Problem if oldRetain + Olddelete >= newRetain

retain 3 insert 'm'
retain 5 delete 1
-> abcdedd 1) abcMdedd 2) abcde_d => abcMded
Therefore for insert delete, add 1 to retain for newData

retain 3 delete 1
retain 5 delete 1
-> abcdedd 1) abc_edd 2) abcde_d => abced
Therefore for delete delete, subtract the delete from the retain of newData


oldRetain > newRetain

retain 5 insert 'm'
retain 3 insert 'd
-> abcdedd 1) abcdeMdd 2) abcDdedd => abcDdeMdd
Therefore for insert insert return newData as is 


retain 5 delete 2
retain 3 insert 'd
-> abcdedd 1) abcde__ 2) abcDdedd => abcDdd
Therefore for delete insert, return newData as is 

retain 5 insert 'm'
retain 3 delete 3
-> abcdedd 1) abcdeMdd 2) abc___d => abcMd
Problem case; So if newRetain + newDelete >= oldRetain && newRetain<oldRetain then 
skip over the insertion
reducedDelete = oldRetain-newDelete
ops:[{"retain":newRetain},{"delete":reducedDelete}]
ops:[{"retain":oldRetain},{"delete":newDelete-reducedDelete}]

retain 5 delete 3
retain 3 delete 1
-> abcdedd 1) abcde__ 2) abc_edd => abced
Therefore for delete delete, return newData as is


oldRetain == newRetain
* break by process ids ? 

retain 3 insert 'm'
retain 3 insert 'd
-> abcdedd 1) abcMdedd 2) abcDdedd => abcDMdedd if newData higher else abcMDdedd
Therefore for insert insert return newData as is 
*** break by process id


retain 3 delete 2
retain 3 insert 'd
-> abcdedd 1) abc__dd 2) abcDdedd => abcDdd
Therefore for delete insert, return newData as is 

retain 3 insert 'd'
retain 3 delete 2
-> abcdedd 1) abcDdedd 2) abc___d => abcDdd
Add 1 to newRetain then delete as many

retain 3 delete 3
retain 3 delete 1
-> abcdedd 1) abc___d 2) abc_edd => abcdedd
Therefore for delete delete, return newData as is
if newDelete < oldDelete : do nothing
if newDelete > oldDelete: newDelete = oldDelete - newDelete (only delete remaining)
if newDelete == oldDelete : do nothing since already did
*/
