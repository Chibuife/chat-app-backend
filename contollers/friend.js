const User = require("../model/User");

const getAllFriends = (res, req)=>{

}

const addFriends = async (res, req)=>{
    const {userId, friendId} = req.body;

    const friendInfo = await User.findOne({ id:friendId })
    const image = friendInfo.image
    const name = friendInfo.name
    const friends = {
        id,image,name,
    }
    await User.findByIdAndUpdate(
        { id: userId }, {
            $addToSet: {friends}
    }, { new: true, runValidators: true }
    )
}

const removeFriend =(res, req)=>{

}

