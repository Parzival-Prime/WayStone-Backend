import type { WebSocket } from "ws"

export enum DataType {
    // Server -> Client Only [I think all of them are for now]
    INIT = "INIT",
    READY = "READY",
    NEW_MEMBER_EVENT = "NEW_MEMBER_EVENT",
    LATENCY_PONG = "LATENCY_PONG",
    SERVER_PROBLEM = "SERVER_PROBLEM",
    INCORRECT_SPELL_ERROR = "INCORRECT_SPELL_ERROR",
    USERNAME_CHANGE = "USERNAME_CHANGE",
    MEMBER_DISCONNECTED_EVENT = "MEMBER_DISCONNECTED_EVENT",
    MEMBER_USERNAME_CHANGE_EVENT = "MEMBER_USERNAME_CHANGE_EVENT",
    MEMBER_REMOVED_BY_SERVER_EVENT = "MEMBER_REMOVED_BY_SERVER_EVENT",
    MEMBER_LEFT_EVENT = "MEMBER_LEFT_EVENT",

    // client -> server ====> server -> client
    USER_MESSAGE = "USER_MESSAGE",
    LATENCY_PING = "LATENCY_PING",
    MEMBER_REMOVED_BY_INITIATOR_EVENT = "MEMBER_REMOVED_BY_INITIATOR_EVENT",
}

export interface GenericDataExchangeFormat {
    type: DataType, 
    roomId: string
}

export interface UserInitDataExchangeFormat extends GenericDataExchangeFormat {
    userId: string
    username: string
    allMembersData: { memberId: string, username: string }[]
    totalUsers: number
}

export interface NewMemberEventDataExchangeFormat extends GenericDataExchangeFormat {
    newMemberId: string
    newMemberUsername: string
}

export interface ChatMessageDataExchangeFormat extends GenericDataExchangeFormat {
    message: string
    roomId: string
    userId: string
    username: string
}

export interface LatencyPingDataExchangeFormat extends GenericDataExchangeFormat {
    userId: string
    timestamp: number
}

export interface MemberDisconnectionDataExchangeFormat extends GenericDataExchangeFormat {
    userId: string
    message: string
}



export const ROOM_CAPACITY = 20

export enum SocketState {
  CONNECTING,
  READY,
  ACTIVE,
  CLOSED
}


export interface ClientSocket extends WebSocket {
    state: SocketState
    userId: string;
    roomId: string;
    isAlive: boolean;
    username: string
}

// export class Client {
//     constructor(
//         public cws: ClientSocket,
//         public username: string
//     ) {
//         this.cws.isAlive = true
//         this.cws.username = username
//     }
// }