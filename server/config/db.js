const config = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'aaa050128',
  database: 'typhoon-project',
  max: 40, // 连接池最大连接数
  idleTimeoutMillis: 3000, // 连接空闲超时 3 秒
}

module.exports = config
