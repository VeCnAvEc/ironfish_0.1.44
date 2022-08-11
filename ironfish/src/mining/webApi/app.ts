import { Config } from "../../fileStores"
import { MiningPool } from '../pool';
import { RpcSocketClient } from '../../rpc/clients'
import { FileUtils } from '../../utils/file'
import { FIND_PUBLICK_ADDRESS, StratumServer } from "../stratum/stratumServer"
import { Meter } from "../../metrics";
import {  oreToIron } from "../../utils";
import fs from 'fs'

const cors = require('cors')
const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser');

const corsOptions = {
    origin: 'http://192.168.1.147:8442',
    optionsSuccessStatus: 200 // For legacy browser support
}

app.use(cors(corsOptions))
app.use(cors({ origin: "http://192.168.1.147:8442", credentials: true }));

app.use(express.urlencoded({extended: true}))
// app.use(express.static(path.join('/var/www/frontend/iron-pool/dist')))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = Number(process.env.PORT) || 8442;
const host = '192.168.1.147';

const mainStateJSON = '/home/iron/Рабочий стол/ironfish_0.1.40/ironfish/ironfish/src/mining/webApi/mainState.json'
const transactionJSON = '/home/iron/Рабочий стол/ironfish_0.1.40/ironfish/ironfish/src/mining/webApi/transaction.json'

export default class webApi {
    currentRequetId: number

    readonly pool: MiningPool
    readonly config: Config
    readonly rpc: RpcSocketClient
    readonly StratumServer: StratumServer
    readonly hashRate: Meter

    readonly host?: string
    readonly port?: number

    userInfo: any
    hash: any
    blockInfo: any = []
    avarageHashRateFifteenMinutes: Array<{hash: number, timestamp: {}}>
    avarageHashRateDay: Array<{hash: number, timestamp: string}>

    constructor(options: {
        pool: MiningPool,
        config: Config,
        rpc: RpcSocketClient,
        StratumServer: StratumServer,
        hashRate: Meter,
        currentRequetId: number
    }) {
        this.rpc = options.pool.rpc;
        this.config = options.config;
        this.pool = options.pool;
        this.StratumServer = options.StratumServer;
        this.hashRate = options.hashRate
        this.currentRequetId = options.currentRequetId
        this.avarageHashRateFifteenMinutes = []
        this.avarageHashRateDay = []
    }
    
    async headerState() {
      const currnetMiners = () => {
         return this.StratumServer.getNumberOfUsers()
      }
      
      let fullPay = 0
      let hash = await this.pool.estimateHashRate();
      let luck = await this.pool.lucky() == 15000 ? 0 : await this.pool.lucky();
      let getTheTotalPayoutOfThePool = await this.pool.getTheTotalPayoutOfThePool()            

      let collectingGeneralPayments = () => {
          getTheTotalPayoutOfThePool.forEach((amount) => {
              fullPay = fullPay + amount.amount 
          }) 
      }

      collectingGeneralPayments()

      // Get all the blocks found
      const transactionBlock = await this.pool.getTransaction()
      this.blockInfo = []

      transactionBlock.forEach((block) => {
          this.blockInfo.push(block)
      })

      let json = JSON.stringify({
              counterHashRate: `${FileUtils.formatHashRate(hash)}/s`,
              poolMiners: currnetMiners(),
              luck: parseFloat(String(luck.toFixed(4))),
              blocks: this.blockInfo,
              amountOfUsersMoney: {
                unprocessedAmount: fullPay,
                ironWithAComma: oreToIron(fullPay)
              },
      })

      fs.writeFileSync(mainStateJSON, json)
    };

    mainState() {
        app.get('/api/home', async (req: any, res: any ) => {
            try {
                const getAllBlocks = await this.pool.getAllBlock()

                const blocks = []

                getAllBlocks.forEach((block: any) => {
                    blocks.push(block)
                })

                console.log(await this.pool.totalUsers())
                const mainJSON = fs.readFileSync(mainStateJSON).toString()
                const parseJSON = JSON.parse(mainJSON)
    
                return res.send(parseJSON)
            } catch (e){ 
                res.status(500).send("Fail")
            }
            
        })  
    }

