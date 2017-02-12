import { exec } from 'mz/child_process'
import config from 'config'

if (config.get('env') === 'production') {
  throw new Error('Not in production please!')
}

exec(`docker-compose run postgres dropdb -h postgres -U development ${config.get('env')}`)
  .catch((err) => {
    setTimeout(() => { throw err })
  })
