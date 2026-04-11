// Read the .env file.
import * as dotenv from 'dotenv'

// Require the framework
import Fastify from 'fastify'
import app from './src/app.js'

dotenv.config()

const server = Fastify({
  logger: true,
})

server.register(app)

const start = async () => {
  try {
    await server.listen({ port: parseInt(process.env.PORT ?? '3000') })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
