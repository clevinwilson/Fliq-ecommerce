const fs=require('fs');

const deleteFile=function(filePath){
    fs.unlink(filePath,(error)=>{
        if(error){
            throw (error)
        }
    })
}

module.exports=deleteFile;