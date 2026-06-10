import dbConfig from '../config/db.js'
import pg from 'pg'
import R from '../R.js'

const { Pool } = pg
const pool = new Pool(dbConfig)

let typhoon = {
  // 获取台风列表
  getTyphoonList: function (req, res) {
    const { year } = req.query
    let SQL = `select * from typhoon_list where 1 = 1`
    if (year) SQL += ` and year = ${year}`
    pool.connect((isErr, client, done) => {
      client.query(SQL, function (isErr, result) {
        done()
        if (isErr) {
          res.json(new R().err(isErr))
        } else {
          const data = result.rows
          res.json(new R().ok(data))
        }
      })
    })
  },
  // 根据台风编号获取轨迹点
  getTyphoonTrack: function (req, res) {
    const { tfbh } = req.params
    const SQL = `select * from typhoon_live_info where tfbh = '${tfbh}' order by pass_time asc`
    pool.connect((isErr, client, done) => {
      client.query(SQL, function (isErr, result) {
        done()
        if (isErr) {
          res.json(new R().err(isErr))
        } else {
          res.json(new R().ok(result.rows))
        }
      })
    })
  },
}

export default typhoon
