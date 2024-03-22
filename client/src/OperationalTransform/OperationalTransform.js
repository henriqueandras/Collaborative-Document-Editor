class OperationalTransform{
    constructor(){}
/**delta {"ops":[{"retain":16},{"insert":"d"}]} */
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
            newData.ops[0].retain = newData.ops[0].retain - oldDelete;
        }
        else if(oldAction === "delete" && newDataAction === "delete"){
            const oldDelete = old.ops[1].delete;
            newData.ops[0].retain = newData.ops[0].retain - oldDelete;
        }
        return [newData];
    }
    
    transformGreaterThan(old, newData){
        const oldAction = this.getAction(old);
        const newDataAction = this.getAction(newData);
        if(oldAction === "insert" && newDataAction === "delete"){
            const oldRetain = old.ops[0].retain;
            const newRetain = newData.ops[0].retain;
            const newDelete = newData.ops[1].delete;
            if((newRetain + newDelete >= oldRetain) && (newRetain<oldRetain)){
                const reducedDelete = oldRetain - newDelete;
                const newDataOps = [
                    {ops:[{"retain":newData.ops[0].retain},{"delete":reducedDelete}]},
                    {ops:[{"retain":oldRetain},{"delete":newDelete-reducedDelete}]}
                ];
                return newDataOps;
            }
            return [newData];
        }
        else if((oldAction === "insert" && newDataAction === "insert")
           || (oldAction === "delete" && newDataAction === "insert")
           || (oldAction === "delete" && newDataAction === "delete")){
               return [newData];
        }
    }


    transformEqual(old, newData){
        const oldAction = this.getAction(old);
        const newDataAction = this.getAction(newData);
        if(oldAction === "insert" && newDataAction === "insert"){
            // break by process ids
        }
        else if(oldAction === "insert" && newDataAction === "delete"){
            newData.ops[0].retain++;
            return [newData];
        }
        else if(oldAction === "delete" && newDataAction === "insert"){
            return [newData];
        }
        else if(oldAction === "delete" && newDataAction === "delete"){
            const newDelete = newData.ops[1].delete;
            const oldDelete = old.ops[1].delete;
            if(newDelete > oldDelete){
                newData.ops[1].delete = oldDelete - newDelete;
                return [newData];
            }else{
                return [];
            }
        }
    }

    handleTransforms(old, newData){
        if(old === "BEG"){
            return [newData];
        }
        console.log(old, newData);
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