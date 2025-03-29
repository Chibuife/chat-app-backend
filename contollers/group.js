const { BadRequestError } = require("../errors");
const Group = require("../model/Group");
const User = require("../model/User");

const deleteGroup = (res, req) => {

}

const createGroup = async (req, res) => {
    const { name, members } = req.body;
    const groupIdentify = await Group.findOne({ name })
    if (groupIdentify) {
        throw new BadRequestError('Group already exists')
    }
    const newGroup = await Group.create({ name, members }, {new:true});
    members.map(async (memberId) => {
        await User.findByIdAndUpdate(memberId, {
            $addToSet: { group: { id: newGroup._id, name: newGroup.name } }
        });
    })
    console.log(newGroup[0]._id)
    res.status(200).json({ msg: newGroup[0]._id })
}

const getGroup = async (req, res)=>{
    try {
        const { id } = req.body
        const group = await Group.findOne({ _id: id })
        if (!group) {
            return res.status(404).json({ message: "group not found" });
        }
        const membersData = await Promise.all(
            group.members.map(async (memberId) => {
                const user = await User.findById(memberId, { name: 1, image: 1 });
                return user; 
            })
        );
        
        return res.status(200).json({
            name: group.name,
            id: group._id.toString(),
            members:membersData
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
const removeFriend = (res, req) => {

}

module.exports = {createGroup,getGroup};