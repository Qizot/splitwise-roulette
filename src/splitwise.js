const fetch = require("node-fetch")


const SPLITWISE_URI = "https://secure.splitwise.com/api/v3.0/get_groups"
const TOKEN = process.env.SPLITWISE_TOKEN 

async function fetchUsersDebts(token = TOKEN, groupName = "Chińczyk ") {
    try {
        const result = await fetch(SPLITWISE_URI, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        })

        
        const data = await result.json()
        
        const targetGroup = data.groups.find(group => group.name === groupName);
        
        const users = targetGroup.members.map(member => ({
            email: member.email,
            // fetch just the first balance, if there is none then leave 0 debt
            debt: member.balance[0] !== undefined ? Number(member.balance[0].amount) : 0,
        }))
        
        return users
    } catch (error) {
        console.error(error)
        
        return []
    }
}

module.exports = { fetchUsersDebts }
