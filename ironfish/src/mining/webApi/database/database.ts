import { Database, open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { NodeFileProvider } from '../../../fileSystems/nodeFileSystem'
import { Config } from '../../../fileStores/config'
import { Logger } from '../../../logger'
import { transactionReceives } from '../../poolShares'
import { Migrator } from '../../poolDatabase/migrator'

export class DatabaseAPI {
    private readonly db: Database
    private readonly migrations: Migrator

    constructor (options: {db: Database, logger: Logger, config: Config}) {
        this.db = options.db
        this.migrations = new Migrator({ db: options.db, logger: options.logger })   
    }

    static async init(options: { config: Config; logger: Logger }) {
        const fs = new NodeFileProvider()
        await fs.init()
    
        const poolFolder = fs.join(options.config.dataDir, '/pool')
        await fs.mkdir(poolFolder, { recursive: true })
    
        const db = await open({
          filename: fs.join(poolFolder, '/database.sqlite'),
          driver: sqlite3.Database,
        })
    
        return new DatabaseAPI({
          db,
          logger: options.logger,
          config: options.config,
        })
      }

      async start(): Promise<void> {
        await this.migrations.migrate()
      }
    
      async stop(): Promise<void> {
        await this.db.close()
      }

      async shareCountSince(timestamp: number, publicAddress?: string): Promise<number> {
        let sql = "SELECT COUNT(id) AS count FROM share WHERE createdAt > datetime(?, 'unixepoch')"
    
        if (publicAddress) {
          sql += ' AND publicAddress = ?'
        }
    
        const result = await this.db.get<{ count: number }>(sql, timestamp, publicAddress)
        if (result === undefined) {
          return 0
        }
    
        return result.count
      }

      async createUserFields(publicAddress: string | null, timestamp: any, online: boolean, lastMining: any): Promise<void> {
        let isAdd = true
        const existingUser = await this.db.all('SELECT publicAddress FROM farmer')
    
        for(let address in existingUser) {
          if (existingUser[address].publicAddress === publicAddress) {
            isAdd = false
            return
          }
        }
    
        if (isAdd) {
          this.db.run(`INSERT INTO farmer (publicAddress, timestamp, online, lastMining) VALUES(?,?,?,?)`,
                       [publicAddress, timestamp, online, lastMining])
        }
       }
    
      async setOfflineUser(publicAddress: string, time: number) {
        this.db.run(`UPDATE farmer SET online = 0, lastMining = ? WHERE publicAddress = ?`,[time, publicAddress])
      }
    
      async setOnlineUser(publicAddress: string) {
        this.db.run(`UPDATE farmer SET online = 1 WHERE publicAddress = ?`, publicAddress)
      }
    
      async informationAboutTheBlock(condition: any, time: string | number) {
        this.db.run(`INSERT INTO transactions (block, height, timestamp) VALUES(?,?,?)`, [condition.hashedHeader, condition.height, time])
      }
    
      async shareCount(timestamp: number, publicAddress: string | null | undefined): Promise<number> {
        const result = await this.db.get<{ count: number }>(
          "SELECT COUNT(id) AS count FROM share WHERE publicAddress = ? AND createdAt > datetime(?, 'unixepoch')",
          publicAddress,
          timestamp,
        )
    
        if (result == null) {
          return 0
        }
        return result.count
      }
    
      // Adding the amount paid to the user's balance
      async howMuchWasPaid( transaction: transactionReceives ) {
        await this.db.run(`UPDATE farmer SET amount = amount + ? WHERE publicAddress = ?`, [transaction.amount, transaction.publicAddress])
      }
    
      // How much was paid to each user
      async getAmountUser(publicAddress: string) {
        return this.db.all('SELECT amount FROM farmer WHERE publicAddress = ?', [publicAddress])
      }
    
      // The amount that was paid to the entire pool
      async getTheTotalPayoutOfThePool(){
        return this.db.all(`SELECT amount FROM farmer`)
      }
    
      // We get the hashrate of the pool in 15 minutes
      async gethashRateFifteenMinutes() {
        return await this.db.all(`SELECT * FROM eightHours`)
      }
    
      // We record the hashrate every 15 minutes
      async hashRateForGraphics(hashRateFifteenMinutes: any) {
        await this.db.run(`INSERT INTO eightHours (hashCount,rawHashCount, timestamp) VALUES(?,?,?)`, hashRateFifteenMinutes.hashRate.processedHashrate, hashRateFifteenMinutes.hashRate.rawHashrate, hashRateFifteenMinutes.data)
      }
    
      // We record the hashrate of each user in 15 minutes
      async userHashForGraphics(date: Array<any>) {
        for(let i = 0; i < date.length; i++) {       
         await this.db.run(`INSERT INTO userEightHours (publicAddress, hashCount,rawHashCount, timestamp) VALUES(?,?,?,?)`, [date[i].publicAddress, date[i].hashRateEightHours,date[i].rawHashRateEightHours, date[i].data])
        }
      }
    
      // We get the hashrate of a specific user
      async getUserHashRateGraphics(publicAddress: string) {
        return await this.db.all(`SELECT * FROM userEightHours WHERE publicAddress = ?`, [publicAddress])
      }
    
      async removeOldRecordUserEightHours() {
        await this.db.run(`DELETE FROM userEightHours`)
      }
    
      async removeOldRecordEightHours() {  
        await this.db.run(`DELETE FROM eightHours`)
      }
    
      async setAllUsersStatusOfline() {
        const sql = `UPDATE farmer SET online = 0`
        await this.db.run(sql)
      }
    
      async findUserByPublicAddress (publicAddress: string) {
       const sql = 'SELECT * FROM farmer WHERE publicAddress = ?'
       return await this.db.all(sql, publicAddress)
      }
    
      async dropTable() {
        await this.db.run('DROP TABLE paidCoins;')
      }
    
      async getTransaction() {
        return await this.db.all('SELECT * FROM transactions')
      }
    
      async setTheUserPayout(successfulTransaction: recordThePayout) {
        const sql = 'INSERT INTO paidCoins (publicAddress, amount, timestamp, createdAt, hash) VALUES (?,?,?,?,?)'
        await this.db.run(sql, [
                                successfulTransaction.publicAddress, successfulTransaction.amount,
                                successfulTransaction.timestamp, successfulTransaction.createdAt,
                                successfulTransaction.hash
                               ])
     }
    
      async getTheUserPayout(publicAddress: string): Promise<any> {
        return await this.db.all(`SELECT * FROM paidCoins WHERE publicAddress = ?`, publicAddress)
      }
    
      async totalUsers() {
        return await this.db.all(`SELECT COUNT(*) as c FROM farmer WHERE online = 1 `)
      }
    
      async getAllUsers() {
        return await this.db.all('SELECT * FROM farmer')
      }
    
      async getAllBlock() {
        return await this.db.all('SELECT * FROM transactions')
      }
    
      async getPaidCoins() {
        return await this.db.all('SELECT * FROM paidCoins')
      }
    
      async getAllShares() {
        return await this.db.all('SELECT * FROM share')
      }
    
      async getAllPayout() {
        return await this.db.all('SELECT * FROM payout')
      }
    
      // set All Block From Json File
      async setAllUsers(transaction: {block: string, height: string, timestamp: number}) {
        await this.db.run(`INSERT INTO transactions (block, height, timestamp) VALUES (?,?,?)`, 
          transaction.block,
          transaction.height,
          transaction.timestamp
        )
      }
    
      async deletePayout() {
        await this.db.run('DELETE from payout')
      }
    
      async addColumnInTable() {
        const sql = 'ALTER TABLE paidCoins ADD COLUMN hash';
        await this.db.run(sql)
      }
    
      async removeOldRecordingsGlobalStatistics() {
        const twoDayAgo = new Date().getTime() - 172800000
        await this.db.run('DELETE FROM eightHours WHERE timestamp < ?', twoDayAgo)
      }
    
      async removeOldRecordings() {
        const twoDayAgo = new Date().getTime() - 172800000
        await this.db.run('DELETE FROM userEightHours WHERE timestamp < ?', twoDayAgo)
      }
    }
    
    export type DatabaseShare = {
      id: number
      publicAddress: string
      createdAt: Date
      payoutId: number | null
    }
    
    export type recordThePayout = {
      publicAddress: string
      amount: number | string
      timestamp: number
      createdAt: string
      hash: string
    }
    