module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'browsing-topics=()'
          }
        ]
      }
    ]
  }
}
