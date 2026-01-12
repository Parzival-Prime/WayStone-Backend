import express from "express"
import type { Request, Response } from "express";
import { createServer } from "http"
import { pino } from "pino";
import { WebSocketServer } from "ws"
import { ClientSocket, DataType, SocketState } from "./constants/data-type";
import { BroadcastHandler } from "./utils/broadcast-handler";
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

// Http server creation
const app = express()
// const whiteListedUrls = process.env.ALLOWED_ORIGINS_LIST
//     ? process.env.ALLOWED_ORIGINS_LIST.split(',').map(origin => origin.trim())
//     : [];

// function originChecker(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
//     // Allow requests with no origin (e.g., curl, Postman, server-side calls)
//     if (!origin) return callback(null, true);

//     if (whiteListedUrls.includes(origin)) {
//         callback(null, true);
//     } else {
//         callback(new Error('Not allowed by CORS'));
//     }
// }

app.use(cors({
    origin: process.env.ALLOW_ORIGINS,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type']
}));

app.use(express.json({ limit: "100mb" }))

const server = createServer(app)
export const logger = pino()
// Web socket server creation
const socketServer = new WebSocketServer({ noServer: true })
// Broadcaster instance creation
const broadcaster = new BroadcastHandler()



////===================================================================================////
//// <<<<< Read EventTarget Class Page of WebSockets Documentation on MDN Docs >>>>>>> ////
////===================================================================================////


// root level room --- implemented
// username assigning --- implemented
// broadcasting class --- implemented
// heartBeat Mechanism --- implemented
// username change --- partially implemented

// Cheat code feature is not ready yet. 
//   --- There is only one regex for format checking. What we can do is check if last part contains
//       parantheses,if not then randomly select new username, If yes then use current regex.
//  
//   --- Only two formats are enough for now.
//   --- In future we can implement spell formation feature, where user can try different combinations 
//       of spell, elemental and execution method.

// Error Handling -- there is none right now
// Logging Mechanism -- not implemented
// Max Data size flow control Mechanism -- not implemented
// Max clients connected limit  -- not implement
// Back Pressure Handling -- not implemented
// Logical Rooms -- not implemented 



// Verified Chatrooms -- not implement [long later in future]



// protocol upgrade handshake handler
server.on("upgrade", (request: Request, socket, head) => {
    const { pathname } = new URL(request.url, "ws://base.url")
    socketServer.handleUpgrade(request, socket, head, (ws) => {
        socketServer.emit('connection', ws, request)
    })
})


// setInterval(() => {
//     broadcaster.sendPing()
// }, 31000)

// Connection Establishment and Communication
socketServer.on("connection", (cws: ClientSocket, req: Request) => {
    cws.state = SocketState.CONNECTING;
    cws.isAlive = true;
    try {
        const params = new URLSearchParams(req.url?.split("?")[1])
        const roomId = params.get("roomId")
        if (!roomId) {
            throw new Error("Room ID not found in url!")
        }
        broadcaster.init(cws, roomId)
        cws.state = SocketState.READY;
    } catch (err) {
        logger.error(err, "Init failed")
        cws.close(1011, "Server error")
    }

    cws.on('message', (message: Buffer, isBinary: boolean) => {
        broadcaster.incomingMessage(message)
    })

    cws.on('pong', () => {
        logger.info("PONG received! | " + cws.userId)
        cws.isAlive = true
    })

    cws.on('close', (code, reason) => {
        broadcaster.cleanUpOnDisconnect(cws, code, reason.toString())
    })

    cws.on('error', (error) => logger.error(`${error.name} - ${error.message}`))
})



// http server health check
app.get("/health", (req, res) => {
    res.send("Server has no health issue. ✔")
})

app.get("/allocate-room", (req, res) => {
    const roomId = broadcaster.giveRoomIdThroughHTTPRequest()
    return res.json({ success: true, roomId: roomId })
})

server.listen(8080, () => {
    console.log("Server listening on port 8080 🚀")
})