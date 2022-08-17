import { Config } from "../../../fileStores";
import { Logger } from "../../../logger";
import { RpcSocketClient } from "../../../rpc";
import { recordThePayout, DatabaseAPI } from "../database/database";

const decimalPrecision = 1000000

export class Share { 
    readonly db: DatabaseAPI
    readonly rpc: RpcSocketClient
    readonly config: Config 
    private recentShareCutoff: number
    
    difficulty: bigint

    private constructor(options: {
        db: DatabaseAPI
        rpc: RpcSocketClient
        config: Config
        logger: Logger
    }) {
        this.db = options.db
        this.rpc = options.rpc
        this.config = options.config
        this.recentShareCutoff = this.config.get('poolRecentShareCutoff')
        this.difficulty = BigInt(this.config.get('poolDifficulty'))
    }

    static async init (options: {
        rpc: RpcSocketClient,
        config: Config,
        logger: Logger
    }) {
        const db = await DatabaseAPI.init({
            config: options.config,
            logger: options.logger,
          })
      
          return new Share({
            db,
            rpc: options.rpc,
            config: options.config,
            logger: options.logger,
        })
    }

    async start(): Promise<void> {
        await this.db.start()
    }
    
    async stop(): Promise<void> {
        await this.db.stop()
    }

    async shareRate(publicAddress?: string): Promise<number> {
      return (await this.recentShareCount(publicAddress)) / this.recentShareCutoff
    }
    
    private async recentShareCount(publicAddress?: string): Promise<number> {
      const timestamp = Math.floor(new Date().getTime() / 1000) - this.recentShareCutoff
  
      return await this.db.shareCountSince(timestamp, publicAddress)
    }

    async estimateHashRate(publicAddress?: string): Promise<number> {
      // BigInt can't contain decimals, so multiply then divide to give decimal precision
      const shareRate = await this.shareRate(publicAddress)
      const decimalPrecision = 1000000
      return (
        Number(BigInt(Math.floor(shareRate * decimalPrecision)) * this.difficulty) /
        decimalPrecision
      )
    }

    async userHashRate(publicAddress: string | null | undefined): Promise<number> {
      const userRate = await this.userRate(publicAddress)
 
      return (
       Number(BigInt(Math.floor(userRate * decimalPrecision)) * this.difficulty) / decimalPrecision 
      )
    }

    async lucky(){
      const shareRate = await this.shareRate()
      const numberOfLuck = (shareRate * Number(this.difficulty)) / decimalPrecision / 100 
  
      return numberOfLuck
     }

    async createUserFields(publicAddress: string | null, timestamp: any, online: boolean, lastMining: any){
        await this.db.createUserFields(publicAddress, timestamp, online, lastMining)
      }
    
      async setOfflineUser(publicAddress: string, time: number) {
        await this.db.setOfflineUser(publicAddress, time)
      }
    
      async setOnlineUser(publicAddress: string, ) {
        await this.db.setOnlineUser(publicAddress)
      }
    
      async userRate(publicAddress: string | null | undefined): Promise<number> {
        return (await this.userShareCount(publicAddress)) / this.recentShareCutoff
      }
    
      async informationAboutTheBlock(condition: any, time: string | number) {
        await this.db.informationAboutTheBlock(condition, time)
      }
    
      async howMuchPay(transaction: transactionReceives) {
        await this.db.howMuchWasPaid(transaction)
      }
    
      async getAmountUser(publicAddress: string) {  
       return await this.db.getAmountUser(publicAddress)
      }
    
      async setTheUserPayout(successfulTransaction: recordThePayout) {
        this.db.setTheUserPayout(successfulTransaction)
      }
    
      // async dropTable() {
      //   await this.db.dropTable()
      // }
    
      // async createTable() {
      //   await this.db.createTable()
      // }
    
      async gethashRateFifteenMinutes() {  
       return await this.db.gethashRateFifteenMinutes()
      }
    
      async getTheTotalPayoutOfThePool() {
        return await this.db.getTheTotalPayoutOfThePool()
      }
    
      async hashRateForGraphics(hashRateFifteenMinutes: any) {
        return await this.db.hashRateForGraphics(hashRateFifteenMinutes)
      }
    
      async userHashForGraphics(date: Array<any>) {
        return await this.db.userHashForGraphics(date)
      }
    
      async getUserHashRateGraphics(publicAddress: string) {
        return await this.db.getUserHashRateGraphics(publicAddress)
      }
    
      private async userShareCount(publicAddress: string | null | undefined): Promise<number> {
        const timestamp = Math.floor(new Date().getTime() / 1000) - this.recentShareCutoff
        return await this.db.shareCount(timestamp, publicAddress)
      }
    
      async setAllUsersStatusOfline() {
        await this.db.setAllUsersStatusOfline()
      }
     
      async findUserByPublicAddress(publicAddress: string) {
        return this.db.findUserByPublicAddress(publicAddress)
      }
     
      async removeOldRecordUserEightHours() {
        await this.db.removeOldRecordUserEightHours()
      }
     
      async removeOldRecordEightHours() {
       await this.db.removeOldRecordEightHours()
      }
    
      async getTransaction() {
        return await this.db.getTransaction()
      }
    
      async getTheUserPayout(publicAddress: string) {
        return await this.db.getTheUserPayout(publicAddress)
      }
    
      async totalUsers() {
        return await this.db.totalUsers()
      }
    
      async getAllUsers() {
        return await this.db.getAllUsers()
      }
    
      async getAllBlock() {
        return await this.db.getAllBlock()
      }
    
      async getPaidCoins() {
        return await this.db.getPaidCoins()
      }
    
      async getAllShares() {
        return await this.db.getAllShares()
      }
    
      async getAllPayout() {
        return await this.db.getAllPayout()
      }
      
      async setAllUsers(transaction: {block: string, height: string, timestamp: number}){
        await this.db.setAllUsers(transaction)
      }
    
      async deletePayout() {
        await this.db.deletePayout();
      }
    
      async removeOldRecordingsGlobalStatistics() {
        await this.db.removeOldRecordingsGlobalStatistics()
      }
    
      async removeOldRecordings() {
        await this.db.removeOldRecordings()
      }
     }
    
    export type transactionReceives = {
      publicAddress: string,
      amount: number
    }
    