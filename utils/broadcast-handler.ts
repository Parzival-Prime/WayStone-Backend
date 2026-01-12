import { WebSocket } from "ws"
import { ChatMessageDataExchangeFormat, ClientSocket, DataType, LatencyPingDataExchangeFormat, LatencyPongDataExchangeFormat, MemberDisconnectionDataExchangeFormat, NewMemberEventDataExchangeFormat, UserInitDataExchangeFormat } from "../constants/data-type"
import { uncSpells } from "../constants/spells"
import { elementalCallRegex, executeSpellRegex } from "../constants/regex"
import { logger } from "../server"
import { RoomHandler } from "./room-handler"




export class BroadcastHandler {
    private roomHandler = new RoomHandler() // global object {rooms<string, Room>}

    public giveRoomIdThroughHTTPRequest() {
        return this.roomHandler.giveRoom()
    }

    public init(cws: ClientSocket, roomId: string) {
        try {
            const id = crypto.randomUUID()
            cws.userId = id
            cws.isAlive = true
            const userData = this.roomHandler.assignRoomThroughRoomId(id, roomId, cws)
            if (!userData) {
                throw new Error("Assign data to new User properly, failed! ")
            }

            // send New Member all other already active clients or members
            if (!userData.username) {
                throw new Error("Username not assigned to new User properly!")
            }
            const newMemberDataObject: UserInitDataExchangeFormat = {
                type: DataType.INIT,
                roomId: roomId,
                userId: id,
                username: userData.username,
                allMembersData: userData.allMembersData,
                totalUsers: userData.totalUsers
            }

            const memberDataObject: NewMemberEventDataExchangeFormat = {
                type: DataType.NEW_MEMBER_EVENT,
                roomId: roomId,
                newMemberId: id,
                newMemberUsername: userData.username
            }

            const newMemberData = JSON.stringify(newMemberDataObject)
            const memberData = JSON.stringify(memberDataObject)

            this.memberEventBroadcast(roomId, id, userData.totalUsers, newMemberData, memberData)
        } catch (error) {
            logger.error(error)
        }
    }

    public incomingMessage(binaryData: Buffer) {
        const data = JSON.parse(binaryData.toString()) // Incoming user data parsed

        switch (data.type) {
            case DataType.USER_MESSAGE:
                this.handleUserMessage(data)
                break

            case DataType.LATENCY_PING:
                this.handleLatencyPing(data)
                break

            case DataType.MEMBER_REMOVED_BY_INITIATOR_EVENT:
                this.handleLatencyPing(data)
                break

            default:
                break;
        }
    }

    private handleUserMessage(data: ChatMessageDataExchangeFormat) {
        // logger.info(data)
        if (!data.message.startsWith("::")) {
            // logger.info("Received chat data: " 
            //     + JSON.stringify(data)   
            // )
            const readyMessageObject: ChatMessageDataExchangeFormat = { 
                type: DataType.USER_MESSAGE, 
                roomId: data.roomId, 
                message: data.message, 
                userId: data.userId, 
                username: data.username 
            }
            const readyMessage = JSON.stringify(readyMessageObject)
            // logger.info("Broadcasting USER MESSAGE: " + readyMessage)
            this.broadcastMessage(readyMessage, data.roomId) // returning ready data
        } else {

            // The user tried a spell.
            // logger.info(`${(this.roomHandler.rooms.get(data.Id))?.username} trying spell: ${data.message}`)
            const isFormatCorrect = this.checkSpellFormat(data.message)
            if (isFormatCorrect) {
                logger.info('Spell format is correct ✅')
                // check spell is correct | spell type | pass to the spellExecuter
                if (uncSpells.includes(data.message.split(':')[2])) {
                    logger.info('Spell is Valid ✅. It is a username change spell.')
                    this.executeUsernameChangeSpell(data.roomId, data.userId)
                }
                // else if (myCheatCodeUsernames.includes(data.message.split(':')[2])){
                //     this.executeUsernameChangeSpell(data.id)
                // }
                else {
                    logger.error('Spell is Invalid ❌')
                    const errorMessage = JSON.stringify({ type: DataType.INCORRECT_SPELL_ERROR, message: data.message })
                    this.roomHandler.rooms.get(data.roomId)?.users.get(data.userId)?.send(errorMessage)
                }
            }
            logger.error('Spell format is incorrect! ❌')
        }
    }

    public broadcastMessage(data: string, roomId: string) {
        // logger.warn("RoomId in broadcastMessage: " + roomId) 
        const room = this.roomHandler.rooms.get(roomId)
        if(!room){
            // this.roomHandler.logAllRooms()
            throw new Error("Rooms not found!")
        }
        for (const cws of room?.users.values()) {
            if (cws.readyState === WebSocket.OPEN) {
                cws.send(data)
            }
        }
    }

