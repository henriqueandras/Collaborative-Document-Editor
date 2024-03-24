class OperationalTransform{
    constructor(str){
        this.str = str;
    }
    
    apply(operation){
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


    getAction(data){
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

    transformLessThan(old, newData){
        const oldAction = this.getAction(old);
        const newDataAction = this.getAction(newData);
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
    

    transformGreaterThan(old, newData){
        const oldAction = this.getAction(old);
        const newDataAction = this.getAction(newData);
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


    transformEqual(old, newData){
        const oldAction = this.getAction(old);
        const newDataAction = this.getAction(newData);
        if(oldAction === "insert" && newDataAction === "insert"){
            // break by process ids
            // "gibbVBerish"
            // "gibbBVerish"
            //  012345678
        }
        else if(oldAction === "insert" && newDataAction === "delete"){
            newData.ops[0].retain++;
            return [[newData], newData];
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
    
    transformOperations(old, newData){
        if(old === "BEG"){
            return [[newData], newData];
        }
        // console.log(old, newData);
        const oldRetain = old.ops[0].retain;
        const newRetain = newData.ops[0].retain;

        if(oldRetain<newRetain){
            return this.transformLessThan(old, newData);
        }else if(oldRetain>newRetain){
            return this.transformGreaterThan(old, newData);
        }else{
            return this.transformEqual(old, newData);
        }
    }

    handleTransforms(old, newData){
        if(old === "BEG"){
            return [[newData], newData];
        }
        const ops = [];
        for(const o of old){
            const trans = this.transformOperations(o, newData);
            if(trans[0] == []){
                return [];
            }else{
                ops.push(trans[0]);
            }
        }
        return this.transformOperations(old[old.length-1], newData);
    }

    ensureStructure(data){
        if("ops" in data){
            if(data.ops.length === 2){
                return data;
            }else{
                if("delete" in data.ops[0]){
                    return {ops:[{retain:0},data.ops[0]]}
                }
            }
        }else{
            return {ops:[{retain:0},{insert:''}]};
        }
    }
}
/*
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

export default OperationalTransform;