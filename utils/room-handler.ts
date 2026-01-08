import { ClientSocket, ROOM_CAPACITY } from "../constants/data-type"
import { usernameSet } from "../constants/usernames"
import { logger } from "../server"

class Room {
    public id: string = ""
    public users: Map<string, ClientSocket> = new Map()
    public totalUsersInRoom: number = 0
    constructor() {
        this.id = crypto.randomUUID()
    }
}

export class RoomHandler {
    private usernameSet: Set<string> = usernameSet
    public rooms = new Map<string, Room>()  // 
    constructor() { }

    public createNewRoom() {
        logger.info('Creating new Room...')
        const newRoom = new Room()
        this.rooms.set(newRoom.id, newRoom)
        logger.info("Room created: " + newRoom.id)
        logger.info("currently number of rooms: " + this.rooms.size)
        return newRoom
    }

    public giveRoom() {
        let roomAvailable = null;
        if (this.rooms.size > 0) {
            for (const room of this.rooms.values()) {
                if (room.totalUsersInRoom < ROOM_CAPACITY) {
                    logger.info("Room Available: " + room.id)            // increase user count in room
                    roomAvailable = room.id
                    break
                }
            }
        }

        if (roomAvailable !== null) {
            return roomAvailable
        } else {
            const newRoom = this.createNewRoom()
            return newRoom.id
        }
    }

    public assignRoomThroughRoomId(userId: string, roomId: string, cws: ClientSocket) {
        cws.roomId = roomId
        if (this.rooms.size === 0) {         // fix roomId in cws
            throw new Error("No rooms found in object!")
        }
        const newUsername = this.giveUsername(roomId)  // get new username
        if (newUsername)
            cws.username = newUsername
        const room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room not found when trying assign to new user!")
        }
        room.users.set(userId, cws)
        room.totalUsersInRoom += 1                      // increase user count in room
        const allMembersData = this.getAllMembersData(room.id)
        const newUserdata = { username: newUsername, totalUsers: room.totalUsersInRoom, allMembersData: allMembersData }
        return newUserdata
    }

    public giveUsername(roomId: string, username?: string | null) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) throw new Error("Room not found in giveUsername!");

            // usernames already used in room
            const used = new Set(
                [...room.users.values()].map(u => u.username)
            );

            // available usernames for this room
            const available = [...this.usernameSet].filter(
                u => !used.has(u)
            );

            if (available.length === 0) {
                throw new Error("No usernames left for this room");
            }

            // random assignment
            const username = available[Math.floor(Math.random() * available.length)]
            logger.warn("Username selected: " + username)
            return username
        } catch (error) {
            logger.error(error)
        }
    }

    public getAllMembersData(roomId: string) {
        logger.warn("Logging rooms before collecting all members")
        this.logAllRooms()
        const allMembersData: { memberId: string, username: string }[] = []
        const cwssInRoom = this.rooms.get(roomId)?.users.values()
        if (cwssInRoom) {
            for (const cws of cwssInRoom) {
                allMembersData.push({ memberId: cws.userId, username: cws.username })
            }
        }
        logger.warn("Users found in room: " + JSON.stringify(allMembersData))
        return allMembersData
    }

    public logAllRooms(){
        logger.warn("Logging rooms:")
        for(const room of this.rooms.values()){
            logger.warn("\tRoomID: " + (room.id).substring(8) + " | TotalUsers: " + room.totalUsersInRoom)
            for(const user of room.users.values()){
                logger.warn("\t\tUsername: " + user.username)
            }
        }
    }
}