class R {
  constructor() {
    this.code = '200'
    this.msg = 'success'
    this.data = {}
    return this
  }

  ok(data) {
    this.code = 200
    this.msg = 'success'
    this.data = data
    return this
  }

  err(msg = '') {
    this.code = 500
    this.msg = msg || 'error'
    this.data = null
    return this
  }
}

module.exports = R
