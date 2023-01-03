const fs=require('fs');

const deleteImages =function(filePath){
    fs.unlink(filePath,(error)=>{
        if(error){
            throw (error)
        }
    })
}

module.exports = deleteImages;