    statePool() {
        app.get('/api/statePool', async (req: any, res: any ) => {
            try {
                let allRate = []

                let gethashRateFifteenMinutes = await this.pool.gethashRateFifteenMinutes()
                
                allRate.push(gethashRateFifteenMinutes)
    
                let json = JSON.stringify({
                    hashRate: allRate
                })

                return res.send(json)
            } catch (e) {
                res.status(500).send("Fail")
            }

        })
    }

    findUser() {
        const urlencodedParser = express.urlencoded({extended: false});

        app.post("/api/finduser", urlencodedParser, async (req: any, res: any) => {
            if(!req.body) return res.sendStatus(400);
            
            try {
                const publicAddress = req.body.publickey

                let amountOfUsersMoney = await this.pool.getAmountUser(publicAddress)   
                let userRateEightHours = await this.pool.getUserHashRateGraphics(publicAddress) 
                let findUser = await this.pool.findUserByPublicAddress(publicAddress)
                let awardsPaid = await this.pool.getTheUserPayout(publicAddress)
                let averageUserEarnings: number | string;

                this.hash = await this.StratumServer.valuesClients(FIND_PUBLICK_ADDRESS, publicAddress)

                averageUserEarnings = 86400 * 20 * Number(FileUtils.formatHashRateWithoutSuffix(this.hash)) * 1000000 / 22883417649311;
                    
                String(averageUserEarnings).split('').forEach((val: any, index: number, arr: any) => {
                    if (val === '.') {
                        const segment1 = arr.slice(0, index).join("")
                        const segment2 = arr.slice(index, index + 8).join("")
                        
                        averageUserEarnings = `${segment1}${segment2}`
                    }
                })

                const errorNotFoundUser = {
                    status: 200,
                    errorMessage: 'successfully!' 
                }
    
                if ( findUser[0]?.publicAddress === publicAddress ) {
                    this.userInfo = findUser[0]
                    errorNotFoundUser.status = 200
                } else if (findUser[0]?.publicAddress !== publicAddress) {
                    errorNotFoundUser.status = 404
                    errorNotFoundUser.errorMessage = 'Not Found User'
                }

                if ( errorNotFoundUser.status === 404 ) { 
                    let errorJson = JSON.stringify({
                        errorMessage: errorNotFoundUser.errorMessage
                    })
                    
                return res.send(errorJson)
                } else if(errorNotFoundUser.status === 200){
                    let json = JSON.stringify({
                        publicAddress: this.userInfo?.publicAddress ? this.userInfo.publicAddress : 'default',
                        timestamp: this.userInfo?.timestamp,
                        amountOfUsersMoney: {
                            ironWithAComma: oreToIron(amountOfUsersMoney[0]?.amount),
                            unprocessedAmount: amountOfUsersMoney[0]?.amount
                        },
                        online: this.userInfo?.online < 1 ? this.userInfo?.lastMining: 'online',
                        hashRate: FileUtils.formatHashRate(this.hash ? this.hash : 0),
                        userRateEightHours: {
                            rawUserRateEightHours: userRateEightHours,
                        },
                        awardsPaid: awardsPaid,
                        averageUserEarnings: averageUserEarnings
                    })

                    console.log({
                        publicAddress,
                        online: this.userInfo?.online < 1 ? this.userInfo?.lastMining: 'online'
                    });
                    return res.send(json)
                }
            } catch (e) {
                res.status(500).send("Fail")
            }

        });
    }

    async readJsonWirhAllUsers() {
        let transaction = fs.readFileSync(transactionJSON).toString()

        const convertUsersInJSON = JSON.parse(transaction)
        convertUsersInJSON.forEach((block: any) => {
            this.pool.setAllUsers(block)
        })
    }

    async automaticStatisticsUpdate () {
        setInterval(async() => {
            await this.headerState();
        }, 40000)
    }

    listen() {
        app.listen(port, host, () => {
        	console.log(`Listening to requests on http://${host}:${port}`);
        });
    }

    start() {
        this.listen();
        this.statePool();
        this.findUser();
        this.mainState();
        this.automaticStatisticsUpdate();
    }
}
