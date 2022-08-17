import { Config } from "../../../fileStores"
import { Logger } from "../../../logger"
import { FileUtils } from "../../../utils"
import { MiningPool } from "../../pool"
import { Share } from "../share"

export const FIND_PUBLICK_ADDRESS = 'FIND_PUBLICK_ADDRESS'
export const HASHRATE_EVERYONE_USER = 'HASHRATE_EVERYONE_USER'

export class Stratum {
  
    clients: Map<number, StratumServerClient>

    constructor(options: {
        pool: MiningPool
        config: Config
        logger: Logger
    }) {
       this.clients = new Map()
    }

    async helperQueries(): Promise<Share> {
        const shares = await Share.init({
            rpc: this.rpc,
            config: this.config,
            logger: this.logger,
        })

        return shares
    }

    getHashRateForGraphics() {
        setInterval(async () => {      
          let hashRateEightHours =  {
            hashRate: {
              rawHashrate: await (await this.helperQueries()).estimateHashRate(),
              processedHashrate: FileUtils.formatHashRate(await (await this.helperQueries()).estimateHashRate())
            },
            data: new Date().getTime()
          }
          
          await (await this.helperQueries()).removeOldRecordingsGlobalStatistics()
          await (await this.helperQueries()).removeOldRecordings()
    
          await (await this.helperQueries()).hashRateForGraphics(hashRateEightHours)
        }, 1800000)
      }
    
      // We get the hashrate of each user
    
      getUserHashRateForGraphics() {
        setInterval(async () => {
          let user = await this.valuesClients(HASHRATE_EVERYONE_USER)      
    
          await (await this.helperQueries()).userHashForGraphics(user)
        }, 1800000)
      }
    
      // Adding new users if there are any
      
      addNewUsers() {
        setInterval(() => {
          this.getNewUsers()
        }, 5000)
      }
    
      // FIND_PUBLICK_ADDRESS = we get the hashrate of a certain user counting his shares
      // HASHRATE_EVERYONE_USER = we are looking for all the keys and filtering the repeating ones
    
      async valuesClients(search: string, publicAddress?: string) {
        let users = this.clients.values()
    
        switch (search) {
          case 'FIND_PUBLICK_ADDRESS':
            for (let user of users) {
              if ( publicAddress === user.publicAddress ) {
                const hashRate = await this.userHashRate(publicAddress)
                return hashRate
              } else {
                  continue
                }
              }
              break;
    
          case 'HASHRATE_EVERYONE_USER':
            let user: any = []
            let userDate: Array<{publicAddress: string}> = []
            let allKey: any = []
            let notRepeat: Array<any> = []
    
            for( let user of users ) {
              let publicAddress: string = user.publicAddress || ''
      
              userDate.push({publicAddress})   
              allKey.push(publicAddress)
            }
            
            const address = allKey.filter((item: any, position: any, array: any) => {
              return array.lastIndexOf(item) === position;
            });
    
            for ( let i = 0; i < address.length; i++) {
              notRepeat.push(address)
            }
    
            for (let key = 0; key < notRepeat.length; key++) {
              let rawHashRateEightHours = await (await this.helperQueries()).userHashRate(notRepeat[0][key])
              let hashRateEightHours = FileUtils.formatHashRate(rawHashRateEightHours)
    
              user.push({publicAddress: notRepeat[0][key], hashRateEightHours, rawHashRateEightHours, data: new Date().getTime()})
            }
    
            return user
        }
      }
    
      async userHashRate(publicAddress: string) {
        let userHash = await (await this.helperQueries()).userHashRate(publicAddress)
        let hash = userHash
        
        return hash
      }
    
      async getNewUsers() {
        const online = true
      
          numberOfUsers = this.clients.size
          if (numberOfUsers > 0) {
            const usersClients = this.clients.values()    
    
            let timestamp = new Date().getTime()
            let userDate: Array<{publicAddress: string}> = []
            let allKey: any = []
            let user: any = []
            let notRepeat: Array<any> = []
    
            for( let user of usersClients ) {
              let publicAddress: string = user.publicAddress || ''
    
              userDate.push({publicAddress})   
              allKey.push(publicAddress)
            }
            
            const address = allKey.filter((item: any, position: any, array: any) => {
              return array.lastIndexOf(item) === position;
            });
    
            for ( let i = 0; i < address.length; i++) {
              notRepeat.push(address)
            }
    
            for (let key = 0; key < notRepeat.length; key++) {
              user.push({publicAddress: notRepeat[0][key]})
            }
    
            for( let uniqueAddress = 0; uniqueAddress < user.length; uniqueAddress++ ) {
              const address = user[uniqueAddress].publicAddress
              
              await (await this.helperQueries()).setOnlineUser(address);
              await (await this.helperQueries()).createUserFields(address, timestamp, online, timestamp)
            }

            return user
          }
        }
      
      getNumberOfUsers() {
        return this.clients.size 
      }
}