    public memberEventBroadcast(roomId: string, newUserId: string, totalUsers: number, eventExecuterData: string, membersData: string) {
        if (totalUsers > 1) {
            logger.warn("Total Users more than 1 in member event broadcast!")
            const roomMembers = this.roomHandler.rooms.get(roomId)?.users
            if (roomMembers)
                for (const cws of roomMembers.values()) {
                    if (cws.readyState === WebSocket.OPEN && cws.userId !== newUserId) {
                        cws.send(membersData)
                    } else {
                        cws.send(eventExecuterData)
                    }
                }
        } else {
            const newUser = this.roomHandler.rooms.get(roomId)?.users.get(newUserId)
            if(!newUser){
                logger.error("New User not found in member event broadcast!")
            }
            logger.warn("The data sending to newUser: " + eventExecuterData)
            newUser?.send(eventExecuterData)
        }

    }

    public handleLatencyPing(data: LatencyPingDataExchangeFormat) { 
        if (!data.timestamp || typeof data.timestamp !== "number") {
            logger.warn("Invalid latency ping")
            return
        }

        const room = this.roomHandler.rooms.get(data.roomId)
        if (!room) return

        const cws = room.users.get(data.userId)
        if (!cws) return
        const newData: LatencyPongDataExchangeFormat = {
            type: DataType.LATENCY_PONG,
            roomId: data.roomId,
            userId: data.userId,
            timestamp: data.timestamp
        }
        cws.send(JSON.stringify(newData))
    }

    public sendPing() {
        for (const room of this.roomHandler.rooms.values()) {
            for (const cws of room.users.values()) {

                if (cws.isAlive === false) {
                    logger.error('Terminating client!')
                    cws.terminate(); // better than close for dead sockets
                    continue;
                }

                cws.isAlive = false;
                cws.ping();
                logger.info("PING →" + cws.userId + " alive:" + cws.isAlive);
            }
        }
    }

    public checkSpellFormat(spell: string) {
        const stg1 = spell.split(':')
        if (stg1.length === 5) {
            console.log("Check 1 ✅")
            const stg2 = executeSpellRegex.test(stg1[4])
            if (stg2) {
                console.log("Check 2 ✅")
                const stg3 = elementalCallRegex.test(stg1[3])
                if (stg3) {
                    console.log("Check 3 ✅")
                    return true
                } else {
                    console.log("Check 3 ❌")
                    return false
                }
            } else {
                console.log("Check 2 ❌")
                return false
            }
        } else {
            console.log("Check 1 ❌")
            return false
        }
    }

    public executeUsernameChangeSpell(roomId: string, userId: string) {
        const currentUsername = this.roomHandler.rooms.get(roomId)?.users.get(userId)?.username
        if (!currentUsername) {
            throw new Error("Username not found while executing username change spell!")
        }
        const newUsername = this.roomHandler.giveUsername(currentUsername)
        logger.info('New Username: ' + newUsername)
        // const spellExecuterData = JSON.stringify({ type: DataType.USERNAME_CHANGE, newUsername })
        // const membersData = JSON.stringify({ type: DataType.MEMBER_USERNAME_CHANGE_EVENT, newUsername, Id: id })
        // this.memberEventBroadcast(id, spellExecuterData, membersData)
    }

    public cleanUpOnDisconnect(cws: ClientSocket, code: number, reason: string) {
        try {
            if(code === 1006) return
            logger.warn("Inside on cleanup disconnect! | code: " + code)
            cws.isAlive = false
            const username = cws.username
            const userId = cws.userId
            const room = this.roomHandler.rooms.get(cws.roomId)
            if (!room) {
                throw new Error("Room not found, when cleaning up after user disconnection!")
            }
            room.users.delete(cws.userId)
            room.totalUsersInRoom -= 1
            if (room.totalUsersInRoom === 0 && this.roomHandler.rooms.size > 1) {
                this.roomHandler.rooms.delete(room.id)
            } else {
                let message: string
                switch (code) {
                    case 1000: message = `${username} left!`; break
                    case 1001: message = `${username} disconnected!`; break
                    case 1002: message = `${username} disconnected - Page Reload!`; break
                    case 4001: message = `${username} removed by Initiator!`; break
                    case 4002: message = `${username} removed by Server God!`; break
                    default: message = `${username} disconnected!`
                }

                const disconnectionMessageObject: MemberDisconnectionDataExchangeFormat = {
                    type: DataType.MEMBER_DISCONNECTED_EVENT,
                    roomId: room.id,
                    message,
                    userId: userId
                }
                const disconnectionMessage = JSON.stringify(disconnectionMessageObject)

                logger.info(`${username} disconnected! | Total-clients: ${room.totalUsersInRoom}`)
                this.broadcastMessage(disconnectionMessage, room.id)
            }

            if (room.totalUsersInRoom === 0) {
                logger.info("Session Ended")
            }
        } catch (error) {
            logger.error(error)
        }
    }

}